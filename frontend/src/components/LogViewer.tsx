"use client";

import { useState } from "react";

const ERROR_PATTERNS = [
  /error:/i, /failed/i, /exception/i, /traceback/i, /fatal/i,
];
const WARN_PATTERNS = [/warning:/i, /warn:/i, /deprecated/i];
const SUCCESS_PATTERNS = [/success/i, /passed/i, /✓/i, /ok$/i];

function classifyLine(line: string): string {
  if (ERROR_PATTERNS.some((p) => p.test(line))) return "text-red-400";
  if (WARN_PATTERNS.some((p) => p.test(line))) return "text-yellow-400";
  if (SUCCESS_PATTERNS.some((p) => p.test(line))) return "text-green-400";
  return "text-slate-400";
}

export default function LogViewer({ logs }: { logs: string }) {
  const [search, setSearch] = useState("");
  const lines = logs.split("\n");
  const filtered = search
    ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Filter logs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm
                   text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600"
      />
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-72
                      overflow-y-auto scrollbar-thin font-mono text-xs leading-5">
        {filtered.length === 0 && (
          <span className="text-slate-600">No matching lines.</span>
        )}
        {filtered.map((line, i) => (
          <div key={i} className={classifyLine(line)}>
            <span className="select-none text-gray-700 mr-2 text-[10px]">
              {String(i + 1).padStart(4, " ")}
            </span>
            {line || " "}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        {filtered.length}/{lines.length} lines
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}