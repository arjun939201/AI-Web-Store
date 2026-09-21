import os

from .grok import GrokProvider
from .groq import GroqProvider


def get_provider():
    provider = os.getenv("AI_PROVIDER", "groq").lower().strip()
    if provider == "groq":
        return GroqProvider()
    if provider == "grok":
        return GrokProvider()
    raise ValueError(f"Unsupported AI_PROVIDER: {provider}")
