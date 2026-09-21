export interface FeatureContribution {
  feature_name: string;
  feature_label: string;
  account_value: number;
  avg_value: number;
  multiplier: number;
  contribution_percentage: number;
  explanation: string;
}

export interface AccountRiskScore {
  account_id: number;
  account_number: string;
  name: string;
  account_type: string;
  balance: number;
  city: string;
  is_flagged: boolean;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_frozen?: boolean;
  freeze_status?: string;
  freeze_reference?: string;
  frozen_at?: string;
  freeze_reason?: string;
  lien_amount?: number;
  nodal_bank_name?: string;
  features: {
    transaction_frequency: number;
    average_transaction_amount: number;
    amount_variance: number;
    night_transaction_ratio: number;
    unique_connections: number;
    flagged_account_connections: number;
    rapid_transaction_count: number;
    cashout_frequency: number;
    is_flagged?: boolean;
  };
  contributions: FeatureContribution[];
  reasons: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  risk_score: number;
  risk_level: string;
  is_flagged: boolean;
  balance: number;
  account_type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  amount: number;
  transaction_count: number;
  transaction_type: string;
  timestamp?: string;
  time_offset_minutes?: number;
  hop_layer?: number;
  narration?: string;
}

export interface MoneyFlowGraph {
  selected_account_id: string;
  nodes: GraphNode[];
  links: GraphLink[];
  total_inflow: number;
  total_outflow: number;
}

export interface CashoutPrediction {
  atm_id: number;
  name: string;
  location: string;
  city: string;
  latitude: number;
  longitude: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  time_window: string;
  reason: string;
}

export interface ATMLocation {
  id: number;
  name: string;
  location: string;
  city: string;
  latitude: number;
  longitude: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AlertItem {
  id: number;
  account_id: number;
  account_number: string;
  account_name: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  created_at: string;
}

export interface OverviewStats {
  total_accounts: number;
  high_risk_accounts: number;
  active_alerts: number;
  predicted_cashouts: number;
  total_volume_inr: number;
  suspicious_volume_inr: number;
}

export interface FreezeRequestPayload {
  freeze_type: 'DEBIT_FREEZE' | 'LIEN_MARKED' | 'TOTAL_FREEZE';
  reason: string;
  lien_amount?: number;
  nodal_bank_name?: string;
  investigator_name?: string;
}

export interface FreezeResponse {
  account_id: number;
  account_number: string;
  is_frozen: boolean;
  freeze_status: string;
  freeze_reference: string;
  frozen_at: string;
  message: string;
}

export interface BnssNoticeData {
  notice_reference: string;
  statutory_act: string;
  legal_sections: string[];
  issuing_authority: string;
  investigating_officer: string;
  investigator_badge: string;
  issue_timestamp: string;
  target_bank: string;
  account_number: string;
  account_holder_name: string;
  account_type: string;
  city_jurisdiction: string;
  freeze_action: string;
  lien_amount?: number;
  case_complaint_ref: string;
  utr_references: string[];
  forensic_anomaly_score: number;
  xai_justification: string[];
  statutory_orders: string[];
  verification_hash: string;
}
