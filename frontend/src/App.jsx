import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Command as CommandIcon, GitCompare, GitFork, Hexagon, Home, Trophy } from "lucide-react";

import GapPanel from "@/components/GapPanel";
import RankingPanel from "@/components/RankingPanel";
import SkillGraph from "@/components/SkillGraph";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CompareCandidatesView from "@/views/CompareView";
import HomeView from "@/views/HomeView";

const views = [
  { id: "home", label: "Home", icon: Home },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "graph", label: "Graph", icon: GitFork },
  { id: "compare", label: "Compare", icon: GitCompare },
];

function NavPill({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
        active
          ? "bg-[var(--cyan)] text-black shadow-[0_0_18px_rgba(0,212,255,0.28)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </button>
  );
}

function Navbar({ view, setView }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[var(--border)] bg-[rgba(5,5,8,0.9)] backdrop-blur-[20px]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
        <button type="button" onClick={() => setView("home")} className="flex min-w-0 items-center gap-3 text-left">
          <div className="grid size-9 place-items-center rounded-xl border border-[var(--cyan)]/45 bg-[var(--cyan)]/10 text-[var(--cyan)]">
            <Hexagon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-bold leading-none text-white">SkillGraph</div>
            <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              NODE://RPG_MARKET_TERMINAL
            </div>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
          {views.map((item) => (
            <NavPill key={item.id} item={item} active={view === item.id} onClick={setView} />
          ))}
        </nav>

        <div className="flex justify-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 border-[var(--cyan)]/60 bg-transparent font-mono text-xs text-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:text-[var(--cyan)]"
              >
                <CommandIcon className="size-4" aria-hidden="true" />
                Command
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-[var(--border)] bg-[var(--bg-surface)] p-0 text-[var(--text)]">
              <Command className="bg-transparent">
                <CommandInput placeholder="Jump to view..." />
                <CommandList>
                  <CommandEmpty>No command found.</CommandEmpty>
                  <CommandGroup heading="Views">
                    {views.map((item) => {
                      const Icon = item.icon;
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.label}
                          onSelect={() => {
                            setView(item.id);
                            setOpen(false);
                          }}
                        >
                          <Icon className="mr-2 size-4 text-[var(--cyan)]" aria-hidden="true" />
                          {item.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

function GraphView({ candidate, jdSkillString }) {
  return (
    <div className="grid min-h-[calc(100dvh-120px)] gap-5 xl:grid-cols-[65fr_35fr]">
      <div className="min-w-0">
        <SkillGraph
          candidateId={candidate?.candidate_id}
          jdSkillString={jdSkillString}
          missingSkills={candidate?.missing_skills ?? []}
          onSkillClick={(skill) => console.log("open proficiency test", skill)}
          height={680}
        />
      </div>
      <aside className="min-h-0">
        <GapPanel gap={candidate?.gap} />
      </aside>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [rankPayload, setRankPayload] = useState(null);
  const [graphCandidate, setGraphCandidate] = useState(null);
  const [compareCandidates, setCompareCandidates] = useState([]);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" });
  }, [view]);

  function renderCurrentView() {
    if (view === "home") {
      return <HomeView onRanked={setRankPayload} />;
    }

    if (view === "rankings") {
      return (
        <RankingPanel
          rankings={rankPayload?.result?.ranked ?? []}
          jdTitle={rankPayload?.selectedJob?.job_title}
          onViewGraph={(candidate) => {
            setGraphCandidate(candidate);
            setView("graph");
          }}
          onCompareSelected={(candidateIds) => {
            setCompareCandidates(candidateIds);
            setView("compare");
          }}
        />
      );
    }

    if (view === "graph") {
      return <GraphView candidate={graphCandidate} jdSkillString={rankPayload?.selectedJob?.job_skill_set ?? ""} />;
    }

    const ranked = rankPayload?.result?.ranked ?? [];
    const selectedCandidates = compareCandidates.map((id) => ranked.find((candidate) => candidate.candidate_id === id)).filter(Boolean);

    return (
      <CompareCandidatesView
        candidates={selectedCandidates}
        jdSkillString={rankPayload?.selectedJob?.job_skill_set ?? ""}
        onBack={() => setView("rankings")}
      />
    );
  }

  return (
    <div className="min-h-dvh text-[var(--text)]">
      <Navbar view={view} setView={setView} />
      <main className="mx-auto max-w-[1500px] px-5 py-6">
        <div ref={contentRef}>{renderCurrentView()}</div>
      </main>
    </div>
  );
}
