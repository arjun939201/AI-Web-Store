import json
import logging
import os

import httpx
from .base import AIProvider
from ..schemas import AppSpec

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Return ONLY a valid JSON object with exactly these top-level keys:
name, description, category, features, pages, icon, runtime.
Do not return markdown. Do not generate executable code, HTML, CSS, JavaScript, Python, URLs, file paths, or asset names.
Keep the application practical, concise, and internally consistent.
features and pages must be arrays of short strings.
icon must be a single emoji or short display symbol.
runtime must have: app_type, pages.
app_type must be one of: general, productivity, finance, education, game, navigation, health, business, social, portfolio, utility.
runtime.pages must be an array of page objects. Each page has name and components.
Each component must use only one of these types: heading, text, button, input, textarea, select, checkbox, stat, list, table, card, chart, game_board.
A component may include label, text, placeholder, data_key, action, and options. Keep component arrays small (maximum 10 per page).
Use safe action names such as add_item, delete_item, toggle_item, start_game, pause_game, reset_game, save, search, or navigate.
For game apps, use game_board plus score/start/pause/reset controls.
For data apps, prefer stat, form inputs, list/table, and buttons.
The runtime describes UI structure only; never put executable code in it.
"""

# Groq model availability changes over time. Keep a small ordered fallback list
# so a retired/default model does not take the entire application offline.
MODEL_FALLBACKS = (
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
)


class GroqProvider(AIProvider):
    def __init__(self):
        self.key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        self.url = os.getenv(
            "GROQ_BASE_URL",
            "https://api.groq.com/openai/v1/chat/completions",
        )
        self.models_url = self.url.rsplit("/chat/completions", 1)[0] + "/models"
        self.timeout = float(os.getenv("AI_TIMEOUT_SECONDS", "45"))

    def _available_models(self, client):
        response = client.get(
            self.models_url,
            headers={
                "Authorization": f"Bearer {self.key}",
                "Accept": "application/json",
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            item.get("id")
            for item in data.get("data", [])
            if isinstance(item, dict) and item.get("id")
        }

    def _request(self, client, model, query):
        payload = {
            "model": model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
        }
        return client.post(
            self.url,
            headers={
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
        )

    def generate_app_spec(self, query: str) -> AppSpec:
        if not self.key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        with httpx.Client(timeout=self.timeout) as client:
            try:
                response = self._request(client, self.model, query)

                # Groq can retire/remove model IDs. If that happens, discover
                # models exposed to this API key and retry once with a supported
                # fallback instead of returning a generic outage.
                if response.status_code == 404:
                    try:
                        available = self._available_models(client)
                    except httpx.HTTPError:
                        available = set()

                    candidates = [
                        model for model in (self.model, *MODEL_FALLBACKS)
                        if model in available
                    ]
                    if candidates:
                        selected = candidates[0]
                        if selected != self.model:
                            logger.warning(
                                "Groq model unavailable model=%s; retrying model=%s",
                                self.model,
                                selected,
                            )
                        response = self._request(client, selected, query)
                    else:
                        logger.error(
                            "No configured Groq fallback model is available; "
                            "requested model=%s available_count=%s",
                            self.model,
                            len(available),
                        )

                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                detail = response.text.strip().replace("\n", " ")[:1000]
                logger.error(
                    "Groq request rejected status=%s model=%s detail=%s",
                    response.status_code,
                    self.model,
                    detail or "<empty response>",
                )
                raise RuntimeError(
                    f"Groq request failed with HTTP {response.status_code}."
                ) from exc
            except httpx.HTTPError as exc:
                logger.error(
                    "Groq request failed model=%s error=%s",
                    self.model,
                    str(exc),
                )
                raise RuntimeError("Groq request failed.") from exc

            data = response.json()

        try:
            content = data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("AI provider returned an unexpected response.") from exc

        fence = chr(96) * 3
        content = content.replace(fence + "json", "").replace(fence, "").strip()

        try:
            parsed = json.loads(content)
            return AppSpec.model_validate(parsed)
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            raise RuntimeError(
                "AI provider returned an invalid application specification."
            ) from exc
