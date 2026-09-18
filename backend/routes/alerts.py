from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import AlertResponse, OverviewStatsResponse
from services.alert_engine import get_all_alerts, get_overview_statistics

router = APIRouter(tags=["alerts-and-overview"])

@router.get("/alerts", response_model=List[AlertResponse])
def fetch_alerts(db: Session = Depends(get_db)):
    """
    Returns prioritized cybercrime intelligence alerts based on velocity,
    unusual hours, network contamination, and suspicious cash-outs.
    """
    return get_all_alerts(db)

@router.get("/overview/stats", response_model=OverviewStatsResponse)
def fetch_overview_statistics(db: Session = Depends(get_db)):
    """
    Returns high-level KPI card metrics for the investigator overview dashboard.
    """
    return get_overview_statistics(db)
