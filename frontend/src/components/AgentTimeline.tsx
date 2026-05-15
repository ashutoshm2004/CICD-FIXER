import type { AgentTraceEvent } from "@/lib/types";

const AGENT_ICONS: Record<string, string> = {
  intake: "📥",
  rca: "🔍",
  fix_generation: "🔧",
  validation: "✅",
  reflection: "🔄",
  incident_report: "📝",
  graph: "🕸",
};

const EVENT_COLORS: Record<string, string> = {
  started: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
  tool_call: "text-yellow-400",
  message: "text-slate-400",
};

export default function AgentTimeline({ events }: { events: AgentTraceEvent[] }) {
  return (
    <div className="relative space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={i} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5
                  ${event.event === "completed" ? "bg-green-900/60 border border-green-700" :
                    event.event === "failed" ? "bg-red-900/60 border border-red-700" :
                    event.event === "started" ? "bg-blue-900/60 border border-blue-700" :
                    "bg-gray-800 border border-gray-700"}`}
              >
                {AGENT_ICONS[event.agent] ?? "🤖"}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-gray-800 mt-1 mb-1" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white capitalize">
                  {event.agent.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-mono ${EVENT_COLORS[event.event] ?? "text-slate-400"}`}>
                  [{event.event}]
                </span>
                <span className="text-xs text-slate-600 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {event.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}