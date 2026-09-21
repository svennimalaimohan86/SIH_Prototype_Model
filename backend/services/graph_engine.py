import networkx as nx
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Set, Tuple

from models import Account, Transaction
from services.risk_engine import get_risk_scores

def build_full_network_graph(db: Session) -> nx.DiGraph:
    G = nx.DiGraph()

    accounts = db.query(Account).all()
    transactions = db.query(Transaction).all()

    for acc in accounts:
        G.add_node(
            str(acc.id),
            account_number=acc.account_number,
            name=acc.name,
            account_type=acc.account_type,
            balance=acc.balance,
            is_flagged=acc.is_flagged,
            city=acc.city
        )

    for tx in transactions:
        if tx.sender_account_id and tx.receiver_account_id and tx.sender_account_id != tx.receiver_account_id:
            u = str(tx.sender_account_id)
            v = str(tx.receiver_account_id)

            if G.has_edge(u, v):
                G[u][v]["amount"] += tx.amount
                G[u][v]["transaction_count"] += 1
            else:
                G.add_edge(
                    u, v,
                    amount=tx.amount,
                    transaction_count=1,
                    transaction_type=tx.transaction_type or "TRANSFER"
                )

    return G

def get_account_subgraph(account_id: int, db: Session, max_nodes: int = 14) -> Dict[str, Any]:
    """
    Extracts a neat, legible money-flow subgraph around the target account.
    Prioritizes primary financial corridors, high-value transfers, and laundering chains
    while eliminating visual noise and redundant cross-edges.
    """
    G = build_full_network_graph(db)
    target_str = str(account_id)

    scores = get_risk_scores(db)
    score_map = {str(s["account_id"]): s for s in scores}

    if target_str not in G:
        acc = db.query(Account).filter(Account.id == account_id).first()
        acc_score = score_map.get(target_str, {})
        return {
            "selected_account_id": target_str,
            "nodes": [{
                "id": target_str,
                "label": acc.account_number if acc else f"NX-{account_id:05d}",
                "name": acc.name if acc else "Unknown",
                "risk_score": acc_score.get("risk_score", 10),
                "risk_level": acc_score.get("risk_level", "LOW"),
                "is_flagged": acc.is_flagged if acc else False,
                "balance": acc.balance if acc else 0.0,
                "account_type": acc.account_type if acc else "SAVINGS"
            }],
            "links": [],
            "total_inflow": 0.0,
            "total_outflow": 0.0
        }

    # Direct 1-hop connections (inflow and outflow)
    direct_out_edges = list(G.out_edges(target_str, data=True))
    direct_in_edges = list(G.in_edges(target_str, data=True))

    # Sort direct edges by amount descending to focus on highest money movements
    direct_out_edges.sort(key=lambda e: e[2].get("amount", 0.0), reverse=True)
    direct_in_edges.sort(key=lambda e: e[2].get("amount", 0.0), reverse=True)

    # Pick top direct counterparties (up to 7 outgoing, up to 4 incoming)
    selected_edges: List[Tuple[str, str, Dict[str, Any]]] = []
    selected_nodes: Set[str] = {target_str}

    for u, v, data in direct_out_edges[:6]:
        selected_edges.append((u, v, data))
        selected_nodes.add(v)

    for u, v, data in direct_in_edges[:4]:
        selected_edges.append((u, v, data))
        selected_nodes.add(u)

    # Now add clean 2-hop forwarding chains from the direct counterparties (e.g., laundering chains)
    direct_neighbors = [n for n in selected_nodes if n != target_str]
    for n1 in direct_neighbors:
        # Find next hop out from n1
        next_hops = list(G.out_edges(n1, data=True))
        next_hops.sort(key=lambda e: e[2].get("amount", 0.0), reverse=True)
        for u, v, data in next_hops:
            if v != target_str and v not in selected_nodes:
                if len(selected_nodes) < max_nodes:
                    selected_edges.append((u, v, data))
                    selected_nodes.add(v)
                    break  # keep only the single strongest outbound path per hop to avoid hairballs!

    # Build clean node records
    nodes_list = []
    for node_id in selected_nodes:
        node_attr = G.nodes.get(node_id, {})
        s_info = score_map.get(node_id, {})
        r_score = s_info.get("risk_score", 20)
        r_level = s_info.get("risk_level", "LOW")

        nodes_list.append({
            "id": node_id,
            "label": node_attr.get("account_number", f"NX-{int(node_id):05d}"),
            "name": node_attr.get("name", "Account Holder"),
            "risk_score": r_score,
            "risk_level": r_level,
            "is_flagged": node_attr.get("is_flagged", False) or (r_score >= 70),
            "balance": float(node_attr.get("balance", 0.0)),
            "account_type": node_attr.get("account_type", "SAVINGS")
        })

    # Sort nodes so target is first
    nodes_list.sort(key=lambda n: 0 if n["id"] == target_str else (100 - n["risk_score"]))

    # Build clean link records with incremental timeline progression (0 to 150 mins)
    links_list = []
    total_inflow = 0.0
    total_outflow = 0.0

    # Base forensic timeline start: 17 Sept 2026, 10:00 AM
    from datetime import datetime, timedelta
    base_time = datetime(2026, 9, 17, 10, 0, 0)

    # Sort selected edges to ensure sequential forensic progression:
    # 1. Inflow into target (Victim/Feeder -> Target Mule) [T+00:00 to 00:25]
    # 2. Outflow from target (Target Mule -> Secondary Mules) [T+00:30 to 01:10]
    # 3. Secondary hops (Secondary Mules -> Terminal/ATM/Cashouts) [T+01:15 to 02:30]
    
    inflow_edges = []
    outflow_edges = []
    secondary_edges = []

    for u, v, data in selected_edges:
        if v == target_str:
            inflow_edges.append((u, v, data))
        elif u == target_str:
            outflow_edges.append((u, v, data))
        else:
            secondary_edges.append((u, v, data))

    # Assign sequential timeline offsets
    current_offset = 5.0

    for i, (u, v, data) in enumerate(inflow_edges):
        amt = float(data.get("amount", 0.0))
        tx_count = int(data.get("transaction_count", 1))
        tx_type = data.get("transaction_type", "IMPS")
        total_inflow += amt

        # Spread inflow within first 25 minutes
        offset = round(current_offset + i * 6.5, 1)
        tx_time = (base_time + timedelta(minutes=offset)).strftime("%Y-%m-%d %H:%M:%S")

        source_acc = G.nodes.get(u, {})
        source_name = source_acc.get("name", f"Account NX-{u}")

        links_list.append({
            "source": u,
            "target": v,
            "amount": amt,
            "transaction_count": tx_count,
            "transaction_type": tx_type,
            "timestamp": tx_time,
            "time_offset_minutes": offset,
            "hop_layer": 1,
            "narration": f"Unauthorized {tx_type} inflow from {source_name} into primary target (₹{amt:,.0f})"
        })

    current_offset = 32.0
    for i, (u, v, data) in enumerate(outflow_edges):
        amt = float(data.get("amount", 0.0))
        tx_count = int(data.get("transaction_count", 1))
        tx_type = data.get("transaction_type", "IMPS")
        total_outflow += amt

        # Spread outflow between 30 and 70 minutes
        offset = round(current_offset + i * 8.0, 1)
        tx_time = (base_time + timedelta(minutes=offset)).strftime("%Y-%m-%d %H:%M:%S")

        dest_acc = G.nodes.get(v, {})
        dest_name = dest_acc.get("name", f"Account NX-{v}")

        links_list.append({
            "source": u,
            "target": v,
            "amount": amt,
            "transaction_count": tx_count,
            "transaction_type": tx_type,
            "timestamp": tx_time,
            "time_offset_minutes": offset,
            "hop_layer": 2,
            "narration": f"Rapid velocity fan-out burst to Layer 1 Mule: {dest_name} (₹{amt:,.0f})"
        })

    current_offset = 78.0
    for i, (u, v, data) in enumerate(secondary_edges):
        amt = float(data.get("amount", 0.0))
        tx_count = int(data.get("transaction_count", 1))
        tx_type = data.get("transaction_type", "ATM_WITHDRAWAL" if i % 2 == 1 else "IMPS")

        # Spread secondary hops between 75 and 145 minutes
        offset = round(current_offset + i * 14.0, 1)
        if offset > 148.0:
            offset = 148.0
        tx_time = (base_time + timedelta(minutes=offset)).strftime("%Y-%m-%d %H:%M:%S")

        dest_acc = G.nodes.get(v, {})
        dest_name = dest_acc.get("name", f"Terminal / Node NX-{v}")

        layer_tag = 3 if offset < 110 else 4
        action_name = "Secondary smurfing split" if layer_tag == 3 else "ATM Cash-out / Liquidation"

        links_list.append({
            "source": u,
            "target": v,
            "amount": amt,
            "transaction_count": tx_count,
            "transaction_type": tx_type,
            "timestamp": tx_time,
            "time_offset_minutes": offset,
            "hop_layer": layer_tag,
            "narration": f"{action_name} at {dest_name} (₹{amt:,.0f})"
        })

    # Sort all links strictly by chronological time offset
    links_list.sort(key=lambda x: x["time_offset_minutes"])

    return {
        "selected_account_id": target_str,
        "nodes": nodes_list,
        "links": links_list,
        "total_inflow": total_inflow,
        "total_outflow": total_outflow
    }

