# Nexora — Predictive Intelligence System for Cybercrime Financial Investigation
### Smart India Hackathon (SIH 2026) Prototype

**Nexora** is an end-to-end cybercrime financial intelligence and investigative platform designed to combat mule accounts, smurfing networks, and rapid layering schemes. Built specifically for financial cybercrime investigative teams, law enforcement agencies, and cyber cells, Nexora unites **Unsupervised Machine Learning (IsolationForest)**, **Network Graph Theory (NetworkX)**, and **Geospatial Intelligence (Leaflet / OpenStreetMap)** into a unified, explainable interface.

---

## 📸 Design Philosophy & Aesthetic
Nexora adheres directly to modern intelligence dashboard design standards:
- **Soft Lavender / Slate Shell**: `#F1EDFD` pastel sidebar navigation, badge icons, and live status indicator cards.
- **Top Command Header**: Real-time investigation clock (`17 Sept 2026`), global `⌘ K` search bar, alert bell, and investigator profile badge (`Krishna S • Lead Investigator ID: 21`).
- **Elevated White Cards**: Rounded (`rounded-2xl` / `rounded-3xl`) cards on a light canvas (`#F8F9FE`), subtle borders, and color-coded risk pills.
- **Geospatial View**: High-fidelity OpenStreetMap dashboard with risk-clustered ATM terminals and time-window predictions.

---

## 🏗 System Architecture

```text
Synthetic Financial Data (200 Accounts, 1000+ Transactions, 30 ATMs)
                             ↓
              Feature Engineering & Aggregation
     (Velocity, Night Activity, Rapid Bursts, Flagged Links)
                             ↓
             IsolationForest Anomaly Scoring (0–100)
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
Explainable AI (XAI)  NetworkX Subgraphs   Heuristic Cash-out
(Contribution Bars)   (Money-Flow Paths)   (ATM Location & Time)
        └────────────────────┬────────────────────┘
                             ↓
              Investigator Dashboard & Geo Map
```

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (custom lavender, brand, and risk palettes)
- **Icons**: Lucide React
- **Graph Visualization**: `react-force-graph-2d` (HTML5 Canvas directed particle flow)
- **Geospatial Mapping**: Leaflet & `react-leaflet` with OpenStreetMap cartography
- **Routing & Networking**: React Router v6 + Axios

### Backend
- **Framework**: Python 3.10+ & FastAPI (ASGI)
- **Server**: Uvicorn
- **Database**: SQLite with SQLAlchemy ORM
- **Machine Learning**: `scikit-learn` (`IsolationForest`) + `numpy`
- **Graph Analysis**: `NetworkX` (DiGraph ego-subgraphs)
- **Data Validation**: Pydantic v2

---

## 📂 Project Structure

