import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as d3 from "d3";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const domainColors = {
  ml: "#a855f7",
  frontend: "#3b82f6",
  backend: "#06b6d4",
  devops: "#f97316",
  databases: "#eab308",
  soft_skills: "#ec4899",
  algorithms: "#14b8a6",
  data_science: "#8b5cf6",
  default: "#6b7280",
};

const legendDomains = [
  "ml",
  "frontend",
  "backend",
  "devops",
  "databases",
  "soft_skills",
  "algorithms",
  "data_science",
];

function normalizeDomain(domain = "") {
  const normalized = String(domain).trim().toLowerCase().replace(/[\s&-]+/g, "_");
  return domainColors[normalized] ? normalized : "default";
}

function parseSkillString(skillString = "") {
  return new Set(
    String(skillString)
      .split(/[,;|]/)
      .map((skill) => skill.trim())
      .filter(Boolean),
  );
}

function nodeId(node) {
  return typeof node === "object" ? node.id : node;
}

export default function SkillGraph({ candidateId, jdSkillString, missingSkills = [], onSkillClick, height = 560, showLegend = true }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const tooltipRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [status, setStatus] = useState("idle");

  const jdSkills = useMemo(() => parseSkillString(jdSkillString), [jdSkillString]);
  const missingSet = useMemo(() => new Set(missingSkills), [missingSkills]);

  useEffect(() => {
    if (!candidateId) return;

    let active = true;
    setStatus("loading");

    axios
      .post("/api/graph", {
        candidate_id: candidateId,
        jd_skills: Array.from(jdSkills),
      })
      .then((response) => {
        if (!active) return;
        setGraph({
          nodes: response.data?.nodes ?? [],
          edges: response.data?.edges ?? [],
        });
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to post /api/graph", error);
        if (!active) return;
        setGraph({ nodes: [], edges: [] });
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [candidateId, jdSkills]);

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;

    const width = Math.max(wrapRef.current.clientWidth, 320);
    const graphHeight = height;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${graphHeight}`).attr("role", "img").attr("aria-label", "Candidate skill web");

    const usableEdges = graph.edges.filter((edge) => !["belongs_to", "related_to"].includes(edge.edge_type));
    const degree = new Map();

    for (const edge of usableEdges) {
      degree.set(nodeId(edge.source), (degree.get(nodeId(edge.source)) ?? 0) + 1);
      degree.set(nodeId(edge.target), (degree.get(nodeId(edge.target)) ?? 0) + 1);
    }

    const maxDegree = Math.max(1, ...graph.nodes.map((node) => degree.get(node.id) ?? 0));
    const nodes = graph.nodes.map((node) => {
      const d = degree.get(node.id) ?? 0;
      return {
        ...node,
        degree: d,
        radius: 6 + (d / maxDegree) * 14,
        jd_match: jdSkills.has(node.id),
        missing: missingSet.has(node.id),
      };
    });

    const nodeLookup = new Set(nodes.map((node) => node.id));
    const links = usableEdges
      .filter((edge) => nodeLookup.has(nodeId(edge.source)) && nodeLookup.has(nodeId(edge.target)))
      .map((edge) => ({ ...edge }));

    const viewport = svg.append("g");
    const linkLayer = viewport.append("g");
    const nodeLayer = viewport.append("g");
    const tooltip = d3.select(tooltipRef.current);

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.35, 3])
        .on("zoom", (event) => {
          viewport.attr("transform", event.transform);
        }),
    );

    const link = linkLayer
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#1a1a2e")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6);

    const node = nodeLayer
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.missing) return "#ff3366";
        return domainColors[normalizeDomain(d.domain)];
      })
      .attr("fill-opacity", (d) => (d.jd_match || d.missing ? 1 : 0.6))
      .attr("stroke", (d) => {
        if (d.jd_match) return "#ffffff";
        if (d.missing) return "#ffb3c3";
        return "transparent";
      })
      .attr("stroke-width", (d) => (d.jd_match || d.missing ? 2 : 0))
      .attr("stroke-dasharray", (d) => (d.missing ? "4,2" : null))
      .style("color", (d) => (d.missing ? "#ff3366" : domainColors[normalizeDomain(d.domain)]))
      .style("filter", (d) => {
        if (d.missing) return "drop-shadow(0 0 8px rgba(255,51,102,0.9))";
        if (d.jd_match) return "drop-shadow(0 0 6px currentColor)";
        return "none";
      })
      .style("cursor", (d) => (d.missing ? "pointer" : "default"))
      .on("mouseenter", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<div>${d.id}</div><div style="color:#71717a;margin-top:4px;">${d.domain || "default"}</div>`);
      })
      .on("mousemove", (event) => {
        const bounds = wrapRef.current.getBoundingClientRect();
        tooltip.style("left", `${event.clientX - bounds.left + 14}px`).style("top", `${event.clientY - bounds.top + 14}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      })
      .on("click", (_, d) => {
        if (d.missing) onSkillClick?.(d.id);
      })
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .strength(0.3),
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, graphHeight / 2))
      .force("collision", d3.forceCollide().radius((d) => d.radius + 4))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

    return () => {
      simulation.stop();
      svg.on(".zoom", null);
    };
  }, [graph, height, jdSkills, missingSet, onSkillClick]);

  return (
    <Card className="sg-card overflow-hidden">
      <CardHeader className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-mono text-2xl text-white">SKILL_WEB.graph</CardTitle>
            {showLegend && (
              <div className="mt-3 flex flex-wrap gap-3">
                {legendDomains.map((domain) => (
                  <div key={domain} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: domainColors[domain], boxShadow: `0 0 10px ${domainColors[domain]}55` }} />
                    {domain.replace("_", " ")}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            {candidateId ? `CANDIDATE:${candidateId}` : "NO_CANDIDATE"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div
          ref={wrapRef}
          className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-base)]"
          style={{ backgroundImage: "radial-gradient(circle, #1a1a2e 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        >
          <svg ref={svgRef} className="w-full" style={{ height }} />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-20 rounded-md border border-[#00d4ff]/70 bg-[#050508] px-3 py-2 font-mono text-xs text-white opacity-0 shadow-[0_0_18px_rgba(0,212,255,0.18)]"
          />
          {status !== "ready" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#050508]/70 font-mono text-xs uppercase tracking-[0.24em] text-[#00d4ff]">
              {status === "error" ? "GRAPH_UNAVAILABLE" : status === "loading" ? "LOADING_GRAPH" : "SELECT_CANDIDATE"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
