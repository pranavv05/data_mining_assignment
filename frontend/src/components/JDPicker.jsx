import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

const categoryColors = {
  Technology: "var(--cyan)",
  HR: "var(--purple)",
  Finance: "var(--green)",
  Sales: "#f97316",
};

function getCategoryColor(category) {
  return categoryColors[category] ?? "#6b7280";
}

export default function JDPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setStatus("loading");

    axios
      .get("/api/jd_list")
      .then((response) => {
        if (!active) return;
        setJobs(response.data?.jobs ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load /api/jd_list", err);
        if (!active) return;
        setError("JD_STREAM_UNAVAILABLE");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedPayload = useMemo(
    () =>
      selectedJob
        ? {
            job_title: selectedJob.job_title,
            job_skill_set: selectedJob.job_skill_set,
          }
        : null,
    [selectedJob],
  );

  useEffect(() => {
    onSelect?.(selectedPayload);
  }, [onSelect, selectedPayload]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-14 w-full justify-between rounded-xl border-[var(--cyan)]/70 bg-[rgba(5,5,8,0.76)] px-5 font-mono text-sm uppercase tracking-[0.12em] text-[var(--cyan)] shadow-[0_0_22px_rgba(0,212,255,0.08)] hover:border-[var(--cyan)] hover:bg-[rgba(0,212,255,0.08)] hover:text-[var(--cyan)]"
        >
          <span className="flex min-w-0 items-center gap-3 truncate">
            {selectedJob && <span className="size-2.5 shrink-0 rounded-full bg-[var(--green)] shadow-[0_0_12px_rgba(0,255,136,0.8)]" />}
            <span className="truncate">{selectedJob?.job_title ?? "SELECT JOB ROLE_"}</span>
            {!selectedJob && <span className="terminal-cursor" aria-hidden="true" />}
          </span>
          <ChevronsUpDown className="ml-3 size-4 shrink-0 opacity-70" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,940px)] border-[var(--border)] bg-[var(--bg-surface)] p-0 text-[var(--text)] shadow-[0_0_36px_rgba(0,212,255,0.12)]">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search job title or category..." className="h-12 font-mono text-[var(--cyan)]" />
          <CommandList className="max-h-[380px]">
            <CommandEmpty>{status === "loading" ? "LOADING_JOB_STREAM..." : error || "NO_JOB_ROLE_MATCH"}</CommandEmpty>
            <CommandGroup heading="Job Roles">
              {jobs.map((job) => {
                const color = getCategoryColor(job.category);
                const isSelected = selectedJob?.job_id === job.job_id;

                return (
                  <CommandItem
                    key={`${job.job_id}-${job.job_title}`}
                    value={`${job.job_title} ${job.category}`}
                    onSelect={() => {
                      setSelectedJob(job);
                      setOpen(false);
                    }}
                    className="cursor-pointer gap-3 px-4 py-3"
                  >
                    <Check className={cn("size-4 text-[var(--green)]", isSelected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    <div className="min-w-0 flex-1 truncate font-medium text-white">{job.job_title}</div>
                    <Badge
                      className="shrink-0 border bg-transparent font-mono text-xs"
                      style={{ borderColor: `${color}88`, color, boxShadow: `0 0 14px ${color}22` }}
                    >
                      {job.category || "Unknown"}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
