import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── inline styles ──────────────────────────────────────────────────────── */

const S = {
  page: {
    background: "#03030a",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"), radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)`,
    backgroundSize: "200px 200px, 100% 100%",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    color: "#f0f4ff",
    overflowX: "hidden",
  },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  bebas: { fontFamily: "'Bebas Neue', sans-serif" },
  dmSans: { fontFamily: "'DM Sans', sans-serif" },
};

/* ─── keyframes injected once ────────────────────────────────────────────── */

const CSS = `
  html { scroll-behavior: smooth; }

  @keyframes lp-pulse {
    0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(0,255,136,0.4); }
    50%      { opacity:0.6; box-shadow:0 0 0 6px rgba(0,255,136,0); }
  }
  @keyframes lp-scan {
    0%   { left:-100%; }
    100% { left:200%; }
  }
  @keyframes lp-type {
    from { width:0; }
    to   { width:100%; }
  }
  @keyframes lp-fadein {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes lp-fillbar {
    from { width:0%; }
    to   { width:var(--bar-w); }
  }
  @keyframes lp-blink {
    0%,100% { opacity:1; }
    50%     { opacity:0; }
  }
  @keyframes lp-float {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-4px); }
  }

  .lp-headline-scan { position:relative; overflow:hidden; display:inline-block; }
  .lp-headline-scan::after {
    content:'';
    position:absolute;
    top:0; left:-100%; width:60%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);
    animation:lp-scan 3s ease-in-out 0.5s infinite;
  }

  .lp-type-line {
    overflow:hidden; white-space:nowrap; width:0;
    animation:lp-type 1.5s steps(40) forwards;
  }
  .lp-divider-line  { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:1.8s; }
  .lp-row-1         { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:2.0s; }
  .lp-row-2         { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:2.3s; }
  .lp-row-3         { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:2.6s; }
  .lp-row-4         { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:2.9s; }
  .lp-footer-line   { opacity:0; animation:lp-fadein 0.4s ease forwards; animation-delay:3.5s; }

  .lp-bar-1 { --bar-w:94%; animation:lp-fillbar 0.8s ease forwards; animation-delay:2.3s; width:0; }
  .lp-bar-2 { --bar-w:81%; animation:lp-fillbar 0.8s ease forwards; animation-delay:2.6s; width:0; }
  .lp-bar-3 { --bar-w:67%; animation:lp-fillbar 0.8s ease forwards; animation-delay:2.9s; width:0; }
  .lp-bar-4 { --bar-w:43%; animation:lp-fillbar 0.8s ease forwards; animation-delay:3.2s; width:0; }

  .lp-step-num:hover {
    border-color:rgba(0,212,255,0.6) !important;
    background:rgba(0,212,255,0.1) !important;
    box-shadow:0 0 20px rgba(0,212,255,0.2) !important;
  }
  .lp-view-card {
    transition:all 0.3s;
    cursor:default;
  }
  .lp-view-card:hover {
    border-color:rgba(0,212,255,0.3) !important;
    transform:translateY(-4px);
    box-shadow:0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.1) !important;
  }
  .lp-concept-item { transition:opacity 0.3s; }

  .reveal-hidden  { opacity:0; transform:translateY(24px); transition:opacity 0.7s ease, transform 0.7s ease; }
  .reveal-visible { opacity:1; transform:translateY(0); }

  .lp-nav-link {
    font-family:'DM Sans',sans-serif; font-size:14px;
    color:rgba(180,190,220,0.6); text-decoration:none;
    transition:color 0.2s; cursor:pointer; background:none; border:none;
  }
  .lp-nav-link:hover { color:#f0f4ff; }

  .lp-btn-primary {
    padding:15px 36px;
    background:linear-gradient(135deg,#00d4ff 0%,#00ff88 100%);
    color:#03030a;
    font-family:'JetBrains Mono',monospace; font-size:13px;
    font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
    border:none; border-radius:6px; cursor:pointer;
    transition:all 0.2s;
    box-shadow:0 0 0 rgba(0,212,255,0);
  }
  .lp-btn-primary:hover {
    transform:translateY(-2px);
    box-shadow:0 8px 40px rgba(0,212,255,0.35), 0 0 0 1px rgba(0,212,255,0.5);
  }
  .lp-btn-secondary {
    padding:15px 28px;
    background:transparent;
    border:1px solid rgba(255,255,255,0.12);
    color:rgba(180,190,220,0.6);
    font-family:'JetBrains Mono',monospace; font-size:13px;
    letter-spacing:0.08em;
    border-radius:6px; cursor:pointer; transition:all 0.2s;
  }
  .lp-btn-secondary:hover {
    border-color:rgba(0,212,255,0.4);
    color:#f0f4ff;
  }
  .lp-launch-nav {
    border:1px solid rgba(0,212,255,0.4);
    background:transparent; color:#00d4ff;
    font-family:'JetBrains Mono',monospace; font-size:12px;
    padding:8px 20px; border-radius:6px;
    cursor:pointer; margin-left:32px; transition:all 0.2s;
  }
  .lp-launch-nav:hover { background:rgba(0,212,255,0.08); }

  @media (max-width:1280px) {
    .lp-hero { flex-direction:column !important; }
    .lp-hero-left, .lp-hero-right { width:100% !important; padding:60px 40px !important; }
    .lp-pipeline { flex-wrap:wrap !important; }
    .lp-three-grid { grid-template-columns:1fr !important; }
    .lp-concepts-grid { grid-template-columns:1fr !important; }
    .lp-nav  { padding:0 40px !important; }
    .lp-sect { padding:80px 40px !important; }
  }
`;

