import { useState } from "react";
import axios from "axios";

import CharacterModel from "@/components/CharacterModel";
import JDPicker from "@/components/JDPicker";
import ResumeUpload from "@/components/ResumeUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomeView({ onRanked, sessions = [], onLoadSession, onSessionSaved }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [rankResult, setRankResult] = useState(null);
  const [saveState, setSaveState] = useState("");
  const topCandidate = rankResult?.ranked?.[0];

  async function handleRanked(result, context) {
    setRankResult(result);
    const payload = { result, selectedJob };
    onRanked?.(payload);

    if (!selectedJob) return;

    setSaveState("SAVING_SESSION...");
    try {
      const response = await axios.post("/api/sessions", {
        selected_job: {
          job_title: selectedJob.job_title,
          job_skill_set: selectedJob.job_skill_set,
        },
        resumes: context?.candidates ?? [],
        result,
      });
      setSaveState("SESSION_SAVED");
      onSessionSaved?.(response.data?.session);
    } catch (error) {
      console.error("Failed to post /api/sessions", error);
      setSaveState("SESSION_SAVE_FAILED");
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-104px)] gap-6 xl:grid-cols-[60fr_40fr]">
      <section className="space-y-6">
        <div className="pt-6">
          <h1 className="text-[clamp(48px,6vw,72px)] font-extrabold leading-[0.9] tracking-[-3px] text-white">
            SkillGraph
          </h1>
          <div className="mt-4 font-mono text-xs uppercase tracking-[0.34em] text-[var(--cyan)]">
            RESUME INTELLIGENCE ENGINE
          </div>
        </div>

        <JDPicker onSelect={setSelectedJob} />
        <ResumeUpload selectedJob={selectedJob} onRanked={handleRanked} />
        <Card className="sg-card">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="font-mono text-sm uppercase tracking-[0.2em] text-[var(--cyan)]">Saved Sessions</CardTitle>
              {saveState && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{saveState}</span>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {sessions.length ? sessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onLoadSession?.(session.id)}
                className="w-full rounded-xl border border-[var(--border)] bg-[rgba(5,5,8,0.55)] p-4 text-left transition hover:border-[var(--cyan)]/50 hover:bg-[rgba(0,212,255,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{session.job_title || "Untitled JD"}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                      {session.candidate_count} candidates · top {session.top_candidate_id || "N/A"}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[var(--cyan)]">{Math.round(Number(session.top_score ?? 0) * 100)}%</div>
                </div>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                NO SAVED SESSIONS
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="min-h-[640px]">
        <CharacterModel
          level={Math.ceil(Number(topCandidate?.final_score ?? 0.1) * 10)}
          grade={topCandidate?.grade ?? "D"}
          score={Number(topCandidate?.final_score ?? 0.1)}
        />
      </aside>
    </div>
  );
}
