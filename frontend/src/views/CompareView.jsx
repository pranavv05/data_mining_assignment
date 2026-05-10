import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const gradeColors = {
  A: "var(--green)",
  B: "var(--cyan)",
  C: "#f97316",
  D: "var(--red)",
};

const chipColors = ["var(--cyan)", "var(--green)", "var(--purple)", "#f97316", "#eab308", "#14b8a6"];

function pct(value) {
  return Math.max(0, Math.min(100, Number(value ?? 0) * 100));
}

function GradeBadge({ grade }) {
  const color = gradeColors[grade] ?? "#6b7280";
  return <Badge className="border bg-transparent font-mono text-xs uppercase" style={{ borderColor: `${color}88`, color }}>{grade ?? "NA"}</Badge>;
}

function SkillChip({ skill, index, tone }) {
  const color = tone || chipColors[index % chipColors.length];
  return (
    <Badge className="border bg-transparent font-mono text-[11px]" style={{ borderColor: `${color}66`, color }}>
      {skill}
    </Badge>
  );
}

function CandidatePanel({ candidate }) {
  const skills = candidate?.all_skills ?? [];

  return (
    <Card className="sg-card">
      <CardHeader className="border-b border-[var(--border)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-mono text-2xl text-white">{candidate?.candidate_id ?? "NO_CANDIDATE"}</CardTitle>
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Score {Math.round(pct(candidate?.final_score))}%</div>
          </div>
          <GradeBadge grade={candidate?.grade} />
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--cyan)]">Skill Inventory</div>
        <div className="flex flex-wrap gap-2">
          {skills.length ? skills.slice(0, 34).map((skill, index) => <SkillChip key={skill} skill={skill} index={index} />) : (
            <span className="font-mono text-xs text-[var(--text-muted)]">NO_SKILLS_INDEXED</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, skills, tone, arrow }) {
  return (
    <section className="space-y-3">
      <div className="text-center font-mono text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{title}</div>
      <div className="flex flex-wrap justify-center gap-2">
        {skills.length ? skills.slice(0, 20).map((skill) => (
          <Badge key={skill} className="border bg-transparent font-mono text-[11px]" style={{ borderColor: `${tone}66`, color: tone }}>
            {arrow} {skill}
          </Badge>
        )) : <span className="font-mono text-xs text-[var(--text-muted)]">NONE</span>}
      </div>
    </section>
  );
}

function dominantDifference(a, b) {
  const signals = [
    ["semantic", "semantic_score"],
    ["distance", "distance_score"],
    ["propagation", "propagation_score"],
  ];
  return signals
    .map(([label, key]) => ({ label, delta: Math.abs(Number(a?.[key] ?? 0) - Number(b?.[key] ?? 0)) }))
    .sort((left, right) => right.delta - left.delta)[0]?.label ?? "match";
}

export default function CompareView({ candidates = [], onBack }) {
  const [candidateA, candidateB] = candidates;

  if (candidates.length !== 2) {
    return (
      <Card className="sg-card">
        <CardContent className="p-8">
          <div className="font-mono text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">SELECT_EXACTLY_TWO_CANDIDATES</div>
          <Button onClick={onBack} className="mt-5 bg-[var(--cyan)] font-mono text-xs uppercase tracking-[0.14em] text-black">Back to Rankings</Button>
        </CardContent>
      </Card>
    );
  }

  const skillsA = new Set(candidateA.all_skills ?? []);
  const skillsB = new Set(candidateB.all_skills ?? []);
  const onlyA = [...skillsA].filter((skill) => !skillsB.has(skill)).sort();
  const onlyB = [...skillsB].filter((skill) => !skillsA.has(skill)).sort();
  const shared = [...skillsA].filter((skill) => skillsB.has(skill)).sort();
  const recommended = Number(candidateA.final_score ?? 0) >= Number(candidateB.final_score ?? 0) ? candidateA : candidateB;
  const driver = dominantDifference(candidateA, candidateB);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-[28px] font-bold text-white">COMPARATIVE_ANALYSIS.exe</h1>
        <Button variant="outline" onClick={onBack} className="border-[var(--cyan)]/60 bg-transparent font-mono text-xs uppercase tracking-[0.14em] text-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:text-[var(--cyan)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[5fr_2fr_5fr]">
        <CandidatePanel candidate={candidateA} />

        <Card className="sg-card">
          <CardHeader className="p-5 text-center">
            <CardTitle className="font-mono text-lg uppercase tracking-[0.2em] text-white">INTERSECTION</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0">
            <Section title="ONLY A" skills={onlyA} tone="var(--cyan)" arrow="<-" />
            <div className="h-px bg-[var(--cyan)]/45 shadow-[0_0_14px_rgba(0,212,255,0.8)]" />
            <Section title="SHARED" skills={shared} tone="var(--green)" arrow="=" />
            <div className="h-px bg-[var(--green)]/45 shadow-[0_0_14px_rgba(0,255,136,0.75)]" />
            <Section title="ONLY B" skills={onlyB} tone="var(--purple)" arrow="->" />
          </CardContent>
        </Card>

        <CandidatePanel candidate={candidateB} />
      </div>

      <Card className="sg-card">
        <CardContent className="p-5">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">RECOMMENDATION:</div>
          <p className="font-mono text-sm leading-7 text-[var(--text)]">
            Recommend {recommended.candidate_id} because they have the higher match score at {Math.round(pct(recommended.final_score))}% and the strongest separation comes from the {driver} signal.<span className="terminal-cursor" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
