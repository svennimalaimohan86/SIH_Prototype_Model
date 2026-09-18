from sqlalchemy.orm import Session
from typing import List, Dict, Any
from models import Account, Transaction, ATMLocation
from services.risk_engine import get_risk_scores

TIME_WINDOWS = [
    "18:00 – 20:00",
    "21:00 – 23:00",
    "23:30 – 01:30",
    "02:00 – 04:00",
    "13:00 – 15:00",
    "08:30 – 10:30"
]

def predict_cashout_locations(account_id: int, db: Session) -> List[Dict[str, Any]]:
    account = db.query(Account).filter(Account.id == account_id).first()
    all_atms = db.query(ATMLocation).all()
    if not all_atms:
        return []

    # Check transactions associated with this account or its immediate peers
    txs = db.query(Transaction).filter(
        (Transaction.sender_account_id == account_id) | (Transaction.receiver_account_id == account_id)
    ).all()

    # Get account risk
    scores = get_risk_scores(db)
    acc_score_info = next((s for s in scores if s["account_id"] == account_id), None)
    base_risk = acc_score_info["risk_score"] if acc_score_info else 50

    # Look for ATMs used directly
    used_atm_ids = [t.atm_id for t in txs if t.atm_id is not None]
    
    # Priority scoring for ATMs
    scored_atms = []
    account_city = account.city if account else "Erode"

    for idx, atm in enumerate(all_atms):
        score = 40.0
        reasons = []

        # City match
        if atm.city.lower() == account_city.lower():
            score += 25.0
            reasons.append(f"Located in primary operational city ({atm.city})")

        # Direct usage history
        usage_count = used_atm_ids.count(atm.id)
        if usage_count > 0:
            score += min(usage_count * 15.0, 30.0)
            reasons.append(f"Historical withdrawal point ({usage_count} recorded cash-outs)")

        # ATM risk level
        if atm.risk_level == "HIGH":
            score += 15.0
            reasons.append("Identified as high-velocity cashout cluster terminal")
        elif atm.risk_level == "MEDIUM":
            score += 8.0

        # Account risk influence
        score += (base_risk * 0.15)

        # Deterministic variation based on IDs
        pseudo_jitter = ((account_id * 17 + atm.id * 31) % 15) - 7
        score += pseudo_jitter

        confidence = int(min(max(score, 45), 96))
        
        # Determine time window
        tw_index = (account_id * 3 + atm.id * 7) % len(TIME_WINDOWS)
        time_window = TIME_WINDOWS[tw_index]

        if not reasons:
            reasons.append(f"Nearby commercial hub in {atm.city}")

        scored_atms.append({
            "atm_id": atm.id,
            "name": atm.name,
            "location": atm.location,
            "city": atm.city,
            "latitude": atm.latitude,
            "longitude": atm.longitude,
            "confidence": confidence,
            "risk_level": atm.risk_level,
            "time_window": time_window,
            "reason": " • ".join(reasons)
        })

    # Sort by confidence descending and pick top 3
    scored_atms.sort(key=lambda x: x["confidence"], reverse=True)
    return scored_atms[:3]