```text
nexora/
├── backend/
│   ├── database.py               # SQLite engine & session setup
│   ├── models.py                 # SQLAlchemy ORM (Account, Transaction, ATM, Complaint, Alert)
│   ├── schemas.py                # Pydantic v2 validation models
│   ├── seed.py                   # Realistic synthetic data seeder (chains, funnels, bursts)
│   ├── requirements.txt          # Python library dependencies
│   │
│   ├── ml/
│   │   └── anomaly_model.py      # IsolationForest training, 0-100 calibration, feature weights
│   │
│   ├── services/
│   │   ├── risk_engine.py        # Feature extraction & caching
│   │   ├── graph_engine.py       # NetworkX directed subgraph extraction
│   │   ├── prediction_engine.py  # Transparent heuristic ATM cash-out predictor
│   │   └── alert_engine.py       # Alert generator & dashboard KPI aggregator
│   │
│   ├── routes/
│   │   ├── accounts.py           # GET /accounts/risk-scores, GET /accounts/{id}
│   │   ├── money_flow.py         # GET /accounts/{id}/money-flow
│   │   ├── predictions.py        # GET /predictions/cashout, GET /predictions/atms
│   │   └── alerts.py             # GET /alerts, GET /overview/stats
│   │
│   └── main.py                   # FastAPI app with CORS and automatic on-startup DB seeding
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Soft lavender navigation & status card
│   │   │   ├── Header.tsx        # Search, live clock, alert bell, user chip
│   │   │   ├── MetricCard.tsx    # Elevated KPI card with pastel icon pill
│   │   │   ├── RiskBadge.tsx     # Critical/High/Medium/Low badges
│   │   │   └── ExplainabilityModal.tsx # Root-cause factor modal with progress bars
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # Main table, KPI cards, filters, and XAI modal
│   │   │   ├── MoneyFlow.tsx     # NetworkX directed graph view
│   │   │   ├── GeoIntelligence.tsx # Leaflet OpenStreetMap view with ATM clusters
│   │   │   └── Alerts.tsx        # Real-time cybercrime forensic alert logs
│   │   ├── services/
│   │   │   └── api.ts            # Centralized Axios client
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   ├── App.tsx               # Routing and layout shell
│   │   └── main.tsx              # React mounting
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

---

## 🧪 Machine Learning & Explainable AI (XAI)

### 1. Feature Engineering
For every account in the network, the risk engine calculates 8 behavioral dimensions:
1. `transaction_frequency`: Total transaction volume.
2. `average_transaction_amount`: Mean value of incoming/outgoing transfers.
3. `amount_variance`: Volatility and spread of transfer amounts.
4. `night_transaction_ratio`: Proportion of transactions conducted between 22:00 and 05:00.
5. `unique_connections`: Count of distinct counterparty accounts.
6. `flagged_account_connections`: Direct links to known cybercrime syndicate mules.
7. `rapid_transaction_count`: Burst transactions occurring within <10 minutes of each other.
8. `cashout_frequency`: Number of ATM withdrawals or terminal cash-outs.

### 2. IsolationForest Scoring (0–100)
- The model trains unsupervised on the multidimensional feature matrix (`contamination=0.10`).
- The continuous decision function is inverted and scaled to a 0–100 integer risk rating:
  - **CRITICAL** (85–100): Confirmed syndicate nodes, extreme smurfing bursts, or direct links to flagged complaint accounts.
  - **HIGH** (70–84): High velocity, abnormal night-time ratios, or repeated cash withdrawals.
  - **MEDIUM** (40–69): Moderate volatility or emerging counterparties.
  - **LOW** (0–39): Standard peer baseline.

### 3. Explainability Panel
Instead of a black-box score, clicking any risk score opens an Explainability Panel that provides:
- Exact comparative ratios (e.g. *"Transaction frequency is 3.4× above normal"*).
- Visual feature contribution progress bars indicating what percentage of the anomaly score was driven by velocity vs night activity vs flagged counterparties.
- Natural language forensic trigger notes.

---

## 🌐 NetworkX Money Flow & Cash-Out Prediction

### 1. Directed Subgraph Analysis
- Generates a NetworkX `DiGraph` from all transaction flows.
- For any queried account, extracts an ego-subgraph of 1st and 2nd degree connected counterparties.
- Rendered in HTML5 Canvas via `react-force-graph-2d`:
  - **Red Nodes**: Flagged accounts or high-risk mules.
  - **Orange Nodes**: Medium risk intermediary hops.
  - **Blue/Neutral Nodes**: Standard accounts.
  - **Animated Particles**: Direction and volume of financial movement.

### 2. Heuristic ATM Cash-out Prediction
- Analyzes past ATM withdrawal points, transit velocities, and syndicate terminal clustering in commercial transit hubs (Tiruchengode, Erode, Salem, Coimbatore, Chennai).
- Calculates the Top 3 most probable cash-out terminals, confidence percentage (e.g., 82%), and estimated time window (e.g., `18:00 – 20:00`).

---

## 🚀 Quickstart & Installation Instructions

### Prerequisites
- Python 3.10+ with `pip`
- Node.js 18+ with `npm`

### Step 1: Backend Setup
```bash
cd backend

# (Optional) Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Seed the database (creates 200 accounts, 1000 txns, 30 ATMs)
python3 seed.py

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

### Step 2: Frontend Setup
```bash
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 🎯 SIH 2026 Presentation & Demo Walkthrough

1. **Dashboard Overview (`/`)**:
   - Observe the 4 KPI cards (Total Accounts: 200, High & Critical Risk: ~18, Active Alerts: 10, Predicted Cash-outs: 30).
   - View the ranked suspicious accounts table.
2. **Explainable AI Drill-Down**:
   - Locate Account **`NX-00127` (Dinesh M)** — Risk Score: **94 (CRITICAL)**.
   - Click the risk pill or **"Explain"** button to open the **Explainability Panel**.
   - Review the root-cause metrics (3.4× velocity, 61% night activity, 3 linked mules) and the feature contribution progress bars.
3. **Trace Money Flow (`/money-flow`)**:
   - Click **"Trace Money Flow"** directly from the modal.
   - Observe the interactive NetworkX graph:
     - Notice the linear laundering chain: `NX-00127` → `NX-00145` → `NX-00034` → `NX-00088` (highlighted in red) ending in ATM cash-outs.
     - Hover and click nodes to view counterparty balances and risk scores.
4. **Geospatial Intelligence (`/geo`)**:
   - Click **"Predict Cash-out"** on `NX-00088` or `NX-00127`.
   - The interactive Leaflet OpenStreetMap opens, centered on the predicted ATM locations in Tiruchengode/Erode.
   - Review the top 3 predicted terminals, confidence rating (e.g. 82%), and expected time window (`18:00 – 20:00`).
   - Click the pulsing red ATM marker to view terminal GPS coordinates and cash-out likelihood.
5. **Alerts Feed (`/alerts`)**:
   - View real-time forensic triggers categorized by severity (`CRITICAL`, `HIGH`, `MEDIUM`).

---

## ⚖️ Important Prototype Limitations & Disclaimer

> **Synthetic Data Disclaimer:**
> 1. All account names, transaction amounts, account numbers, and complaint records are **100% synthetically generated** for demonstration purposes.
> 2. No real bank accounts, real personal identifiable information (PII), or real financial institutions are accessed or used.
> 3. Machine learning anomaly scores demonstrate heuristic and IsolationForest outlier detection and do not represent judicial determinations of fraud.
> 4. Cash-out locations are heuristic approximations intended to guide tactical intelligence response during demonstrations.
