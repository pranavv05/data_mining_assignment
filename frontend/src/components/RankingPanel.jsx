import { useEffect, useMemo, useState } from "react";
import { Check, GitCompare, Network, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const gradeColors = {
  A: "var(--green)",
  B: "var(--cyan)",
  C: "#f97316",
  D: "var(--red)",
};

const signals = [
  { key: "semantic_score", label: "SEMANTIC", dominant: "semantic" },
  { key: "distance_score", label: "DISTANCE", dominant: "distance" },
  { key: "propagation_score", label: "PROPAGATION", dominant: "propagation" },
];

function pct(value) {
  return Math.max(0, Math.min(100, Number(value ?? 0) * 100));
}

function GradeBadge({ grade }) {
  const color = gradeColors[grade] ?? "#6b7280";
  return (
    <Badge className="border bg-transparent px-3 py-1 font-mono text-xs uppercase tracking-[0.16em]" style={{ borderColor: `${color}88`, color }}>
      {grade ?? "NA"}
    </Badge>
  );
}

function SignalRow({ label, value, active }) {
  return (
    <div className="grid grid-cols-[112px_1fr_48px] items-center gap-3">
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--cyan)]"
          style={{ width: `${pct(value)}%`, filter: active ? "drop-shadow(0 0 8px rgba(0,212,255,0.95))" : "none" }}
        />
      </div>
      <div className="text-right font-mono text-xs text-[var(--text-muted)]">{Math.round(pct(value))}</div>
    </div>
  );
}

function SkillRow({ label, skills = [], tone }) {
  const visible = skills.slice(0, 5);
  const overflow = Math.max(0, skills.length - visible.length);
  const classes =
    tone === "green"
      ? "border-[var(--green)]/35 text-[var(--green)]"
      : "border-[var(--red)]/35 text-[var(--red)]";

  return (
    <div className="space-y-2">
      <div className={`font-mono text-xs uppercase tracking-[0.16em] ${tone === "green" ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.length ? visible.map((skill) => (
          <Badge key={skill} className={`border bg-transparent font-mono text-[11px] ${classes}`}>{skill}</Badge>
        )) : <span className="font-mono text-xs text-[var(--text-muted)]">NONE</span>}
        {overflow > 0 && <Badge className="border border-[var(--border)] bg-[var(--bg-elevated)] font-mono text-[11px] text-[var(--text-muted)]">+{overflow} more</Badge>}
      </div>
    </div>
  );
}

export default function RankingPanel({ rankings = [], jdTitle, onViewGraph, onCompareSelected }) {
  const [selected, setSelected] = useState([]);
  const sortedRankings = useMemo(() => [...rankings].sort((a, b) => Number(a.rank ?? 0) - Number(b.rank ?? 0)), [rankings]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function toggleCompare(candidateId) {
    setSelected((current) => {
      if (current.includes(candidateId)) return current.filter((id) => id !== candidateId);
      if (current.length >= 2) return current;
      return [...current, candidateId];
    });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-[28px] font-bold text-white">CANDIDATE_RANKINGS.exe</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{jdTitle || "No job description selected"}</p>
        </div>
        {selected.length === 2 && (
          <Button onClick={() => onCompareSelected?.(selected)} className="bg-[var(--cyan)] font-mono text-xs uppercase tracking-[0.16em] text-black hover:bg-[var(--cyan)]">
            <GitCompare className="size-4" aria-hidden="true" />
            Compare Selected
          </Button>
        )}
      </div>

      {sortedRankings.length ? (
        <div className="grid gap-4">
          {sortedRankings.map((candidate) => {
            const gradeColor = gradeColors[candidate.grade] ?? "#6b7280";
            const candidateId = candidate.candidate_id;
            const checked = selected.includes(candidateId);
            const compareDisabled = !checked && selected.length >= 2;

            return (
              <Card key={candidateId} className="sg-card overflow-hidden">
                <CardContent className="relative p-0">
                  <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: gradeColor }} />
                  <div className="grid gap-5 p-5 pl-7 xl:grid-cols-[220px_1fr_220px]">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-5xl text-[var(--text-muted)]">#{candidate.rank}</div>
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-white">{candidateId}</div>
                        <div className="mt-2"><GradeBadge grade={candidate.grade} /></div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          <span>MATCH SCORE</span>
                          <span className="text-[var(--cyan)]">{Math.round(pct(candidate.final_score))}%</span>
                        </div>
                        <Progress value={pct(candidate.final_score)} className="h-2 bg-[var(--border)] [&>div]:bg-[var(--cyan)]" />
                      </div>

                      <div className="space-y-2">
                        {signals.map((signal) => (
                          <SignalRow
                            key={signal.key}
                            label={signal.label}
                            value={candidate[signal.key]}
                            active={candidate.dominant_signal === signal.dominant}
                          />
                        ))}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <SkillRow label="ACQUIRED" skills={candidate.matched_skills} tone="green" />
                        <SkillRow label="MISSING" skills={candidate.missing_skills} tone="red" />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 xl:flex-col xl:items-stretch xl:justify-center">
                      <Button
                        variant="outline"
                        onClick={() => onViewGraph?.(candidate)}
                        className="border-[var(--cyan)]/60 bg-transparent font-mono text-xs uppercase tracking-[0.14em] text-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:text-[var(--cyan)]"
                      >
                        <Network className="size-4" aria-hidden="true" />
                        View Graph
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={compareDisabled}
                        onClick={() => toggleCompare(candidateId)}
                        className="justify-start font-mono text-xs uppercase tracking-[0.14em] text-[var(--text)] hover:bg-[var(--bg-elevated)] disabled:opacity-35"
                      >
                        {checked ? <Check className="size-4 text-[var(--green)]" /> : <Square className="size-4" />}
                        Compare
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="sg-card">
          <CardContent className="p-8 font-mono text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">
            NO_RANKING_DATA_RUN_RANK_NOW
          </CardContent>
        </Card>
      )}
    </section>
  );
}
