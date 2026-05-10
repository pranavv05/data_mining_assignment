import itertools
import json
import sys
from collections import defaultdict
from pathlib import Path

import networkx as nx

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.taxonomy import load_taxonomy
from backend.extraction import batch_extract

# ── co-occurrence graph ───────────────────────────────────────────────────────

def build_resume_graph(candidates: list) -> nx.Graph:
    """
    Build a skill co-occurrence graph from batch_extract output.

    Nodes  — every skill that appears at least once, with attributes:
               domain     : taxonomy domain string
               frequency  : number of resumes containing this skill
    Edges  — two skills that appear together in at least one resume, with:
               weight     : number of resumes they co-occur in
    """
    G = nx.Graph()

    # First pass: skill frequencies and domain assignment
    freq: defaultdict[str, int] = defaultdict(int)
    domain_map: dict[str, str] = {}

    for c in candidates:
        for domain, skills in c["skills_by_domain"].items():
            for skill in skills:
                freq[skill] += 1
                domain_map[skill] = domain

    for skill, count in freq.items():
        G.add_node(skill, domain=domain_map[skill], frequency=count)

    # Second pass: co-occurrence edges
    for c in candidates:
        skill_set = {
            skill
            for skills in c["skills_by_domain"].values()
            for skill in skills
        }
        for s1, s2 in itertools.combinations(skill_set, 2):
            if G.has_edge(s1, s2):
                G[s1][s2]["weight"] += 1
            else:
                G.add_edge(s1, s2, weight=1)

    return G


# ── knowledge graph ───────────────────────────────────────────────────────────

def build_knowledge_graph(taxonomy: dict) -> nx.DiGraph:
    """
    Build a typed directed graph from the taxonomy dict.

    Nodes  — domain names (node_type='domain')
             skill names  (node_type='skill', domain=<parent>)
    Edges  — skill → domain  : edge_type='belongs_to'
             skill → skill   : edge_type='related_to'  (same domain, both
                               directions so successors work from either end)
    """
    G = nx.DiGraph()

    for domain, skills in taxonomy.items():
        G.add_node(domain, node_type="domain")

        for skill in skills:
            G.add_node(skill, node_type="skill", domain=domain)
            G.add_edge(skill, domain, edge_type="belongs_to")

        for s1, s2 in itertools.combinations(skills, 2):
            G.add_edge(s1, s2, edge_type="related_to")
            G.add_edge(s2, s1, edge_type="related_to")

    return G


# ── analytics helpers ─────────────────────────────────────────────────────────

def get_graph_stats(G: nx.Graph | nx.DiGraph) -> dict:
    """
    Returns:
      num_nodes, num_edges,
      top_10_skills  (by degree centrality, domain nodes excluded),
      most_connected_domains (by summed degree of member skills, top 5)
    """
    centrality = nx.degree_centrality(G)

    # top-10 skills only (exclude domain nodes that appear in knowledge graph)
    skill_centrality = {
        n: v
        for n, v in centrality.items()
        if G.nodes[n].get("node_type") != "domain"
    }
    top_10 = sorted(skill_centrality, key=skill_centrality.get, reverse=True)[:10]

    # aggregate degree by domain
    domain_degree: defaultdict[str, int] = defaultdict(int)
    for node, data in G.nodes(data=True):
        domain = data.get("domain")
        if domain:
            domain_degree[domain] += G.degree(node)

    top_domains = sorted(domain_degree, key=domain_degree.get, reverse=True)[:5]

    return {
        "num_nodes": G.number_of_nodes(),
        "num_edges": G.number_of_edges(),
        "top_10_skills": top_10,
        "most_connected_domains": top_domains,
    }


def graph_to_dict(G: nx.Graph | nx.DiGraph) -> dict:
    """
    Serialise graph to plain dicts for FastAPI / D3.js consumption.
    Nodes: [{id, domain, frequency, node_type}]
    Edges: [{source, target, weight, edge_type}]
    """
    nodes = [
        {
            "id":        node,
            "domain":    data.get("domain", ""),
            "frequency": data.get("frequency", 0),
            "node_type": data.get("node_type", "skill"),
        }
        for node, data in G.nodes(data=True)
    ]

    edges = [
        {
            "source":    u,
            "target":    v,
            "weight":    data.get("weight", 1),
            "edge_type": data.get("edge_type", "co_occurs"),
        }
        for u, v, data in G.edges(data=True)
    ]

    return {"nodes": nodes, "edges": edges}


# ── smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pandas as pd

    DATA = Path(__file__).parent / "data"

    # ── 1. Co-occurrence graph from first 100 resumes ─────────────────────────
    print("=" * 62)
    print("Co-occurrence graph — 100 resumes")
    print("=" * 62)

    resumes = pd.read_csv(DATA / "training_data.csv")
    candidates = batch_extract(resumes.head(100), "Resume Text")
    resume_G = build_resume_graph(candidates)

    stats = get_graph_stats(resume_G)
    print(f"  nodes            : {stats['num_nodes']}")
    print(f"  edges            : {stats['num_edges']}")
    print(f"  top-10 skills    : {stats['top_10_skills']}")
    print(f"  top domains      : {stats['most_connected_domains']}")

    # ── 2. Knowledge graph from taxonomy ─────────────────────────────────────
    print("\n" + "=" * 62)
    print("Knowledge graph — full taxonomy")
    print("=" * 62)

    taxonomy = load_taxonomy()
    kg = build_knowledge_graph(taxonomy)

    kstats = get_graph_stats(kg)
    print(f"  nodes            : {kstats['num_nodes']}")
    print(f"  edges            : {kstats['num_edges']}")
    print(f"  top-10 skills    : {kstats['top_10_skills']}")
    print(f"  top domains      : {kstats['most_connected_domains']}")

    # ── 3. JSON serialisability check ────────────────────────────────────────
    print("\n" + "=" * 62)
    print("graph_to_dict — JSON serialisability")
    print("=" * 62)

    for label, G in [("co-occurrence", resume_G), ("knowledge", kg)]:
        gd = graph_to_dict(G)
        blob = json.dumps(gd)          # raises if not serialisable
        print(f"  {label:<16} nodes={len(gd['nodes']):>4}  "
              f"edges={len(gd['edges']):>5}  "
              f"json_bytes={len(blob):>7}")
