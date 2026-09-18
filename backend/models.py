import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    account_type = Column(String(64), default="SAVINGS")
    balance = Column(Float, default=50000.0)
    city = Column(String(64), default="Chennai")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_flagged = Column(Boolean, default=False)

    # Relationships
    sent_transactions = relationship("Transaction", foreign_keys="[Transaction.sender_account_id]", back_populates="sender")
    received_transactions = relationship("Transaction", foreign_keys="[Transaction.receiver_account_id]", back_populates="receiver")
    fraud_complaints = relationship("FraudComplaint", back_populates="account")
    alerts = relationship("Alert", back_populates="account")


class ATMLocation(Base):
    __tablename__ = "atm_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(256), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city = Column(String(64), nullable=False)
    risk_level = Column(String(16), default="LOW")  # LOW, MEDIUM, HIGH

    transactions = relationship("Transaction", back_populates="atm")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    receiver_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(32), default="TRANSFER")  # TRANSFER, ATM_WITHDRAWAL, DEPOSIT, IMPS, RTGS
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    atm_id = Column(Integer, ForeignKey("atm_locations.id"), nullable=True)

    # Relationships
    sender = relationship("Account", foreign_keys=[sender_account_id], back_populates="sent_transactions")
    receiver = relationship("Account", foreign_keys=[receiver_account_id], back_populates="received_transactions")
    atm = relationship("ATMLocation", back_populates="transactions")


class FraudComplaint(Base):
    __tablename__ = "fraud_complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_number = Column(String(64), unique=True, index=True, nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(32), default="INVESTIGATING")  # PENDING, INVESTIGATING, CONFIRMED_FRAUD, CLOSED

    account = relationship("Account", back_populates="fraud_complaints")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    alert_type = Column(String(64), nullable=False)  # HIGH_RISK_ACCOUNT, NETWORK_ALERT, UNUSUAL_ACTIVITY, CASH_OUT_ALERT
    severity = Column(String(16), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    account = relationship("Account", back_populates="alerts")
