import json,os,httpx
from .base import AIProvider
from ..schemas import AppSpec
SYSTEM_PROMPT="Return ONLY JSON with keys name, description, category, features, pages, icon. Do not generate code. Keep it practical and concise."
class GrokProvider(AIProvider):
 def __init__(self):
  self.key=os.getenv("XAI_API_KEY"); self.model=os.getenv("XAI_MODEL","grok-3-mini"); self.url=os.getenv("XAI_BASE_URL","https://api.x.ai/v1/chat/completions")
 def generate_app_spec(self,query):
  if not self.key: raise RuntimeError("XAI_API_KEY is not configured.")
  payload={"model":self.model,"temperature":0.2,"messages":[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":query}]}
  with httpx.Client(timeout=45) as client:
   r=client.post(self.url,headers={"Authorization":f"Bearer {self.key}","Content-Type":"application/json"},json=payload); r.raise_for_status()
  content=r.json()["choices"][0]["message"]["content"].strip()
  fence=chr(96)+chr(96)+chr(96)
  content=content.replace(fence+"json","").replace(fence,"").strip()
  return AppSpec.model_validate(json.loads(content))
