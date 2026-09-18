from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime

from models import Alert, Account, Transaction, FraudComplaint, ATMLocation
from services.risk_engine import get_risk_scores

def get_all_alerts(db: Session) -> List[Dict[str, Any]]:
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    results = []
    
    # Pre-fetch accounts map
    acc_map = {acc.id: acc for acc in db.query(Account).all()}
    
    for a in alerts:
        acc = acc_map.get(a.account_id)
        results.append({
            "id": a.id,
            "account_id": a.account_id,
            "account_number": acc.account_number if acc else f"NX-{a.account_id:05d}",
            "account_name": acc.name if acc else "Unknown Account",
            "alert_type": a.alert_type,
            "severity": a.severity,
            "reason": a.reason,
            "created_at": a.created_at
        })

    # Sort so CRITICAL and HIGH appear at the top, then newest
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    results.sort(key=lambda x: (severity_order.get(x["severity"], 4), -x["id"]))
    return results

def get_overview_statistics(db: Session) -> Dict[str, Any]:
    total_accounts = db.query(Account).count()
    active_alerts = db.query(Alert).count()
    total_atms = db.query(ATMLocation).count()

    scores = get_risk_scores(db)
    high_risk_count = sum(1 for s in scores if s["risk_score"] >= 70)

    # Volume calculation
    all_txs = db.query(Transaction).all()
    total_volume = sum(t.amount for t in all_txs)

    high_risk_account_ids = {s["account_id"] for s in scores if s["risk_score"] >= 70}
    suspicious_volume = sum(
        t.amount for t in all_txs
        if (t.sender_account_id in high_risk_account_ids or t.receiver_account_id in high_risk_account_ids)
    )

    return {
        "total_accounts": total_accounts,
        "high_risk_accounts": high_risk_count,
        "active_alerts": active_alerts,
        "predicted_cashouts": total_atms,
        "total_volume_inr": round(total_volume, 2),
        "suspicious_volume_inr": round(suspicious_volume, 2)
    }
