"use client";

import { useMemo, useState } from "react";
import { Search, Users, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { SummaryStatCard } from "@/components/admin/SummaryStatCard";
import { ParticipantTableRow } from "@/components/admin/ParticipantTableRow";
import { Select } from "@/components/ui/Field";
import type { ParticipantSummary, PipelineState } from "@/lib/types/db";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "capturing", label: "Capturing" },
  { value: "ai_drafted", label: "AI drafted" },
  { value: "gp_review", label: "GP review" },
  { value: "tcm_review", label: "TCM review" },
  { value: "signed", label: "Signed" },
  { value: "delivered", label: "Delivered" },
  { value: "needs_attention", label: "Needs attention" },
];

export function ParticipantListView({ summaries }: { summaries: ParticipantSummary[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const total = summaries.length;
  const awaiting = summaries.filter((s) => s.pipeline.state === "gp_review" || s.pipeline.state === "tcm_review").length;
  const delivered = summaries.filter((s) => s.pipeline.state === "delivered").length;
  const needsAttention = summaries.filter((s) => s.pipeline.needs_attention).length;

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      const matchesQuery = s.participant.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "needs_attention" ? s.pipeline.needs_attention : s.pipeline.state === (filter as PipelineState));
      return matchesQuery && matchesFilter;
    });
  }, [summaries, query, filter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryStatCard icon={<Users size={20} />} label="Total" value={total} tone="neutral" />
        <SummaryStatCard icon={<ClipboardCheck size={20} />} label="Awaiting GP/TCM" value={awaiting} tone="sage" />
        <SummaryStatCard icon={<CheckCircle2 size={20} />} label="Delivered" value={delivered} tone="sage" />
        <SummaryStatCard icon={<AlertTriangle size={20} />} label="Needs attention" value={needsAttention} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants…"
            className="w-full rounded-md border border-border-strong bg-surface py-2.5 pl-9 pr-3 text-body-md focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:max-w-xs">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-surface-muted text-caption text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Participant</th>
                <th className="px-4 py-3 font-semibold">Capture</th>
                <th className="px-4 py-3 font-semibold">Pipeline status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((summary) => (
                <ParticipantTableRow key={summary.participant.id} summary={summary} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-center text-body-md text-ink-muted">No participants match your search.</p>}
      </div>
    </div>
  );
}
