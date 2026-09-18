from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Account
from schemas import AccountRiskScoreResponse
from services.risk_engine import get_risk_scores

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/risk-scores", response_model=List[AccountRiskScoreResponse])
def fetch_risk_scores(db: Session = Depends(get_db)):
    """
    Returns ranked accounts with 0-100 IsolationForest anomaly risk scores,
    feature contributions, and explainability factors.
    """
    scores = get_risk_scores(db)
    return scores

@router.get("/{account_id}", response_model=AccountRiskScoreResponse)
def get_account_detail(account_id: int, db: Session = Depends(get_db)):
    scores = get_risk_scores(db)
    for s in scores:
        if s["account_id"] == account_id:
            return s
    raise HTTPException(status_code=404, detail="Account not found")
