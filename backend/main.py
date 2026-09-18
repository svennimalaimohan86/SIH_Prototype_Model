from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database import engine, Base, SessionLocal
from models import Account
from seed import seed_database
from routes import accounts, money_flow, predictions, alerts
from services.risk_engine import get_risk_scores

# Initialize FastAPI App
app = FastAPI(
    title="Nexora — Cybercrime Financial Intelligence API",
    description="Predictive Intelligence & Financial Network Investigation System (SIH 2026)",
    version="1.0.0"
)

# Configure CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(accounts.router)
app.include_router(money_flow.router)
app.include_router(predictions.router)
app.include_router(alerts.router)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Account).count()
        if count == 0:
            print("⚡ No existing data found in SQLite database. Running automatic seed script...")
            seed_database()
        else:
            print(f"✅ Found {count} existing accounts in database. Ready.")
        
        # Warm up IsolationForest model and cache
        print("🧠 Pre-warming IsolationForest anomaly model...")
        get_risk_scores(db)
        print("🚀 Nexora Intelligence API is ready.")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "system": "Nexora Cybercrime Financial Intelligence System",
        "edition": "SIH 2026 Prototype",
        "status": "OPERATIONAL",
        "endpoints": {
            "risk_scores": "/accounts/risk-scores",
            "account_detail": "/accounts/{id}",
            "money_flow": "/accounts/{id}/money-flow",
            "cashout_predictions": "/predictions/cashout?account_id={id}",
            "atms": "/predictions/atms",
            "alerts": "/alerts",
            "overview_stats": "/overview/stats",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
