"use client";

import { useMemo, useState } from "react";

import {
  Search,
  Terminal,
  Activity,
} from "lucide-react";

/* ================================================= */
/* PATTERNS */
/* ================================================= */

const ERROR_PATTERNS = [
  /error:/i,
  /failed/i,
  /exception/i,
  /traceback/i,
  /fatal/i,
];

const WARN_PATTERNS = [
  /warning:/i,
  /warn:/i,
  /deprecated/i,
];

const SUCCESS_PATTERNS = [
  /success/i,
  /passed/i,
  /✓/i,
  /ok$/i,
];

/* ================================================= */
/* CLASSIFY */
/* ================================================= */

function classifyLine(line: string) {

  if (
    ERROR_PATTERNS.some((p) =>
      p.test(line)
    )
  ) {
    return {
      text: "text-red-300",
      glow: "bg-red-500/10",
      border: "border-red-500/10",
      dot: "bg-red-400",
    };
  }

  if (
    WARN_PATTERNS.some((p) =>
      p.test(line)
    )
  ) {
    return {
      text: "text-orange-300",
      glow: "bg-orange-500/10",
      border: "border-orange-500/10",
      dot: "bg-orange-400",
    };
  }

  if (
    SUCCESS_PATTERNS.some((p) =>
      p.test(line)
    )
  ) {
    return {
      text: "text-emerald-300",
      glow: "bg-emerald-500/10",
      border: "border-emerald-500/10",
      dot: "bg-emerald-400",
    };
  }

  return {
    text: "text-zinc-400",
    glow: "bg-white/[0.02]",
    border: "border-white/[0.04]",
    dot: "bg-zinc-600",
  };
}

/* ================================================= */
/* COMPONENT */
/* ================================================= */

export default function LogViewer({
  logs,
}: {
  logs: string;
}) {

  const [search, setSearch] =
    useState("");

  const lines = useMemo(
    () => logs.split("\n"),
    [logs]
  );

  const filtered = search
    ? lines.filter((line) =>
        line
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      )
    : lines;

  return (

    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        {/* title */}
        <div className="flex items-center gap-4">

          <div
            className="
              w-12 h-12
              rounded-2xl
              border border-orange-500/15
              bg-orange-500/10
              flex items-center justify-center
            "
          >

            <Terminal
              size={20}
              className="text-orange-300"
            />

          </div>

          <div>

            <p
              className="
                text-[10px]
                uppercase
                tracking-[0.25em]
                text-zinc-600
              "
            >
              Live Observability
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-black
                tracking-[-0.03em]
                text-white
              "
            >
              Runtime Logs
            </h2>

          </div>
        </div>

        {/* search */}
        <div
          className="
            relative
            w-full
            lg:w-[340px]
          "
        >

          <Search
            size={16}
            className="
              absolute left-4 top-1/2 -translate-y-1/2
              text-zinc-600
            "
          />

          <input
            type="text"
            placeholder="Search telemetry..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="
              w-full
              rounded-2xl
              border border-white/[0.06]
              bg-white/[0.03]
              pl-11 pr-4 py-3
              text-sm text-white
              placeholder:text-zinc-600
              outline-none
              transition-all duration-300
              focus:border-orange-500/20
              focus:bg-orange-500/[0.03]
            "
          />
        </div>
      </div>

      {/* ================================================= */}
      {/* TERMINAL */}
      {/* ================================================= */}

      <div
        className="
          relative overflow-hidden
          rounded-[30px]
          border border-white/[0.06]
          bg-[#050505]
          backdrop-blur-2xl
        "
      >

        {/* terminal topbar */}
        <div
          className="
            flex items-center justify-between
            border-b border-white/[0.05]
            px-5 py-4
            bg-white/[0.02]
          "
        >

          {/* left */}
          <div className="flex items-center gap-3">

            <div className="w-3 h-3 rounded-full bg-red-400" />

            <div className="w-3 h-3 rounded-full bg-orange-400" />

            <div className="w-3 h-3 rounded-full bg-emerald-400" />

          </div>

          {/* center */}
          <div
            className="
              hidden md:flex
              items-center gap-2
              rounded-full
              border border-cyan-400/15
              bg-cyan-400/10
              px-4 py-1.5
            "
          >

            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

            <span
              className="
                text-[10px]
                uppercase
                tracking-[0.2em]
                text-cyan-300
                font-semibold
              "
            >
              STREAM ACTIVE
            </span>

          </div>

          {/* right */}
          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.2em]
              text-zinc-600
              font-mono
            "
          >
            {filtered.length}/{lines.length}
          </div>
        </div>

        {/* logs */}
        <div
          className="
            relative
            max-h-[520px]
            overflow-y-auto
            px-5 py-5
            space-y-2
            font-mono text-sm
          "
        >

          {/* glow */}
          <div
            className="
              pointer-events-none
              absolute inset-0
              bg-[radial-gradient(circle_at_top,rgba(255,120,40,0.05),transparent_35%)]
            "
          />

          {filtered.length === 0 && (

            <div
              className="
                rounded-2xl
                border border-white/[0.06]
                bg-white/[0.02]
                p-5
                text-zinc-500
              "
            >
              No matching telemetry lines.
            </div>
          )}

          {filtered.map((line, i) => {

            const style =
              classifyLine(line);

            return (

              <div
                key={i}
                className={`
                  group
                  flex items-start gap-4
                  rounded-2xl
                  border
                  px-4 py-3
                  transition-all duration-300
                  hover:bg-white/[0.03]
                  ${style.glow}
                  ${style.border}
                `}
              >

                {/* line number */}
                <div
                  className="
                    min-w-[48px]
                    text-right
                    text-[10px]
                    text-zinc-700
                    select-none
                    pt-[2px]
                  "
                >
                  {String(i + 1).padStart(
                    4,
                    "0"
                  )}
                </div>

                {/* dot */}
                <div
                  className={`
                    mt-[7px]
                    w-2 h-2 rounded-full
                    shrink-0
                    ${style.dot}
                  `}
                />

                {/* content */}
                <div
                  className={`
                    flex-1
                    whitespace-pre-wrap
                    break-words
                    leading-relaxed
                    ${style.text}
                  `}
                >
                  {line || " "}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2 text-zinc-600">

          <Activity size={14} />

          <span
            className="
              text-[11px]
              uppercase
              tracking-[0.2em]
            "
          >
            Real-time diagnostics stream
          </span>
        </div>

        {search && (

          <div
            className="
              text-[11px]
              uppercase
              tracking-[0.2em]
              text-orange-300
            "
          >
            filtered: "{search}"
          </div>
        )}
      </div>
    </div>
  );
}