import { useState } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResumeUpload({ selectedJob, onRanked }) {
  const [candidateId, setCandidateId] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canRank = candidates.length > 0 && Boolean(selectedJob?.job_skill_set);

  function addCandidate() {
    const id = candidateId.trim();
    const text = resumeText.trim();

    if (!id || !text) {
      setMessage("CANDIDATE_ID_AND_RESUME_TEXT_REQUIRED");
      return;
    }

    setCandidates((current) => [...current.filter((candidate) => candidate.id !== id), { id, text }]);
    setCandidateId("");
    setResumeText("");
    setMessage("");
  }

  function removeCandidate(id) {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id));
  }

  async function rankCandidates() {
    if (!canRank) {
      setMessage("Select a JD and add at least one candidate first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post("/api/rank", {
        resumes: candidates,
        jd_skill_string: selectedJob.job_skill_set,
      });
      onRanked?.(response.data);
    } catch (error) {
      console.error("Failed to post /api/rank", error);
      setMessage("RANKING_PROCESS_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {loading && (
        <div className="scanline-overlay absolute inset-0 z-20 grid place-items-center rounded-xl border border-[var(--cyan)]/40 bg-[rgba(5,5,8,0.86)] backdrop-blur-sm">
          <div className="font-mono text-sm uppercase tracking-[0.28em] text-[var(--cyan)]">ANALYZING CANDIDATES...</div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="sg-card">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="font-mono text-sm uppercase tracking-[0.2em] text-[var(--cyan)]">Candidate Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <input
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              className="sg-input h-11 w-full px-4 font-mono text-sm"
              placeholder="CANDIDATE_ID"
            />
            <textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              rows={8}
              className="sg-input w-full resize-y px-4 py-3 font-mono text-sm leading-6"
              placeholder="RESUME_TEXT"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCandidate}
              className="h-10 border-[var(--cyan)]/60 bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:text-[var(--cyan)]"
            >
              Add Candidate
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        <Card className="sg-card">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="font-mono text-sm uppercase tracking-[0.2em] text-[var(--green)]">Queued Resumes</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[356px] flex-col gap-4 p-5 pt-0">
            <div className="min-h-48 flex-1 space-y-3">
              {candidates.length ? (
                candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl border border-[var(--border)] bg-[rgba(5,5,8,0.55)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-white">{candidate.id}</div>
                        <div className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">{candidate.text.slice(0, 60)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCandidate(candidate.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--red)]/12 hover:text-[var(--red)]"
                        aria-label={`Remove ${candidate.id}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid h-48 place-items-center rounded-xl border border-dashed border-[var(--border)] font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  NO CANDIDATES QUEUED
                </div>
              )}
            </div>

            {message && <div className="font-mono text-xs text-[var(--red)]">{message}</div>}

            <Button
              type="button"
              onClick={rankCandidates}
              disabled={loading}
              title={!canRank ? "Select a JD and add at least one candidate first" : ""}
              className={`h-13 w-full font-mono text-sm uppercase tracking-[0.24em] ${
                canRank
                  ? "bg-gradient-to-r from-[var(--cyan)] to-[var(--green)] text-black shadow-[0_0_22px_rgba(0,212,255,0.18)] hover:shadow-[0_0_34px_rgba(0,255,136,0.3)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              Rank Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
