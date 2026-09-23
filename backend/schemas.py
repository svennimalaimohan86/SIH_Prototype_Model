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
    is_frozen: bool = False
    freeze_status: str = "ACTIVE"
    freeze_reference: Optional[str] = None
    frozen_at: Optional[datetime] = None
    freeze_reason: Optional[str] = None
    lien_amount: Optional[float] = None
    nodal_bank_name: Optional[str] = None
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
    timestamp: Optional[str] = None
    time_offset_minutes: float = 0.0
    hop_layer: int = 1
    narration: Optional[str] = None

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


class FreezeAccountRequest(BaseModel):
    freeze_type: str = "DEBIT_FREEZE"  # DEBIT_FREEZE, LIEN_MARKED, TOTAL_FREEZE
    reason: str
    lien_amount: Optional[float] = None
    nodal_bank_name: Optional[str] = "State Bank of India - Nodal Operations"
    investigator_name: Optional[str] = "Krishna S (Badge #21) • Lead Cybercrime Investigator"


class FreezeAccountResponse(BaseModel):
    account_id: int
    account_number: str
    is_frozen: bool
    freeze_status: str
    freeze_reference: str
    frozen_at: datetime
    message: str


class BnssNoticeResponse(BaseModel):
    notice_reference: str
    statutory_act: str
    legal_sections: List[str]
    issuing_authority: str
    investigating_officer: str
    investigator_badge: str
    issue_timestamp: datetime
    target_bank: str
    account_number: str
    account_holder_name: str
    account_type: str
    city_jurisdiction: str
    freeze_action: str
    lien_amount: Optional[float] = None
    case_complaint_ref: str
    utr_references: List[str]
    forensic_anomaly_score: int
    xai_justification: List[str]
    statutory_orders: List[str]
    verification_hash: str


class WithdrawalIntelResponse(BaseModel):
    transaction_id: int
    account_id: int
    account_number: str
    account_holder_name: str
    amount: float
    timestamp: datetime
    formatted_time: str
    atm_id: Optional[int] = None
    atm_name: Optional[str] = None
    atm_location: Optional[str] = None
    atm_city: Optional[str] = None
    atm_latitude: Optional[float] = None
    atm_longitude: Optional[float] = None
    atm_risk_level: Optional[str] = None
    
    # Forensic Person / Runner Profile
    withdrawer_name: str
    withdrawer_alias: str
    withdrawer_role: str
    withdrawer_phone: str
    withdrawer_id_number: str
    face_match_confidence: int
    cctv_status: str
    cctv_footage_ref: str
    vehicle_details: str
    withdrawal_method: str
    physical_description: str
    interception_status: str
    nearest_patrol_unit: str
    utr_number: str
    
    # Forensic notes & action tags
    forensic_tags: List[str] = []
    case_complaint_ref: Optional[str] = None

