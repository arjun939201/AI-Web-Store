import json
import os

import httpx
from .base import AIProvider
from ..schemas import AppSpec

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
            response = client.post(
                self.url,
                headers={
                    "Authorization": f"Bearer {self.key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
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
            raise RuntimeError("AI provider returned an invalid application specification.") from exc
