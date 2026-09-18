from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class FeatureBreakdown(BaseModel):
    transaction_frequency: float
    average_transaction_amount: float
    amount_variance: float
    night_transaction_ratio: float
    unique_connections: int
    flagged_account_connections: int
    rapid_transaction_count: int
    cashout_frequency: int

class FeatureContribution(BaseModel):
    feature_name: str
    feature_label: str
    account_value: float
    avg_value: float
    multiplier: float
    contribution_percentage: float
    explanation: str

class AccountRiskScoreResponse(BaseModel):
    account_id: int
    account_number: str
    name: str
    account_type: str
    balance: float
    city: str
    is_flagged: bool
    risk_score: int
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    features: Dict[str, Any]
    contributions: List[FeatureContribution]
    reasons: List[str]

    class Config:
        from_attributes = True

class GraphNode(BaseModel):
    id: str
    label: str
    name: str
    risk_score: int
    risk_level: str
    is_flagged: bool
    balance: float
    account_type: str

class GraphLink(BaseModel):
    source: str
    target: str
    amount: float
    transaction_count: int
    transaction_type: str

class MoneyFlowGraphResponse(BaseModel):
    selected_account_id: str
    nodes: List[GraphNode]
    links: List[GraphLink]
    total_inflow: float
    total_outflow: float

class CashoutPredictionResponse(BaseModel):
    atm_id: int
    name: str
    location: str
    city: str
    latitude: float
    longitude: float
    confidence: int
    risk_level: str
    time_window: str
    reason: str

class AlertResponse(BaseModel):
    id: int
    account_id: int
    account_number: str
    account_name: str
    alert_type: str
    severity: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

class OverviewStatsResponse(BaseModel):
    total_accounts: int
    high_risk_accounts: int
    active_alerts: int
    predicted_cashouts: int
    total_volume_inr: float
    suspicious_volume_inr: float

class ATMLocationResponse(BaseModel):
    id: int
    name: str
    location: str
    city: str
    latitude: float
    longitude: float
    risk_level: str

    class Config:
        from_attributes = True
