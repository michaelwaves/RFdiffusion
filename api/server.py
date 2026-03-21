from dataclasses import dataclass
from fastapi import FastAPI
@dataclass
class GenerateRequest:
    prompt: str
    user_id: str | None #will be a uuid from betterauth in frontend. If not provided, default to 0
    chat_id:str |None #default to 0
    pdb: str | None #for optional scaffolding, pdb motif from a protein database
    max_iterations: int=3 #how many versions the claude agent can do







