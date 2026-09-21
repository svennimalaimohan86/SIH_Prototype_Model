from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import numpy as np
from datetime import datetime, timedelta

from models import Account, Transaction, FraudComplaint
from ml.anomaly_model import AnomalyModel

anomaly_model_instance = AnomalyModel()

def compute_account_features(db: Session) -> List[Dict[str, Any]]:
    """
    Extracts behavioral, network, and temporal features for every account.
    """
    accounts = db.query(Account).all()
    transactions = db.query(Transaction).all()
    complaints = db.query(FraudComplaint).all()

    # Build maps for fast lookups
    flagged_account_ids = {acc.id for acc in accounts if acc.is_flagged}
    complained_account_ids = {c.account_id for c in complaints}
    flagged_or_complained = flagged_account_ids.union(complained_account_ids)

    # Group transactions by account
    account_txns: Dict[int, List[Transaction]] = {acc.id: [] for acc in accounts}
    for tx in transactions:
        if tx.sender_account_id and tx.sender_account_id in account_txns:
            account_txns[tx.sender_account_id].append(tx)
        if tx.receiver_account_id and tx.receiver_account_id in account_txns:
            account_txns[tx.receiver_account_id].append(tx)

    features_list = []

    for acc in accounts:
        txs = account_txns[acc.id]
        # Sort txs by timestamp
        txs.sort(key=lambda x: x.timestamp or datetime.min)

        tx_count = len(txs)
        amounts = [t.amount for t in txs] if txs else [0.0]
        avg_amount = float(np.mean(amounts)) if amounts else 0.0
        amount_var = float(np.std(amounts)) if len(amounts) > 1 else 0.0

        # Night transactions (22:00 to 05:00)
        night_count = 0
        for t in txs:
            if t.timestamp:
                hour = t.timestamp.hour
                if hour >= 22 or hour < 5:
                    night_count += 1
        night_ratio = round(night_count / tx_count, 3) if tx_count > 0 else 0.0

        # Unique connections & connections to flagged accounts
        unique_peers = set()
        flagged_peers = set()
        for t in txs:
            peer_id = None
            if t.sender_account_id == acc.id:
                peer_id = t.receiver_account_id
            else:
                peer_id = t.sender_account_id

            if peer_id and peer_id != acc.id:
                unique_peers.add(peer_id)
                if peer_id in flagged_or_complained:
                    flagged_peers.add(peer_id)

        # Rapid bursts (<10 minutes gap between consecutive transactions)
        rapid_bursts = 0
        for i in range(1, len(txs)):
            t1 = txs[i - 1].timestamp
            t2 = txs[i].timestamp
            if t1 and t2:
                diff_sec = abs((t2 - t1).total_seconds())
                if diff_sec <= 600:  # 10 minutes
                    rapid_bursts += 1

        # Cashout frequency (ATM withdrawals)
        cashouts = sum(1 for t in txs if t.transaction_type == "ATM_WITHDRAWAL" or t.atm_id is not None)

        features_list.append({
            "account_id": acc.id,
            "account_number": acc.account_number,
            "name": acc.name,
            "account_type": acc.account_type,
            "balance": acc.balance,
            "city": acc.city,
            "is_flagged": acc.is_flagged or (acc.id in complained_account_ids),
            "transaction_frequency": tx_count,
            "average_transaction_amount": avg_amount,
            "amount_variance": amount_var,
            "night_transaction_ratio": night_ratio,
            "unique_connections": len(unique_peers),
            "flagged_account_connections": len(flagged_peers),
            "rapid_transaction_count": rapid_bursts,
            "cashout_frequency": cashouts
        })

    return features_list

_cached_scores: Optional[List[Dict[str, Any]]] = None

def get_risk_scores(db: Session, force_recompute: bool = False) -> List[Dict[str, Any]]:
    global _cached_scores
    if _cached_scores is None or force_recompute:
        features = compute_account_features(db)
        scores = anomaly_model_instance.train_and_score(features)
        
        # Merge account metadata
        acc_map = {acc.id: acc for acc in db.query(Account).all()}
        for s in scores:
            acc = acc_map.get(s["account_id"])
            if acc:
                s["account_number"] = acc.account_number
                s["name"] = acc.name
                s["account_type"] = acc.account_type
                s["balance"] = acc.balance
                s["city"] = acc.city
                s["is_flagged"] = acc.is_flagged or s["features"].get("is_flagged", False)
                s["is_frozen"] = bool(getattr(acc, "is_frozen", False))
                s["freeze_status"] = getattr(acc, "freeze_status", "ACTIVE") or "ACTIVE"
                s["freeze_reference"] = getattr(acc, "freeze_reference", None)
                s["frozen_at"] = getattr(acc, "frozen_at", None)
                s["freeze_reason"] = getattr(acc, "freeze_reason", None)
                s["lien_amount"] = getattr(acc, "lien_amount", None)
                s["nodal_bank_name"] = getattr(acc, "nodal_bank_name", None)

        _cached_scores = scores

    return _cached_scores

def invalidate_risk_cache():
    global _cached_scores
    _cached_scores = None
