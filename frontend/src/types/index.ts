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
