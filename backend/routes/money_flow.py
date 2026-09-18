from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import MoneyFlowGraphResponse
from services.graph_engine import get_account_subgraph

router = APIRouter(prefix="/accounts", tags=["money-flow"])

@router.get("/{account_id}/money-flow", response_model=MoneyFlowGraphResponse)
def get_money_flow(account_id: int, db: Session = Depends(get_db)):
    """
    Returns the connected NetworkX directed subgraph for the selected account,
    identifying high-risk counterparties, transaction amounts, and flow paths.
    """
    subgraph = get_account_subgraph(account_id=account_id, db=db)
    return subgraph
