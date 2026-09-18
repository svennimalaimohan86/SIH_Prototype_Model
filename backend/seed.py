import random
import datetime
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models import Account, ATMLocation, Transaction, FraudComplaint, Alert

INDIAN_FIRST_NAMES = [
    "Aarav", "Dinesh", "Krishna", "Vikram", "Ramesh", "Priya", "Sneha", "Ananya", "Rajesh",
    "Suresh", "Kavita", "Deepak", "Arvind", "Manoj", "Sanjay", "Meera", "Pooja", "Rahul",
    "Aditya", "Rohan", "Siddharth", "Gautam", "Varun", "Ashwin", "Divya", "Karthik",
    "Naveen", "Harish", "Preeti", "Sunil", "Amit", "Manish", "Swati", "Neha", "Vignesh"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Kumar", "Patel", "Singh", "Reddy", "Nair", "Iyer", "Rao", "Menon",
    "Verma", "Pillai", "Gupta", "Deshmukh", "Joshi", "Mohan", "Sundaram", "Murugan",
    "Swamy", "Natarajan", "Bose", "Das", "Choudhury", "Bhatt", "Chauhan"
]

TAMILNADU_CITIES = [
    "Tiruchengode", "Erode", "Salem", "Coimbatore", "Chennai", "Namakkal", "Karur", "Madurai"
]

