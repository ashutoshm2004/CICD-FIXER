import type { WorkflowStatus } from "@/lib/types";

const CONFIG: Record<
  WorkflowStatus,
  {
    label: string;
    classes: string;
    dot: string;
  }
> = {

  pending: {
    label: "QUEUED",

    classes:
      "border-white/[0.08] bg-white/[0.03] text-zinc-300",

    dot:
      "bg-zinc-500",
  },

  running: {
    label: "ACTIVE",

    classes:
      "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

    dot:
      "bg-cyan-400 animate-pulse",
  },

  success: {
    label: "RECOVERED",

    classes:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

    dot:
      "bg-emerald-400",
  },

  failed: {
    label: "FAILED",

    classes:
      "border-red-400/20 bg-red-400/10 text-red-300",

    dot:
      "bg-red-400",
  },

  partial: {
    label: "PARTIAL",

    classes:
      "border-orange-400/20 bg-orange-400/10 text-orange-300",

    dot:
      "bg-orange-400",
  },
};

export default function StatusBadge({
  status,
}: {
  status: WorkflowStatus;
}) {

  const cfg =
    CONFIG[status] ??
    CONFIG.pending;

  return (

    <div
      className={`
        inline-flex items-center gap-2.5
        rounded-full
        border
        px-4 py-2
        backdrop-blur-xl
        transition-all duration-300
        ${cfg.classes}
      `}
    >

      {/* animated dot */}
      <div
        className={`
          w-2 h-2 rounded-full
          ${cfg.dot}
        `}
      />

      {/* label */}
      <span
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.22em]
        "
      >
        {cfg.label}
      </span>
    </div>
  );
}