/* ─── helpers ────────────────────────────────────────────────────────────── */

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove("reveal-hidden");
            e.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

function Navbar({ onLaunch }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className="lp-nav"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: 60, background: "rgba(3,3,10,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? "1px solid rgba(0,212,255,0.1)"
          : "1px solid rgba(255,255,255,0.05)",
        transition: "border-color 0.3s",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ ...S.bebas, fontSize: 22, color: "#f0f4ff", letterSpacing: "0.04em" }}>SkillGraph</span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
        <span style={{ ...S.mono, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>
          NODE://RPG_MARKET_TERMINAL
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <a href="#architecture" className="lp-nav-link">Architecture</a>
        <a href="#views" className="lp-nav-link">Views</a>
        <a href="#research" className="lp-nav-link">Research</a>
        <button className="lp-launch-nav" onClick={onLaunch}>LAUNCH APP →</button>
      </div>
    </nav>
  );
}

function TerminalCard() {
  const rows = [
    { rank: "#01", barClass: "lp-bar-1", barBg: "linear-gradient(90deg,#00d4ff,#00ff88)", score: "0.94", scoreColor: "#00ff88", rowClass: "lp-row-1", grade: "A", gradeBg: "rgba(0,255,136,0.15)", gradeColor: "#00ff88", gradeBorder: "rgba(0,255,136,0.3)" },
    { rank: "#02", barClass: "lp-bar-2", barBg: "linear-gradient(90deg,#00d4ff,#00b8d9)", score: "0.81", scoreColor: "#00d4ff", rowClass: "lp-row-2", grade: "A", gradeBg: "rgba(0,212,255,0.15)", gradeColor: "#00d4ff", gradeBorder: "rgba(0,212,255,0.3)" },
    { rank: "#03", barClass: "lp-bar-3", barBg: "#00d4ff99", score: "0.67", scoreColor: "#00d4ff99", rowClass: "lp-row-3", grade: "B", gradeBg: "rgba(255,184,0,0.15)", gradeColor: "#ffb800", gradeBorder: "rgba(255,184,0,0.3)" },
    { rank: "#04", barClass: "lp-bar-4", barBg: "#00d4ff44", score: "0.43", scoreColor: "rgba(255,255,255,0.3)", rowClass: "lp-row-4", grade: "D", gradeBg: "rgba(255,48,85,0.15)", gradeColor: "#ff3055", gradeBorder: "rgba(255,48,85,0.3)" },
  ];

  return (
    <div style={{
      width: "100%", maxWidth: 480,
      background: "rgba(13,13,26,0.9)",
      border: "1px solid rgba(0,212,255,0.15)",
      borderRadius: 16, padding: 0, overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,255,0.06)",
    }}>
      {/* Header bar */}
      <div style={{
        height: 44, background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
      }}>
        {["#ff3055", "#ffb800", "#00ff88"].map((c) => (
          <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ ...S.mono, fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto", marginRight: "auto" }}>
          SKILLGRAPH_TERMINAL v2.1
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        <div className="lp-type-line" style={{ ...S.mono, fontSize: 12, color: "#00ff88" }}>
          &gt; ANALYZING 4 CANDIDATES AGAINST JD...
        </div>

        <div className="lp-divider-line" style={{ ...S.mono, fontSize: 12, color: "rgba(255,255,255,0.08)", margin: "12px 0" }}>
          ─────────────────────────────
        </div>

        {rows.map((r) => (
          <div key={r.rank} className={r.rowClass} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ ...S.mono, fontSize: 11, color: "rgba(255,255,255,0.3)", width: 28 }}>{r.rank}</span>
            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div className={r.barClass} style={{ height: "100%", borderRadius: 3, background: r.barBg }} />
            </div>
            <span style={{ ...S.mono, fontSize: 12, fontWeight: 700, color: r.scoreColor, width: 36 }}>{r.score}</span>
            <span style={{
              ...S.mono, fontSize: 11,
              padding: "4px 8px", borderRadius: 4,
              background: r.gradeBg, color: r.gradeColor,
              border: `1px solid ${r.gradeBorder}`,
            }}>{r.grade}</span>
          </div>
        ))}

        <div className="lp-footer-line" style={{ ...S.mono, fontSize: 11, color: "rgba(0,212,255,0.5)", marginTop: 16 }}>
          &gt; GRAPH_PROPAGATION complete. 7166 edges traversed.
          <span style={{ borderRight: "2px solid #00d4ff", animation: "lp-blink 1s step-end infinite", marginLeft: 2 }}>&nbsp;</span>
        </div>
      </div>
    </div>
  );
}

