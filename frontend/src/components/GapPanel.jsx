import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProficiencyTest from "@/components/ProficiencyTest";

const gradeColors = {
  A: "var(--green)",
  B: "var(--cyan)",
  C: "#f97316",
  D: "var(--red)",
  "already top": "var(--green)",
};

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

function normalizeDomain(domain = "") {
  const normalized = String(domain).trim().toLowerCase().replace(/[\s&-]+/g, "_");
  return domainColors[normalized] ? normalized : "default";
}

export default function GapPanel({ gap }) {
  const [passedSkills, setPassedSkills] = useState([]);
  const rows = useMemo(() => {
    const paths = gap?.learning_paths ?? [];
    if (paths.length) return paths;
    return (gap?.missing_skills ?? []).map((skill) => ({ target_skill: skill, domain: "default", path: [skill] }));
  }, [gap]);

  const currentGrade = gap?.current_grade ?? "-";
  const nextGrade = gap?.next_grade ?? "-";

  return (
    <Card className="sg-card max-h-[760px] overflow-hidden">
      <CardHeader className="border-b border-[var(--border)] p-5">
        <div className="font-mono text-4xl font-bold">
          <span style={{ color: gradeColors[currentGrade] ?? "#6b7280" }}>{currentGrade}</span>
          <span className="px-3 text-[var(--text-muted)]">-&gt;</span>
          <span style={{ color: gradeColors[nextGrade] ?? "#6b7280" }}>{nextGrade}</span>
        </div>
        <div className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">ACQUIRE TO LEVEL UP</div>
      </CardHeader>
      <CardContent className="max-h-[650px] space-y-3 overflow-y-auto p-4">
        {rows.length ? rows.map((item) => {
          const skill = typeof item === "string" ? item : (item.target_skill ?? item.name ?? "");
          const color = domainColors[normalizeDomain(typeof item === "string" ? "default" : item.domain)];
          const path = Array.isArray(item.path) && item.path.length ? item.path : [skill];
          const passed = passedSkills.includes(skill);

          return (
            <div key={`${skill}-${path.join("-")}`} className="rounded-xl border border-[var(--border)] bg-[rgba(5,5,8,0.55)] p-4" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-sm text-white">{skill}</p>
                {passed && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--green)]">PASSED</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {path.map((hop, index) => (
                  <span key={`${hop}-${index}`} className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[10px] text-[var(--text)]">{hop}</span>
                    {index < path.length - 1 && <span className="font-mono text-[var(--cyan)]">-&gt;</span>}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <ProficiencyTest
                  skill={skill}
                  onPass={(passedSkill) => setPassedSkills((current) => (current.includes(passedSkill) ? current : [...current, passedSkill]))}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-[var(--red)]/55 bg-transparent font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--red)] hover:bg-[var(--red)]/10 hover:text-[var(--red)]"
                    >
                      Run Diagnostic
                    </Button>
                  }
                />
              </div>
            </div>
          );
        }) : (
          <div className="rounded-xl border border-[var(--border)] bg-[rgba(5,5,8,0.55)] p-6 font-mono text-xs uppercase tracking-[0.18em] text-[var(--green)]">
            NO_GAP_DETECTED
          </div>
        )}
      </CardContent>
    </Card>
  );
}
