from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import ATMLocation
from schemas import CashoutPredictionResponse, ATMLocationResponse
from services.prediction_engine import predict_cashout_locations

router = APIRouter(prefix="/predictions", tags=["predictions"])

@router.get("/cashout", response_model=List[CashoutPredictionResponse])
def get_cashout_predictions(
    account_id: int = Query(..., description="ID of account to predict cashout locations for"),
    db: Session = Depends(get_db)
):
    """
    Returns top 3 predicted ATM cash-out terminals and estimated time-windows
    using transparent heuristic modeling of historical syndicate patterns.
    """
    predictions = predict_cashout_locations(account_id=account_id, db=db)
    return predictions

@router.get("/atms", response_model=List[ATMLocationResponse])
def list_all_atms(db: Session = Depends(get_db)):
    """
    Returns all synthetic ATM locations with lat/long and risk ratings for Leaflet map view.
    """
    return db.query(ATMLocation).all()
