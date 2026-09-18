import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Tuple, Any

FEATURE_KEYS = [
    "transaction_frequency",
    "average_transaction_amount",
    "amount_variance",
    "night_transaction_ratio",
    "unique_connections",
    "flagged_account_connections",
    "rapid_transaction_count",
    "cashout_frequency"
]

FEATURE_LABELS = {
    "transaction_frequency": "Transaction Frequency",
    "average_transaction_amount": "Average Transaction Amount",
    "amount_variance": "Amount Variance / Volatility",
    "night_transaction_ratio": "Night Activity (10 PM - 5 AM)",
    "unique_connections": "Unique Counterparties",
    "flagged_account_connections": "Links to Flagged Accounts",
    "rapid_transaction_count": "Rapid Bursts (<10 min intervals)",
    "cashout_frequency": "ATM Cash-out Frequency"
}

class AnomalyModel:
    def __init__(self):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.10,
            random_state=42
        )
        self.population_means: Dict[str, float] = {}
        self.population_stds: Dict[str, float] = {}
        self.is_fitted = False

    def train_and_score(self, account_features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes raw feature dictionaries for all accounts, trains IsolationForest,
        computes population statistics, normalized risk scores (0-100), and explanations.
        """
        if not account_features:
            return []

        # Build feature matrix
        n = len(account_features)
        X = np.zeros((n, len(FEATURE_KEYS)))
        for i, feat in enumerate(account_features):
            for j, key in enumerate(FEATURE_KEYS):
                X[i, j] = float(feat.get(key, 0.0))

        # Compute population averages and stds
        for j, key in enumerate(FEATURE_KEYS):
            col_mean = float(np.mean(X[:, j]))
            col_std = float(np.std(X[:, j]))
            self.population_means[key] = col_mean if col_mean > 0 else 1.0
            self.population_stds[key] = col_std if col_std > 0 else 1.0

        # Fit IsolationForest
        self.model.fit(X)
        self.is_fitted = True

        # Raw scores from IsolationForest: decision_function returns negative for anomalies
        raw_scores = self.model.decision_function(X)
        min_s = float(np.min(raw_scores))
        max_s = float(np.max(raw_scores))
        s_range = (max_s - min_s) if (max_s - min_s) > 0 else 1.0

        # Inverse normalize: the lower raw_score, the higher the anomaly (risk)
        # raw_scores high -> normal (low risk), raw_scores low -> anomaly (high risk)
        base_risks = (max_s - raw_scores) / s_range * 100.0

        results = []
        for i, feat in enumerate(account_features):
            acc_id = feat["account_id"]
            base_risk = base_risks[i]

            # Domain adjustment for financial cybercrime indicators:
            # Heavily elevate if connected to flagged accounts or extreme bursts
            flagged_conn = feat.get("flagged_account_connections", 0)
            rapid_count = feat.get("rapid_transaction_count", 0)
            night_ratio = feat.get("night_transaction_ratio", 0.0)
            is_flagged = feat.get("is_flagged", False)

            domain_boost = 0.0
            if is_flagged:
                domain_boost += 25.0
            if flagged_conn > 0:
                domain_boost += min(flagged_conn * 12.0, 30.0)
            if rapid_count >= 5:
                domain_boost += min(rapid_count * 2.5, 20.0)
            if night_ratio > 0.4:
                domain_boost += 15.0

            # Composite risk score bounded 0 to 99 (or 100)
            final_risk = int(np.clip(base_risk * 0.65 + domain_boost, 5, 99))

            # Risk level category
            if final_risk >= 85:
                risk_level = "CRITICAL"
            elif final_risk >= 70:
                risk_level = "HIGH"
            elif final_risk >= 40:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            # Compute feature contributions and explainability reasons
            contributions, reasons = self._generate_explainability(feat, final_risk)

            results.append({
                "account_id": acc_id,
                "risk_score": final_risk,
                "risk_level": risk_level,
                "features": feat,
                "contributions": contributions,
                "reasons": reasons
            })

        # Sort accounts by risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    def _generate_explainability(self, feat: Dict[str, Any], final_risk: int) -> Tuple[List[Dict[str, Any]], List[str]]:
        contributions = []
        reasons = []

        total_weight = 0.0
        feature_weights = {}

        for key in FEATURE_KEYS:
            val = float(feat.get(key, 0.0))
            avg = self.population_means.get(key, 1.0)
            multiplier = round(val / avg, 2) if avg > 0 else 1.0

            # Weight calculation for contribution
            excess = max(0.0, val - avg)
            weight = (excess / avg) if avg > 0 else 0.0
            if key == "flagged_account_connections" and val > 0:
                weight += val * 3.0
            if key == "rapid_transaction_count" and val > 0:
                weight += val * 1.5

            feature_weights[key] = weight
            total_weight += weight

        # Normalize contributions to sum to 100% (or proportional to risk)
        denom = total_weight if total_weight > 0 else 1.0
        for key in FEATURE_KEYS:
            val = float(feat.get(key, 0.0))
            avg = self.population_means.get(key, 1.0)
            multiplier = round(val / avg, 2) if avg > 0 else 1.0
            pct = round((feature_weights[key] / denom) * 100.0, 1)

            expl = f"{multiplier}x compared to network baseline ({val:.1f} vs avg {avg:.1f})"

            contributions.append({
                "feature_name": key,
                "feature_label": FEATURE_LABELS.get(key, key),
                "account_value": round(val, 2),
                "avg_value": round(avg, 2),
                "multiplier": multiplier,
                "contribution_percentage": pct,
                "explanation": expl
            })

        # Sort contributions by weight descending
        contributions.sort(key=lambda c: c["contribution_percentage"], reverse=True)

        # Generate specific human-readable reasons
        tx_freq = feat.get("transaction_frequency", 0)
        avg_freq = self.population_means.get("transaction_frequency", 1.0)
        if tx_freq > avg_freq * 2.0:
            mult = round(tx_freq / avg_freq, 1)
            reasons.append(f"Transaction frequency is {mult}× above normal baseline")

        night_ratio = feat.get("night_transaction_ratio", 0.0)
        if night_ratio > 0.35:
            reasons.append(f"{int(night_ratio * 100)}% of transactions occurred during unusual night hours (10 PM - 5 AM)")

        flagged_conn = feat.get("flagged_account_connections", 0)
        if flagged_conn > 0:
            reasons.append(f"Direct financial link to {flagged_conn} flagged cybercrime account{'s' if flagged_conn > 1 else ''}")

        rapid_count = feat.get("rapid_transaction_count", 0)
        if rapid_count >= 3:
            reasons.append(f"{rapid_count} rapid velocity burst transactions (<10m spacing) detected")

        avg_amt = feat.get("average_transaction_amount", 0.0)
        pop_avg_amt = self.population_means.get("average_transaction_amount", 1.0)
        if avg_amt > pop_avg_amt * 2.5:
            reasons.append(f"Average transaction amount (₹{avg_amt:,.0f}) is significantly above peers (₹{pop_avg_amt:,.0f})")

        cashout_freq = feat.get("cashout_frequency", 0)
        if cashout_freq >= 4:
            reasons.append(f"High-frequency ATM withdrawal pattern ({cashout_freq} cash-outs) indicative of layering/cashing out")

        if not reasons:
            reasons.append("Account behavior matches standard peer baseline with low variance.")

        return contributions, reasons
