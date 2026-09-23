from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from database import get_db
from services.ai_copilot import process_copilot_query, generate_case_briefing

router = APIRouter(prefix="/copilot", tags=["AI Copilot & Natural Language Forensics"])

class CopilotQueryRequest(BaseModel):
    query: str
    context_account_id: Optional[int] = None

class CopilotAccountCard(BaseModel):
    id: int
    account_number: str
    name: str
    city: Optional[str] = None
    risk_score: int
    risk_level: str
    is_flagged: Optional[bool] = False
    is_frozen: Optional[bool] = False

class CopilotATMCard(BaseModel):
    id: int
    name: str
    location: str
    city: str
    latitude: float
    longitude: float
    confidence: int
    time_window: str
    risk_level: str

class CopilotQueryResponse(BaseModel):
    query_type: str
    answer: str
    relevant_accounts: List[CopilotAccountCard]
    relevant_atms: List[CopilotATMCard]
    suggested_actions: List[str]

@router.post("/query", response_model=CopilotQueryResponse)
def query_copilot(payload: CopilotQueryRequest, db: Session = Depends(get_db)):
    """
    Process natural language cybercrime queries (suspect networks, midnight transfers, cashouts, anomalies).
    """
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = process_copilot_query(
        query=payload.query,
        db=db,
        context_account_id=payload.context_account_id
    )
    return result

@router.post("/case-briefing/{account_id}")
def get_case_briefing(account_id: int, db: Session = Depends(get_db)):
    """
    Generate an executive LLM forensic case briefing for a given suspect account.
    """
    briefing = generate_case_briefing(account_id, db)
    if "error" in briefing:
        raise HTTPException(status_code=404, detail=briefing["error"])
    return briefing