ATM_SEEDS = [
    # Tiruchengode
    {"name": "SBI ATM - Bus Stand Hub", "location": "Near Central Bus Terminus, Tiruchengode", "lat": 11.3798, "lng": 77.8945, "city": "Tiruchengode", "risk": "HIGH"},
    {"name": "HDFC ATM - South Car Street", "location": "South Car St, Opp Temple Entrance, Tiruchengode", "lat": 11.3820, "lng": 77.8980, "city": "Tiruchengode", "risk": "MEDIUM"},
    {"name": "ICICI Bank ATM - Velur Road", "location": "Velur Road, Tiruchengode", "lat": 11.3750, "lng": 77.8920, "city": "Tiruchengode", "risk": "LOW"},
    {"name": "Axis Bank ATM - Sankari Main Rd", "location": "Sankari Main Road, Tiruchengode", "lat": 11.3855, "lng": 77.9010, "city": "Tiruchengode", "risk": "HIGH"},

    # Erode
    {"name": "Canara ATM - Perundurai Road", "location": "Perundurai Rd, Collectorate Junction, Erode", "lat": 11.3360, "lng": 77.7120, "city": "Erode", "risk": "HIGH"},
    {"name": "Bank of Baroda - Railway Station", "location": "Platform 1 Exit, Erode Junction", "lat": 11.3280, "lng": 77.7290, "city": "Erode", "risk": "HIGH"},
    {"name": "IndusInd ATM - Brough Road", "location": "Brough Road Commercial Market, Erode", "lat": 11.3435, "lng": 77.7215, "city": "Erode", "risk": "MEDIUM"},
    {"name": "Kotak ATM - Gandhiji Road", "location": "Gandhiji Road, Erode", "lat": 11.3412, "lng": 77.7240, "city": "Erode", "risk": "LOW"},
    {"name": "PNB ATM - PS Park", "location": "PS Park Circle, Erode", "lat": 11.3450, "lng": 77.7280, "city": "Erode", "risk": "MEDIUM"},

    # Salem
    {"name": "SBI ATM - New Bus Stand", "location": "Meyyanur Bypass Rd, Salem", "lat": 11.6685, "lng": 78.1340, "city": "Salem", "risk": "HIGH"},
    {"name": "HDFC ATM - Junction Road", "location": "Junction Main Road, Suramangalam, Salem", "lat": 11.6620, "lng": 78.1180, "city": "Salem", "risk": "HIGH"},
    {"name": "Indian Bank ATM - Fairlands", "location": "Fairlands Main Road, Salem", "lat": 11.6740, "lng": 78.1450, "city": "Salem", "risk": "LOW"},
    {"name": "Union Bank ATM - Four Roads", "location": "Four Roads Junction, Salem", "lat": 11.6580, "lng": 78.1520, "city": "Salem", "risk": "MEDIUM"},
    {"name": "Axis ATM - Gugai Market", "location": "Gugai Commercial Street, Salem", "lat": 11.6420, "lng": 78.1560, "city": "Salem", "risk": "HIGH"},

    # Coimbatore
    {"name": "SBI InTouch ATM - Gandhipuram", "location": "Cross Cut Road, Gandhipuram, Coimbatore", "lat": 11.0180, "lng": 76.9670, "city": "Coimbatore", "risk": "HIGH"},
    {"name": "HDFC ATM - RS Puram", "location": "DB Road, RS Puram, Coimbatore", "lat": 11.0090, "lng": 76.9480, "city": "Coimbatore", "risk": "LOW"},
    {"name": "ICICI ATM - Peelamedu Tech Park", "location": "Avinashi Road, Peelamedu, Coimbatore", "lat": 11.0280, "lng": 77.0030, "city": "Coimbatore", "risk": "MEDIUM"},
    {"name": "Axis ATM - Ukkadam Transit Hub", "location": "Near Ukkadam Bus Depot, Coimbatore", "lat": 10.9890, "lng": 76.9620, "city": "Coimbatore", "risk": "HIGH"},
    {"name": "Canara ATM - Town Hall", "location": "Opp Clock Tower, Town Hall, Coimbatore", "lat": 10.9980, "lng": 76.9610, "city": "Coimbatore", "risk": "MEDIUM"},

    # Namakkal & Karur
    {"name": "SBI ATM - Mohanur Road", "location": "Mohanur Road, Namakkal", "lat": 11.2150, "lng": 78.1630, "city": "Namakkal", "risk": "MEDIUM"},
    {"name": "Indian Overseas Bank - Bus Stand", "location": "Trichy Road, Namakkal", "lat": 11.2220, "lng": 78.1690, "city": "Namakkal", "risk": "HIGH"},
    {"name": "KVB ATM - Kovai Road", "location": "Kovai Road, Karur", "lat": 10.9570, "lng": 78.0720, "city": "Karur", "risk": "MEDIUM"},
    {"name": "HDFC ATM - Jawahar Bazaar", "location": "Jawahar Bazaar Textile Market, Karur", "lat": 10.9630, "lng": 78.0810, "city": "Karur", "risk": "HIGH"},

    # Chennai
    {"name": "SBI ATM - T. Nagar Usman Rd", "location": "South Usman Road, T. Nagar, Chennai", "lat": 13.0410, "lng": 80.2330, "city": "Chennai", "risk": "HIGH"},
    {"name": "HDFC ATM - Anna Nagar Roundtana", "location": "2nd Avenue, Anna Nagar, Chennai", "lat": 13.0850, "lng": 80.2120, "city": "Chennai", "risk": "MEDIUM"},
    {"name": "ICICI ATM - OMR Thoraipakkam", "location": "OMR IT Corridor, Thoraipakkam, Chennai", "lat": 12.9420, "lng": 80.2370, "city": "Chennai", "risk": "LOW"},
    {"name": "Axis ATM - Central Railway Station", "location": "Moore Market Complex, Chennai Central", "lat": 13.0820, "lng": 80.2750, "city": "Chennai", "risk": "HIGH"},
    {"name": "Canara ATM - Koyambedu Market", "location": "Wholesale Market Complex, Koyambedu, Chennai", "lat": 13.0690, "lng": 80.1910, "city": "Chennai", "risk": "HIGH"},
    {"name": "Kotak ATM - Adyar Gateway", "location": "Sardar Patel Road, Adyar, Chennai", "lat": 13.0060, "lng": 80.2570, "city": "Chennai", "risk": "LOW"},
    {"name": "Bank of India - Mylapore Tank", "location": "North Mada Street, Mylapore, Chennai", "lat": 13.0330, "lng": 80.2690, "city": "Chennai", "risk": "MEDIUM"}
]

