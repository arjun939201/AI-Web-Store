from datetime import datetime
from typing import Any
from pydantic import BaseModel,Field,ConfigDict
class SearchRequest(BaseModel): query:str=Field(min_length=2,max_length=2000)
class AppSpec(BaseModel):
 name:str=Field(min_length=1,max_length=180); description:str=Field(min_length=1,max_length=2000); category:str=Field(min_length=1,max_length=100); features:list[str]=Field(default_factory=list,max_length=30); pages:list[str]=Field(default_factory=list,max_length=30); icon:str="✦"
class AppOut(AppSpec):
 model_config=ConfigDict(from_attributes=True)
 id:int; slug:str; created_at:datetime; updated_at:datetime; specification:dict[str,Any]
class SearchResponse(BaseModel): app:AppOut
class ShareResponse(BaseModel): url:str
