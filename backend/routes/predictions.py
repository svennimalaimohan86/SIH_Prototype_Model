from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import hashlib

from database import get_db
from models import ATMLocation, Transaction, Account, FraudComplaint
from schemas import CashoutPredictionResponse, ATMLocationResponse, WithdrawalIntelResponse
from services.prediction_engine import predict_cashout_locations

router = APIRouter(prefix="/predictions", tags=["predictions"])

def format_withdrawal_intel(tx: Transaction, db: Session) -> WithdrawalIntelResponse:
    account = tx.sender or db.query(Account).filter(Account.id == tx.sender_account_id).first()
    atm = tx.atm or (db.query(ATMLocation).filter(ATMLocation.id == tx.atm_id).first() if tx.atm_id else None)
    
    # Check if there are fraud complaints on this account
    complaint = db.query(FraudComplaint).filter(FraudComplaint.account_id == tx.sender_account_id).first()
    complaint_ref = complaint.complaint_number if complaint else f"NCRP-2026-CC-{tx.sender_account_id:04d}"
    
    # Generate deterministic UTR
    utr_hash = hashlib.md5(f"TX-{tx.id}-{tx.timestamp}".encode()).hexdigest()[:12].upper()
    utr = f"UTR2026TN{utr_hash}"

    # Build forensic tags
    tags = []
    if tx.withdrawer_role in ["FIELD_CASH_RUNNER", "PRIMARY_MULE_RUNNER", "MULE_CARRIER"]:
        tags.append("SYNDICATE_RUNNER")
    if tx.face_match_confidence and tx.face_match_confidence >= 90:
        tags.append("HIGH_CONFIDENCE_MATCH")
    if tx.cctv_status == "HELMET_MASKED":
        tags.append("EVASION_GEAR_DETECTED")
    if tx.amount >= 30000:
        tags.append("HIGH_VALUE_BURST")

    return WithdrawalIntelResponse(
        transaction_id=tx.id,
        account_id=tx.sender_account_id or 0,
        account_number=account.account_number if account else f"NX-{tx.sender_account_id:05d}",
        account_holder_name=account.name if account else "Unknown Account",
        amount=tx.amount,
        timestamp=tx.timestamp,
        formatted_time=tx.timestamp.strftime("%d %b %Y • %H:%M:%S IST"),
        atm_id=atm.id if atm else None,
        atm_name=atm.name if atm else "Terminal Cash-Out Point",
        atm_location=atm.location if atm else "Tamil Nadu Regional Corridor",
        atm_city=atm.city if atm else (account.city if account else "Erode"),
        atm_latitude=atm.latitude if atm else None,
        atm_longitude=atm.longitude if atm else None,
        atm_risk_level=atm.risk_level if atm else "HIGH",
        withdrawer_name=tx.withdrawer_name or "Unidentified Runner",
        withdrawer_alias=tx.withdrawer_alias or "Syndicate Carrier",
        withdrawer_role=tx.withdrawer_role or "FIELD_CASH_RUNNER",
        withdrawer_phone=tx.withdrawer_phone or "+91 9XXXX XXXXX",
        withdrawer_id_number=tx.withdrawer_id_number or "UNVERIFIED_KYC",
        face_match_confidence=tx.face_match_confidence or 85,
        cctv_status=tx.cctv_status or "FACE_CAPTURED",
        cctv_footage_ref=tx.cctv_footage_ref or f"CAM-ATM-{tx.atm_id or 1}-202609.mp4",
        vehicle_details=tx.vehicle_details or "Two-Wheeler (Registration Tracing in Progress)",
        withdrawal_method=tx.withdrawal_method or "CLONED_CARD",
        physical_description=tx.physical_description or "Suspect wearing dark jacket and helmet at ATM terminal.",
        interception_status=tx.interception_status or "IDENTIFIED",
        nearest_patrol_unit=tx.nearest_patrol_unit or "Regional Cyber Police Mobile Patrol",
        utr_number=utr,
        forensic_tags=tags,
        case_complaint_ref=complaint_ref
    )

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

@router.get("/withdrawals/intel", response_model=List[WithdrawalIntelResponse])
def get_withdrawal_intel(
    account_id: Optional[int] = Query(None, description="Filter by account ID"),
    atm_id: Optional[int] = Query(None, description="Filter by ATM location ID"),
    limit: int = Query(25, description="Max results"),
    db: Session = Depends(get_db)
):
    """
    Returns detailed forensic intelligence dossiers on who withdrew money at ATM terminals,
    including runner identity, CCTV metadata, vehicle info, and patrol unit status.
    """
    query = db.query(Transaction).filter(Transaction.transaction_type == "ATM_WITHDRAWAL")
    
    if account_id is not None:
        query = query.filter(Transaction.sender_account_id == account_id)
    if atm_id is not None:
        query = query.filter(Transaction.atm_id == atm_id)

    withdrawals = query.order_by(Transaction.timestamp.desc()).limit(limit).all()
    
    return [format_withdrawal_intel(w, db) for w in withdrawals]

@router.get("/atms/{atm_id}/withdrawals", response_model=List[WithdrawalIntelResponse])
def get_atm_withdrawals(atm_id: int, db: Session = Depends(get_db)):
    """
    Returns all recorded forensic withdrawal dossiers for a specific ATM location.
    """
    withdrawals = db.query(Transaction).filter(
        Transaction.transaction_type == "ATM_WITHDRAWAL",
        Transaction.atm_id == atm_id
    ).order_by(Transaction.timestamp.desc()).all()
    
    return [format_withdrawal_intel(w, db) for w in withdrawals]

