import { useState } from "react";

import CharacterModel from "@/components/CharacterModel";
import JDPicker from "@/components/JDPicker";
import ResumeUpload from "@/components/ResumeUpload";

export default function HomeView({ onRanked }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [rankResult, setRankResult] = useState(null);
  const topCandidate = rankResult?.ranked?.[0];

  function handleRanked(result) {
    setRankResult(result);
    onRanked?.({ result, selectedJob });
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
