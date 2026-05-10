import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        angle: (Math.PI * 2 * index) / 18,
        distance: 36 + (index % 5) * 7,
      })),
    [],
  );

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            "--x": `${Math.cos(particle.angle) * particle.distance}px`,
            "--y": `${Math.sin(particle.angle) * particle.distance}px`,
          }}
        />
      ))}
    </div>
  );
}

export default function ProficiencyTest({ skill, onPass, trigger }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!open || !skill) return;

    let active = true;
    setStatus("idle");
    setAnswer("");

    axios
      .post("/api/proficiency", { skill })
      .then((response) => {
        if (active) setPrompt(response.data);
      })
      .catch((error) => {
        console.error("Failed to post /api/proficiency", error);
        if (active) {
          setPrompt({
            scenario: "Diagnostic stream is currently unavailable.",
            question: "Describe how you would apply this skill in a real project.",
            pass_criteria: "Provide a specific, concrete answer with enough detail to assess proficiency.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [open, skill]);

  function submitAssessment() {
    if (answer.trim().length > 50) {
      setStatus("passed");
      onPass?.(skill);
    } else {
      setStatus("failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="overflow-hidden border-[#1a1a2e] bg-[#0f0f17] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xl uppercase tracking-[-0.02em] text-white">
            SKILL DIAGNOSTIC: {skill}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">Answer with concrete evidence from project work.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-md border border-[#1a1a2e] border-l-[#00d4ff] border-l-4 bg-[#050508]/70 p-4">
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[#00d4ff]">SCENARIO</div>
            <p className="text-sm leading-6 text-zinc-300">{prompt?.scenario ?? "Loading diagnostic scenario..."}</p>
          </div>

          <div className="rounded-md border border-[#1a1a2e] bg-[#050508]/70 p-4">
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">QUERY</div>
            <p className="text-base leading-7 text-white">{prompt?.question ?? "Preparing query..."}</p>
          </div>

          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={6}
            className="min-h-36 w-full resize-y rounded-md border border-[#1a1a2e] bg-[#050508]/80 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/20"
            placeholder="Enter assessment response..."
          />

          <Button
            type="button"
            onClick={submitAssessment}
            className="h-12 w-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] font-mono uppercase tracking-[0.18em] text-[#001014] hover:shadow-[0_0_24px_rgba(0,212,255,0.25)]"
          >
            Submit Assessment
          </Button>
        </div>

        {status === "passed" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#00140b]/90 backdrop-blur-sm">
            <ConfettiBurst />
            <div className="font-mono text-2xl font-bold uppercase tracking-[0.18em] text-[#00ff88]">
              DIAGNOSTIC PASSED ✓
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#210611]/92 p-8 backdrop-blur-sm">
            <div className="max-w-md text-center">
              <div className="font-mono text-2xl font-bold uppercase tracking-[0.18em] text-[#ff3366]">
                INSUFFICIENT RESPONSE
              </div>
              <p className="mt-4 text-sm leading-6 text-rose-100">{prompt?.pass_criteria}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatus("idle")}
                className="mt-6 border-[#ff3366]/50 bg-transparent font-mono uppercase tracking-[0.14em] text-[#ff3366] hover:bg-[#ff3366]/10 hover:text-[#ff3366]"
              >
                Revise Answer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