def seed_database():
    # Recreate tables cleanly
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Clear existing data to ensure idempotent clean seed
    db.query(Alert).delete()
    db.query(FraudComplaint).delete()
    db.query(Transaction).delete()
    db.query(ATMLocation).delete()
    db.query(Account).delete()
    db.commit()

    print("🌱 Seeding ATM Locations...")
    created_atms = []
    for atm_data in ATM_SEEDS:
        atm = ATMLocation(
            name=atm_data["name"],
            location=atm_data["location"],
            latitude=atm_data["lat"],
            longitude=atm_data["lng"],
            city=atm_data["city"],
            risk_level=atm_data["risk"]
        )
        db.add(atm)
        created_atms.append(atm)
    db.commit()

    print("🌱 Seeding 200 Accounts...")
    random.seed(42)
    accounts = []
    
    # Pre-select 16 suspicious account IDs
    suspicious_ids = set([12, 27, 45, 68, 88, 103, 114, 127, 139, 145, 156, 172, 185, 191, 198, 200])

    for i in range(1, 201):
        first = random.choice(INDIAN_FIRST_NAMES)
        last = random.choice(INDIAN_LAST_NAMES)
        name = f"{first} {last}"
        if i == 127:
            name = "Dinesh M"  # Reference image protagonist
        elif i == 145:
            name = "Vignesh Sundaram"
        elif i == 103:
            name = "Apex Global Traders (LLP)"
        elif i == 88:
            name = "Karthik Raja"

        is_suspicious = i in suspicious_ids
        is_flagged = i in [127, 103, 88, 145, 27, 172]
        
        acc_type = "CURRENT" if (is_suspicious and i % 3 == 0) else random.choice(["SAVINGS", "SAVINGS", "CURRENT", "SALARY"])
        city = random.choice(TAMILNADU_CITIES)
        if i in [127, 145, 88]:
            city = "Tiruchengode"
        elif i in [103, 12]:
            city = "Erode"

        acc = Account(
            id=i,
            account_number=f"NX-{i:05d}",
            name=name,
            account_type=acc_type,
            balance=float(random.randint(15000, 350000) if not is_suspicious else random.randint(350000, 2400000)),
            city=city,
            created_at=datetime.datetime(2025, random.randint(1, 12), random.randint(1, 28)),
            is_flagged=is_flagged
        )
        db.add(acc)
        accounts.append(acc)

    db.commit()

    print("🌱 Seeding Fraud Complaints...")
    complaints_data = [
        {"acc_id": 127, "comp_num": "NCRP-2026-90412", "desc": "Part-time job Telegram investment scam, victim transferred funds to this mule account", "amt": 485000.0, "status": "INVESTIGATING"},
        {"acc_id": 103, "comp_num": "NCRP-2026-88129", "desc": "Fake customs clearance cyber extortion, proceeds layered into corporate current account", "amt": 1250000.0, "status": "CONFIRMED_FRAUD"},
        {"acc_id": 88, "comp_num": "NCRP-2026-91304", "desc": "Electricity bill disconnection phishing link - unauthorized IMPS withdrawal", "amt": 98000.0, "status": "INVESTIGATING"},
        {"acc_id": 145, "comp_num": "NCRP-2026-92015", "desc": "Digital arrest intimidation scheme - senior citizen coerced transfer", "amt": 650000.0, "status": "INVESTIGATING"},
        {"acc_id": 172, "comp_num": "NCRP-2026-87941", "desc": "Loan app blackmail and rapid layering through intermediary UPI handles", "amt": 220000.0, "status": "CONFIRMED_FRAUD"},
        {"acc_id": 27, "comp_num": "NCRP-2026-93400", "desc": "Crypto arbitrage trading syndicate account - reported by FIU-IND", "amt": 890000.0, "status": "INVESTIGATING"}
    ]

    for c in complaints_data:
        complaint = FraudComplaint(
            complaint_number=c["comp_num"],
            account_id=c["acc_id"],
            description=c["desc"],
            amount=c["amt"],
            reported_at=datetime.datetime(2026, 8, random.randint(10, 28), 11, 30),
            status=c["status"]
        )
        db.add(complaint)
    db.commit()

    print("🌱 Seeding ~1,000 Transactions (Chains, Funnels, and Normal Traffic)...")
    transactions = []
    base_time = datetime.datetime(2026, 9, 1, 0, 0, 0)

    # 1. Realistic Multi-Hop Layering Chain:
    # NX-00127 -> NX-00145 -> NX-00034 -> NX-00088 -> ATM Cashout
    chain_time = base_time + datetime.timedelta(days=12, hours=23, minutes=15) # night time!
    
    # Hop 1
    transactions.append(Transaction(
        sender_account_id=127, receiver_account_id=145, amount=195000.0,
        transaction_type="IMPS", timestamp=chain_time
    ))
    # Hop 2 (5 mins later - rapid burst)
    transactions.append(Transaction(
        sender_account_id=145, receiver_account_id=34, amount=185000.0,
        transaction_type="TRANSFER", timestamp=chain_time + datetime.timedelta(minutes=4)
    ))
    # Hop 3 (3 mins later)
    transactions.append(Transaction(
        sender_account_id=34, receiver_account_id=88, amount=180000.0,
        transaction_type="IMPS", timestamp=chain_time + datetime.timedelta(minutes=7)
    ))
    # Hop 4: Cash-out at Tiruchengode SBI Bus Stand ATM (ID 1)
    transactions.append(Transaction(
        sender_account_id=88, receiver_account_id=None, amount=40000.0,
        transaction_type="ATM_WITHDRAWAL", timestamp=chain_time + datetime.timedelta(minutes=15), atm_id=1
    ))
    transactions.append(Transaction(
        sender_account_id=88, receiver_account_id=None, amount=40000.0,
        transaction_type="ATM_WITHDRAWAL", timestamp=chain_time + datetime.timedelta(minutes=18), atm_id=1
    ))

    # 2. Branching Funnel Pattern (Smurfing):
    # NX-00012 funneling to NX-00015, NX-00018, NX-00022 -> consolidated to NX-00103
    funnel_time = base_time + datetime.timedelta(days=14, hours=1, minutes=30) # 1:30 AM
    for sub_id in [15, 18, 22]:
        transactions.append(Transaction(
            sender_account_id=12, receiver_account_id=sub_id, amount=75000.0,
            transaction_type="IMPS", timestamp=funnel_time + datetime.timedelta(minutes=random.randint(1, 8))
        ))
        transactions.append(Transaction(
            sender_account_id=sub_id, receiver_account_id=103, amount=74000.0,
            transaction_type="RTGS", timestamp=funnel_time + datetime.timedelta(minutes=random.randint(9, 18))
        ))

    # Multiple ATM cashouts for NX-00103 in Erode
    for _ in range(4):
        transactions.append(Transaction(
            sender_account_id=103, receiver_account_id=None, amount=50000.0,
            transaction_type="ATM_WITHDRAWAL", timestamp=funnel_time + datetime.timedelta(hours=random.randint(1, 3)), atm_id=5
        ))

    # 3. High-velocity bursts for NX-00127 (Dinesh M)
    burst_time = base_time + datetime.timedelta(days=15, hours=23, minutes=45)
    for k in range(12):
        peer = random.choice([145, 68, 88, 172, 34, 191])
        transactions.append(Transaction(
            sender_account_id=127,
            receiver_account_id=peer,
            amount=float(random.randint(45000, 95000)),
            transaction_type=random.choice(["IMPS", "TRANSFER"]),
            timestamp=burst_time + datetime.timedelta(minutes=k * 4)
        ))

    # 4. Generate high-velocity activity for all suspicious accounts
    for s_id in suspicious_ids:
        s_time = base_time + datetime.timedelta(days=random.randint(5, 16), hours=random.choice([0, 1, 2, 3, 23]))
        for burst_idx in range(random.randint(20, 45)):
            target = random.choice([x for x in suspicious_ids if x != s_id])
            transactions.append(Transaction(
                sender_account_id=s_id,
                receiver_account_id=target,
                amount=float(random.randint(35000, 150000)),
                transaction_type=random.choice(["IMPS", "TRANSFER", "RTGS"]),
                timestamp=s_time + datetime.timedelta(minutes=burst_idx * random.randint(2, 6))
            ))

        # ATM cashouts
        atm_choice = random.choice([atm.id for atm in created_atms if atm.risk_level in ["HIGH", "MEDIUM"]])
        for _ in range(random.randint(3, 6)):
            transactions.append(Transaction(
                sender_account_id=s_id,
                receiver_account_id=None,
                amount=float(random.choice([20000, 30000, 40000, 50000])),
                transaction_type="ATM_WITHDRAWAL",
                timestamp=s_time + datetime.timedelta(hours=random.randint(1, 4)),
                atm_id=atm_choice
            ))

    # 5. Normal background transactions for regular accounts
    normal_ids = [i for i in range(1, 201) if i not in suspicious_ids]
    while len(transactions) < 1050:
        sender = random.choice(normal_ids)
        receiver = random.choice(normal_ids)
        if sender == receiver:
            continue
        
        # Normal daytime hours: 09:00 - 19:00
        normal_day = random.randint(1, 16)
        normal_hour = random.randint(9, 19)
        normal_min = random.randint(0, 59)
        t_stamp = base_time + datetime.timedelta(days=normal_day, hours=normal_hour, minutes=normal_min)

        is_atm = random.random() < 0.12
        if is_atm:
            atm_id = random.choice([atm.id for atm in created_atms])
            transactions.append(Transaction(
                sender_account_id=sender,
                receiver_account_id=None,
                amount=float(random.choice([500, 1000, 2000, 5000, 10000])),
                transaction_type="ATM_WITHDRAWAL",
                timestamp=t_stamp,
                atm_id=atm_id
            ))
        else:
            transactions.append(Transaction(
                sender_account_id=sender,
                receiver_account_id=receiver,
                amount=float(random.randint(500, 18000)),
                transaction_type=random.choice(["TRANSFER", "IMPS"]),
                timestamp=t_stamp
            ))

    db.add_all(transactions)
    db.commit()

    print("🌱 Seeding High-Priority Cybercrime Alerts...")
    alerts_data = [
        {"acc_id": 127, "type": "HIGH_RISK_ACCOUNT", "sev": "CRITICAL", "reason": "Transaction velocity 3.4× above normal baseline with 61% night-time activity (11 PM - 4 AM)."},
        {"acc_id": 127, "type": "NETWORK_ALERT", "sev": "CRITICAL", "reason": "Direct money flow linkages detected to 3 flagged cybercrime syndicate mule accounts."},
        {"acc_id": 103, "type": "UNUSUAL_ACTIVITY", "sev": "CRITICAL", "reason": "Layered funnel consolidation detected (3 incoming smurf streams merged in 18 minutes)."},
        {"acc_id": 88, "type": "CASH_OUT_ALERT", "sev": "HIGH", "reason": "Rapid back-to-back cash withdrawals at SBI Bus Stand ATM Tiruchengode post fund receipt."},
        {"acc_id": 145, "type": "NETWORK_ALERT", "sev": "HIGH", "reason": "Immediate pass-through transfer of ₹185,000 within 4 minutes of receiving credit from NX-00127."},
        {"acc_id": 172, "type": "HIGH_RISK_ACCOUNT", "sev": "HIGH", "reason": "Repeated sudden high-value RTGS transfers to newly linked accounts across Salem and Karur."},
        {"acc_id": 27, "type": "UNUSUAL_ACTIVITY", "sev": "MEDIUM", "reason": "Abnormal transaction amount variance and high counterparty churn detected."},
        {"acc_id": 191, "type": "CASH_OUT_ALERT", "sev": "HIGH", "reason": "Sequential ATM withdrawals exceeding ₹120,000 in under 30 minutes at Coimbatore Hub."},
        {"acc_id": 68, "type": "NETWORK_ALERT", "sev": "MEDIUM", "reason": "Clustered peer transfers with flagged mule network NX-00127."},
        {"acc_id": 114, "type": "UNUSUAL_ACTIVITY", "sev": "MEDIUM", "reason": "Night-time transaction ratio reached 48% over past 72 hours."}
    ]

    for a in alerts_data:
        alert = Alert(
            account_id=a["acc_id"],
            alert_type=a["type"],
            severity=a["sev"],
            reason=a["reason"],
            created_at=datetime.datetime(2026, 9, 16, random.randint(14, 23), random.randint(10, 50))
        )
        db.add(alert)
    db.commit()

    db.close()
    print(f"✅ Seeding Complete! Seeded 200 Accounts, {len(created_atms)} ATMs, {len(transactions)} Transactions, {len(complaints_data)} Complaints, and {len(alerts_data)} Alerts.")

if __name__ == "__main__":
    seed_database()
