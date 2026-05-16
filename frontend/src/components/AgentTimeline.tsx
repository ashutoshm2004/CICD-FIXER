import type { AgentTraceEvent } from "@/lib/types";

import {
  Activity,
  Search,
  Sparkles,
  ShieldCheck,
  RefreshCcw,
  FileText,
  Network,
} from "lucide-react";

const AGENT_ICONS: Record<
  string,
  any
> = {

  intake:
    Activity,

  rca:
    Search,

  fix_generation:
    Sparkles,

  validation:
    ShieldCheck,

  reflection:
    RefreshCcw,

  incident_report:
    FileText,

  graph:
    Network,
};

const EVENT_STYLES: Record<
  string,
  {
    dot: string;
    border: string;
    bg: string;
    text: string;
    glow: string;
    label: string;
  }
> = {

  started: {

    dot:
      "bg-cyan-400",

    border:
      "border-cyan-400/20",

    bg:
      "bg-cyan-400/10",

    text:
      "text-cyan-300",

    glow:
      "shadow-[0_0_25px_rgba(34,211,238,0.18)]",

    label:
      "ACTIVE",
  },

  completed: {

    dot:
      "bg-emerald-400",

    border:
      "border-emerald-400/20",

    bg:
      "bg-emerald-400/10",

    text:
      "text-emerald-300",

    glow:
      "shadow-[0_0_25px_rgba(52,211,153,0.18)]",

    label:
      "COMPLETED",
  },

  failed: {

    dot:
      "bg-red-400",

    border:
      "border-red-400/20",

    bg:
      "bg-red-400/10",

    text:
      "text-red-300",

    glow:
      "shadow-[0_0_25px_rgba(248,113,113,0.18)]",

    label:
      "FAILED",
  },

  tool_call: {

    dot:
      "bg-orange-400",

    border:
      "border-orange-400/20",

    bg:
      "bg-orange-400/10",

    text:
      "text-orange-300",

    glow:
      "shadow-[0_0_25px_rgba(251,146,60,0.18)]",

    label:
      "TOOL CALL",
  },

  message: {

    dot:
      "bg-zinc-500",

    border:
      "border-white/[0.08]",

    bg:
      "bg-white/[0.03]",

    text:
      "text-zinc-400",

    glow:
      "",

    label:
      "MESSAGE",
  },
};

export default function AgentTimeline({
  events,
}: {
  events: AgentTraceEvent[];
}) {

  return (

    <div className="relative">

      {/* vertical line */}
      <div
        className="
          absolute left-[23px] top-0 bottom-0
          w-px
          bg-gradient-to-b
          from-orange-500/40
          via-white/10
          to-transparent
        "
      />

      <div className="space-y-7">

        {events.map((event, i) => {

          const Icon =
            AGENT_ICONS[event.agent] ??
            Activity;

          const style =
            EVENT_STYLES[event.event] ??
            EVENT_STYLES.message;

          return (

            <div
              key={i}
              className="
                relative
                flex gap-6
                group
              "
            >

              {/* NODE */}
              <div
                className={`
                  relative z-10
                  w-12 h-12
                  rounded-2xl
                  border
                  flex items-center justify-center
                  backdrop-blur-xl
                  ${style.border}
                  ${style.bg}
                  ${style.glow}
                `}
              >

                {/* pulse */}
                <div
                  className={`
                    absolute inset-0 rounded-2xl
                    opacity-40 animate-pulse
                    ${style.bg}
                  `}
                />

                <Icon
                  size={18}
                  className={`relative z-10 ${style.text}`}
                />

              </div>

              {/* CONTENT */}
              <div className="flex-1 pb-2">

                {/* top */}
                <div className="flex flex-wrap items-center gap-3">

                  {/* agent */}
                  <h3
                    className="
                      text-white
                      font-semibold
                      tracking-[-0.02em]
                      capitalize
                    "
                  >
                    {event.agent.replace(/_/g, " ")}
                  </h3>

                  {/* status */}
                  <div
                    className={`
                      inline-flex items-center gap-2
                      rounded-full
                      border
                      px-3 py-1
                      backdrop-blur-xl
                      ${style.border}
                      ${style.bg}
                    `}
                  >

                    <div
                      className={`
                        w-2 h-2 rounded-full
                        ${style.dot}
                      `}
                    />

                    <span
                      className={`
                        text-[10px]
                        uppercase
                        tracking-[0.2em]
                        font-semibold
                        ${style.text}
                      `}
                    >
                      {style.label}
                    </span>
                  </div>

                  {/* timestamp */}
                  <span
                    className="
                      text-[11px]
                      uppercase
                      tracking-[0.18em]
                      text-zinc-600
                      font-mono
                    "
                  >
                    {event.timestamp}
                  </span>

                </div>

                {/* message */}
                <div
                  className="
                    mt-4
                    rounded-3xl
                    border border-white/[0.06]
                    bg-white/[0.025]
                    backdrop-blur-xl
                    p-5
                    transition-all duration-300
                    group-hover:border-orange-500/15
                    group-hover:bg-orange-500/[0.03]
                  "
                >

                  <p
                    className="
                      text-zinc-400
                      leading-relaxed
                    "
                  >
                    {event.message}
                  </p>

                </div>
              </div>
            </div>
          );
                })}
      </div>
    </div>
  );
}