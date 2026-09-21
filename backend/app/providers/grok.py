import json
import logging
import os

import httpx
from .base import AIProvider
from ..schemas import AppSpec

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Return ONLY a valid JSON object with exactly these keys:
name, description, category, features, pages, icon.
Do not return markdown. Do not generate executable code.
Keep the application practical, concise, and internally consistent.
features and pages must be arrays of short strings.
"""


class GrokProvider(AIProvider):
    def __init__(self):
        self.key = os.getenv("XAI_API_KEY")
        self.model = os.getenv("XAI_MODEL", "grok-3-mini")
        self.url = os.getenv(
            "XAI_BASE_URL",
            "https://api.x.ai/v1/chat/completions",
        )
        self.timeout = float(os.getenv("AI_TIMEOUT_SECONDS", "45"))

    def generate_app_spec(self, query: str) -> AppSpec:
        if not self.key:
            raise RuntimeError("XAI_API_KEY is not configured.")

        payload = {
            "model": self.model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
        }

        with httpx.Client(timeout=self.timeout) as client:
            try:
                response = client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                # Never log the Authorization header or the API key.
                detail = response.text.strip().replace("\n", " ")[:1000]
                logger.error(
                    "xAI request rejected status=%s model=%s detail=%s",
                    response.status_code,
                    self.model,
                    detail or "<empty response>",
                )
                raise RuntimeError(
                    f"xAI request failed with HTTP {response.status_code}."
                ) from exc
            except httpx.HTTPError as exc:
                logger.error(
                    "xAI request failed model=%s error=%s",
                    self.model,
                    str(exc),
                )
                raise RuntimeError("xAI request failed.") from exc

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