function HeroSection({ onLaunch, onViewArch }) {
  return (
    <section className="lp-hero" style={{
      display: "flex", minHeight: "100vh",
      paddingTop: 60,
    }}>
      {/* Left */}
      <div className="lp-hero-left" style={{
        width: "58%", padding: "0 0 0 80px",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        {/* Status pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          border: "1px solid rgba(0,212,255,0.3)",
          background: "rgba(0,212,255,0.05)",
          borderRadius: 100, padding: "6px 16px", alignSelf: "flex-start",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#00ff88",
            animation: "lp-pulse 1.5s ease infinite",
          }} />
          <span style={{ ...S.mono, fontSize: 11, color: "rgba(0,212,255,0.8)", letterSpacing: "0.1em" }}>
            SYSTEM_ONLINE — DATA MINING ENGINE v2.1
          </span>
        </div>

        {/* Headline */}
        <div style={{ marginTop: 32, lineHeight: 0.92 }}>
          <div style={{ ...S.bebas, fontSize: "clamp(72px,8vw,110px)", color: "#f0f4ff", letterSpacing: "-0.01em", display: "block" }}>
            RANK EVERY
          </div>
          <div className="lp-headline-scan" style={{ ...S.bebas, fontSize: "clamp(72px,8vw,110px)", color: "#00d4ff", letterSpacing: "-0.01em", display: "block" }}>
            CANDIDATE
          </div>
          <div style={{ ...S.bebas, fontSize: "clamp(72px,8vw,110px)", color: "#f0f4ff", letterSpacing: "-0.01em", display: "block" }}>
            BY SKILL DNA
          </div>
        </div>

        {/* Subtext */}
        <p style={{ ...S.dmSans, fontSize: 17, color: "rgba(180,190,220,0.7)", lineHeight: 1.7, maxWidth: 500, marginTop: 28 }}>
          SkillGraph maps candidate skills as a knowledge graph and scores matches using
          semantic embeddings, graph distance, and propagation signals — not keyword matching.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          <button className="lp-btn-primary" onClick={onLaunch}>
            LAUNCH INTELLIGENCE ENGINE →
          </button>
          <button className="lp-btn-secondary" onClick={onViewArch}>
            VIEW ARCHITECTURE ↓
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 48, ...S.mono, fontSize: 12 }}>
          <span style={{ color: "#00d4ff" }}>10,000+</span>
          <span style={{ color: "rgba(180,190,220,0.5)" }}>RESUMES</span>
          <span style={{ color: "rgba(180,190,220,0.3)" }}>·</span>
          <span style={{ color: "#00d4ff" }}>201</span>
          <span style={{ color: "rgba(180,190,220,0.5)" }}>SKILL NODES</span>
          <span style={{ color: "rgba(180,190,220,0.3)" }}>·</span>
          <span style={{ color: "#00d4ff" }}>5-SIGNAL</span>
          <span style={{ color: "rgba(180,190,220,0.5)" }}>SCORING</span>
        </div>
      </div>

      {/* Right */}
      <div className="lp-hero-right" style={{
        width: "42%", display: "flex", alignItems: "center",
        justifyContent: "center", paddingRight: 80,
      }}>
        <TerminalCard />
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Semantic Match", body: "SBERT cosine similarity between skill vectors" },
  { n: "02", title: "Graph Distance", body: "Shortest path hops between resume and JD skill nodes" },
  { n: "03", title: "Propagation Walk", body: "BFS decay from JD nodes outward across the skill graph" },
  { n: "04", title: "Evidence Score", body: "Action verb detection near skill mentions in resume text" },
  { n: "05", title: "Domain Alignment", body: "Dynamic weighting based on which domains the JD prioritizes" },
];

function ArchSection() {
  return (
    <section id="architecture" className="lp-sect" style={{ background: "var(--void)", padding: "140px 80px" }}>
      <div data-reveal className="reveal-hidden" style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ ...S.mono, fontSize: 11, color: "#00d4ff", letterSpacing: "0.2em" }}>UNDER THE HOOD</span>
      </div>
      <h2 data-reveal className="reveal-hidden" style={{ ...S.dmSans, textAlign: "center", fontSize: 52, fontWeight: 700, color: "#f0f4ff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
        Five signals.<br />
        <span style={{ color: "#00d4ff" }}>One definitive score.</span>
      </h2>
      <p data-reveal className="reveal-hidden" style={{ ...S.dmSans, textAlign: "center", maxWidth: 560, margin: "20px auto 0", fontSize: 17, color: "rgba(180,190,220,0.6)", lineHeight: 1.7 }}>
        Each candidate is scored across five independent data mining signals, weighted by importance and combined into a single explainable fit score.
      </p>

      <div className="lp-pipeline" style={{ marginTop: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, position: "relative" }}>
        {/* connecting line */}
        <div style={{
          position: "absolute", top: 28, left: "10%", width: "80%", height: 1,
          background: "linear-gradient(90deg,transparent,rgba(0,212,255,0.2) 20%,rgba(0,212,255,0.2) 80%,transparent)",
        }} />

        {STEPS.map((step, i) => (
          <div key={step.n} data-reveal className="reveal-hidden" style={{ transitionDelay: `${i * 0.1}s`, flex: "0 0 auto", width: 200, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 16px" }}>
            <div className="lp-step-num" style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "1px solid rgba(0,212,255,0.2)",
              background: "rgba(0,212,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              ...S.mono, fontSize: 14, fontWeight: 700, color: "#00d4ff",
              position: "relative", zIndex: 1,
              backdropFilter: "blur(8px)", transition: "all 0.2s",
            }}>{step.n}</div>
            <div style={{ ...S.dmSans, fontSize: 15, fontWeight: 600, color: "#f0f4ff", marginTop: 16 }}>{step.title}</div>
            <div style={{ ...S.dmSans, fontSize: 13, color: "rgba(180,190,220,0.55)", lineHeight: 1.6, marginTop: 8 }}>{step.body}</div>
          </div>
        ))}

        {/* Final score box */}
        <div data-reveal className="reveal-hidden" style={{ transitionDelay: "0.5s", marginLeft: 24, flexShrink: 0, width: 120, height: 120, borderRadius: 12, border: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.05)", boxShadow: "0 0 30px rgba(0,255,136,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={{ ...S.mono, fontSize: 10, color: "rgba(0,255,136,0.6)", letterSpacing: "0.15em" }}>FIT</span>
          <span style={{ ...S.mono, fontSize: 10, color: "rgba(0,255,136,0.6)", letterSpacing: "0.15em" }}>SCORE</span>
          <span style={{ ...S.mono, fontSize: 32, fontWeight: 700, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.5)" }}>0.94</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Mock SVG graph for card 2 ──────────────────────────────────────────── */

const GRAPH_NODES = [
  { x: 60,  y: 40,  r: 7,  fill: "#a855f7", delay: "0s" },
  { x: 100, y: 25,  r: 5,  fill: "#a855f7", delay: "0.4s" },
  { x: 140, y: 50,  r: 6,  fill: "#a855f7", delay: "0.8s" },
  { x: 80,  y: 75,  r: 8,  fill: "#a855f7", delay: "1.2s" },
  { x: 200, y: 35,  r: 5,  fill: "#3b82f6", delay: "0.2s" },
  { x: 240, y: 60,  r: 7,  fill: "#3b82f6", delay: "0.6s" },
  { x: 220, y: 95,  r: 5,  fill: "#3b82f6", delay: "1.0s" },
  { x: 310, y: 40,  r: 6,  fill: "#06b6d4", delay: "0.3s" },
  { x: 350, y: 70,  r: 8,  fill: "#06b6d4", delay: "0.7s" },
  { x: 340, y: 110, r: 5,  fill: "#06b6d4", delay: "1.1s" },
  { x: 160, y: 130, r: 5,  fill: "#f97316", delay: "0.5s" },
  { x: 200, y: 155, r: 7,  fill: "#f97316", delay: "0.9s" },
  { x: 240, y: 135, r: 5,  fill: "#f97316", delay: "1.3s" },
  { x: 290, y: 155, r: 5,  fill: "#6b7280", delay: "0.1s" },
  { x: 130, y: 155, r: 5,  fill: "#6b7280", delay: "0.8s" },
  { x: 50,  y: 140, r: 7,  fill: "#ff3366", stroke: "#ffb3c3", dash: "4,2", delay: "0.6s" },
  { x: 380, y: 130, r: 7,  fill: "#00ff88", glow: true, delay: "0s" },
  { x: 110, y: 120, r: 6,  fill: "#00ff88", glow: true, delay: "0.4s" },
];

const GRAPH_EDGES = [
  [0,1],[1,2],[2,3],[0,3],[4,5],[5,6],[7,8],[8,9],[10,11],[11,12],[12,13],
  [3,10],[6,11],[9,12],[14,10],[15,3],[16,9],[17,3],[1,4],[5,10],[8,13],
];

function GraphSVG() {
  return (
    <svg width="100%" height="180" viewBox="0 0 420 180" style={{ background: "rgba(0,0,0,0.3)", display: "block" }}>
      {GRAPH_EDGES.map(([a, b], i) => (
        <line key={i}
          x1={GRAPH_NODES[a].x} y1={GRAPH_NODES[a].y}
          x2={GRAPH_NODES[b].x} y2={GRAPH_NODES[b].y}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
      ))}
      {GRAPH_NODES.map((n, i) => (
        <circle key={i}
          cx={n.x} cy={n.y} r={n.r}
          fill={n.fill} fillOpacity={n.glow ? 1 : 0.75}
          stroke={n.stroke ?? "none"} strokeWidth={n.stroke ? 1.5 : 0}
          strokeDasharray={n.dash ?? "none"}
          style={{
            filter: n.glow ? "drop-shadow(0 0 6px #00ff88)" : "none",
            animation: `lp-float ${2.5 + i * 0.3}s ease-in-out ${n.delay} infinite`,
          }}
        />
      ))}
    </svg>
  );
}

/* ─── mini ranking preview ───────────────────────────────────────────────── */
function RankPreview() {
  const rows = [
    { rank: "#01", w: "85%", bg: "linear-gradient(90deg,#00d4ff,#00ff88)", grade: "A", gc: "#00ff88", gb: "rgba(0,255,136,0.15)", gbr: "rgba(0,255,136,0.3)" },
    { rank: "#02", w: "65%", bg: "#00d4ff88", grade: "B", gc: "#00d4ff", gb: "rgba(0,212,255,0.15)", gbr: "rgba(0,212,255,0.3)" },
    { rank: "#03", w: "40%", bg: "#00d4ff44", grade: "D", gc: "#ff3055", gb: "rgba(255,48,85,0.15)", gbr: "rgba(255,48,85,0.3)" },
  ];
  return (
    <div style={{ padding: 24, background: "rgba(0,0,0,0.2)" }}>
      {rows.map((r) => (
        <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ ...S.mono, fontSize: 11, color: "rgba(255,255,255,0.3)", width: 28 }}>{r.rank}</span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: r.w, height: "100%", borderRadius: 2, background: r.bg }} />
          </div>
          <span style={{ ...S.mono, fontSize: 11, padding: "3px 7px", borderRadius: 4, background: r.gb, color: r.gc, border: `1px solid ${r.gbr}` }}>{r.grade}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── gap preview ────────────────────────────────────────────────────────── */
function GapPreview() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "32px 24px", background: "rgba(0,0,0,0.2)" }}>
        {[
          { label: "C", color: "#ffb800", bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.4)" },
          null,
          { label: "B", color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.4)" },
        ].map((item, i) =>
          item === null ? (
            <span key={i} style={{ ...S.mono, fontSize: 14, color: "rgba(255,255,255,0.2)" }}>──────►</span>
          ) : (
            <div key={i} style={{
              padding: "8px 20px", borderRadius: 8,
              border: `1px solid ${item.border}`,
              background: item.bg,
              ...S.mono, fontSize: 24, fontWeight: 700, color: item.color,
              textShadow: `0 0 20px ${item.color}66`,
            }}>{item.label}</div>
          )
        )}
      </div>
      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {["python → tensorflow", "seo → angular"].map((path) => {
          const [from, to] = path.split(" → ");
          return (
            <div key={path} style={{ ...S.mono, fontSize: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "6px 12px" }}>
              <span style={{ color: "rgba(180,190,220,0.7)" }}>{from}</span>
              <span style={{ color: "#00d4ff", margin: "0 6px" }}>→</span>
              <span style={{ color: "rgba(180,190,220,0.7)" }}>{to}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VIEW_CARDS = [
  {
    accent: "linear-gradient(90deg,#00d4ff,transparent)",
    preview: <RankPreview />,
    title: "Candidate Rankings",
    body: "Every resume ranked with full score breakdown — matched skills, missing skills, and which signal drove the result.",
  },
  {
    accent: "linear-gradient(90deg,#a855f7,transparent)",
    preview: <GraphSVG />,
    title: "Skill Web Explorer",
    body: "Force-directed graph of skill co-occurrence. Domain color-coded. Click any missing skill node to see the shortest learning path to acquire it.",
    tall: true,
  },
  {
    accent: "linear-gradient(90deg,#ffb800,transparent)",
    preview: <GapPreview />,
    title: "Gap Intelligence",
    body: "Not just what's missing — but the shortest graph path to acquire each skill, grade by grade. Improve incrementally.",
  },
];

function ViewsSection() {
  return (
    <section id="views" className="lp-sect" style={{ background: "rgba(8,8,16,1)", padding: "140px 80px" }}>
      <div data-reveal className="reveal-hidden" style={{ marginBottom: 8 }}>
        <span style={{ ...S.mono, fontSize: 11, color: "#00d4ff", letterSpacing: "0.2em" }}>WHAT YOU SEE</span>
      </div>
      <h2 data-reveal className="reveal-hidden" style={{ ...S.dmSans, fontSize: 52, fontWeight: 700, color: "#f0f4ff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
        Three views. Total clarity.
      </h2>

      <div className="lp-three-grid" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 24, alignItems: "start" }}>
        {VIEW_CARDS.map((card, i) => (
          <div key={i} data-reveal className="reveal-hidden lp-view-card" style={{
            transitionDelay: `${i * 0.1}s`,
            background: "var(--lp-card)",
            border: "1px solid var(--lp-border)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{ height: 3, background: card.accent }} />
            {card.preview}
            <div style={{ padding: 24 }}>
              <div style={{ ...S.dmSans, fontSize: 18, fontWeight: 600, color: "#f0f4ff" }}>{card.title}</div>
              <div style={{ ...S.dmSans, fontSize: 14, color: "rgba(180,190,220,0.55)", lineHeight: 1.6, marginTop: 8 }}>{card.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const CONCEPTS = [
  { dot: "#00d4ff", title: "Text Mining", body: "NER extraction from raw resume text using regex + taxonomy" },
  { dot: "#a855f7", title: "Graph Mining", body: "Co-occurrence graph, 124 nodes, 7,166 edges" },
  { dot: "#00ff88", title: "Vector Space", body: "SBERT 768-dim embeddings for semantic proximity" },
  { dot: "#ffb800", title: "Association Rules", body: "Skill co-occurrence ≡ market basket analysis" },
  { dot: "#00d4ff", title: "Link Analysis", body: "BFS propagation walk from JD skill nodes" },
  { dot: "#00ff88", title: "Learning-to-Rank", body: "Weighted multi-signal scoring pipeline" },
];

function ResearchSection({ onLaunch }) {
  return (
    <section id="research" className="lp-sect" style={{ background: "var(--void)", padding: "140px 80px" }}>
      <div data-reveal className="reveal-hidden" style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ ...S.mono, fontSize: 11, color: "#00d4ff", letterSpacing: "0.2em" }}>ACADEMIC FOUNDATION</span>
      </div>
      <h2 data-reveal className="reveal-hidden" style={{ ...S.dmSans, textAlign: "center", fontSize: 52, fontWeight: 700, color: "#f0f4ff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
        Built on real data mining.
      </h2>

      <div className="lp-concepts-grid" data-reveal style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 800, margin: "24px auto 0" }}>
        {CONCEPTS.map((c, i) => (
          <div key={i} className="reveal-hidden lp-concept-item" data-reveal style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            transitionDelay: `${i * 0.08}s`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ ...S.mono, fontSize: 13, color: "#00d4ff" }}>{c.title}</div>
              <div style={{ ...S.dmSans, fontSize: 13, color: "rgba(180,190,220,0.55)", lineHeight: 1.5, marginTop: 2 }}>{c.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA card */}
      <div data-reveal className="reveal-hidden" style={{
        marginTop: 80, maxWidth: 640, marginLeft: "auto", marginRight: "auto",
        background: "rgba(0,212,255,0.04)",
        border: "1px solid rgba(0,212,255,0.15)",
        borderRadius: 16, padding: 48, textAlign: "center",
      }}>
        <div style={{ ...S.dmSans, fontSize: 32, fontWeight: 700, color: "#f0f4ff" }}>Ready to rank candidates?</div>
        <div style={{ ...S.dmSans, fontSize: 16, color: "rgba(180,190,220,0.6)", marginTop: 8 }}>
          Upload resumes, select a job description, and get ranked results in seconds.
        </div>
        <button className="lp-btn-primary" style={{ marginTop: 32 }} onClick={onLaunch}>
          LAUNCH INTELLIGENCE ENGINE →
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      background: "var(--void)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      padding: "48px 80px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ ...S.bebas, fontSize: 24, color: "#f0f4ff", letterSpacing: "0.04em" }}>SkillGraph</div>
        <div style={{ ...S.mono, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", marginTop: 4 }}>
          DATA MINING ASSIGNMENT · MSRUAS · 2026
        </div>
      </div>
      <div style={{ ...S.mono, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
        Built with NetworkX · SBERT · FastAPI · React · D3.js
      </div>
    </footer>
  );
}

/* ─── root component ─────────────────────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();
  useScrollReveal();

  function scrollToArch() {
    document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={S.page}>
        <Navbar onLaunch={() => navigate("/app")} />
        <HeroSection onLaunch={() => navigate("/app")} onViewArch={scrollToArch} />
        <ArchSection />
        <ViewsSection />
        <ResearchSection onLaunch={() => navigate("/app")} />
        <Footer />
      </div>
    </>
  );
}
