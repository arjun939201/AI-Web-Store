import os
from .grok import GrokProvider
def get_provider():
 if os.getenv("AI_PROVIDER","grok").lower()=="grok": return GrokProvider()
 raise ValueError("Unsupported AI_PROVIDER")
