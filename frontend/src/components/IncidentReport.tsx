import type {
  IncidentReport as IncidentReportType,
} from "@/lib/types";

import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Activity,
  FileText,
  Radar,
} from "lucide-react";

/* ================================================= */
/* SEVERITY */
/* ================================================= */

const SEVERITY = {

  low: {

    border:
      "border-cyan-400/20",

    bg:
      "bg-cyan-400/10",

    text:
      "text-cyan-300",

    dot:
      "bg-cyan-400",
  },

  medium: {

    border:
      "border-orange-400/20",

    bg:
      "bg-orange-400/10",

    text:
      "text-orange-300",

    dot:
      "bg-orange-400",
  },

  high: {

    border:
      "border-red-400/20",

    bg:
      "bg-red-400/10",

    text:
      "text-red-300",

    dot:
      "bg-red-400",
  },

  critical: {

    border:
      "border-red-500/20",

    bg:
      "bg-red-500/10",

    text:
      "text-red-200",

    dot:
      "bg-red-500",
  },
};

/* ================================================= */
/* COMPONENT */
/* ================================================= */

export default function IncidentReport({
  report,
}: {
  report: IncidentReportType;
}) {

  const severity =
    SEVERITY[
      report.severity
    ] ??
    SEVERITY.medium;

  return (

    <div className="space-y-8">

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section
        className="
          relative overflow-hidden
          rounded-[34px]
          border border-white/[0.06]
          bg-black/30
          backdrop-blur-2xl
          p-8
        "
      >

        {/* glow */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            bg-[radial-gradient(circle_at_top_left,rgba(255,120,40,0.06),transparent_30%)]
          "
        />

        <div className="relative z-10">

          {/* top */}
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">

            {/* LEFT */}
            <div className="flex items-start gap-5 flex-1">

              <div
                className="
                  w-16 h-16
                  rounded-[24px]
                  border border-orange-500/15
                  bg-orange-500/10
                  flex items-center justify-center
                  shrink-0
                "
              >

                <Radar
                  size={28}
                  className="text-orange-300"
                />

              </div>

              <div className="flex-1">

                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.25em]
                    text-zinc-600
                  "
                >
                  Autonomous Diagnostics
                </p>

                <h1
                  className="
                    mt-3
                    text-4xl
                    lg:text-5xl
                    leading-[0.95]
                    font-black
                    tracking-[-0.05em]
                    text-white
                  "
                >
                  {report.title}
                </h1>

              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-wrap gap-3">

              {/* severity */}
              <div
                className={`
                  inline-flex items-center gap-3
                  rounded-full
                  border px-5 py-3
                  backdrop-blur-xl
                  ${severity.border}
                  ${severity.bg}
                `}
              >

                <div
                  className={`
                    w-2 h-2 rounded-full
                    animate-pulse
                    ${severity.dot}
                  `}
                />

                <span
                  className={`
                    text-[11px]
                    uppercase
                    tracking-[0.2em]
                    font-semibold
                    ${severity.text}
                  `}
                >
                  {report.severity}
                </span>

              </div>

              {/* confidence */}
              <div
                className="
                  inline-flex items-center gap-3
                  rounded-full
                  border border-emerald-400/20
                  bg-emerald-400/10
                  px-5 py-3
                "
              >

                <Sparkles
                  size={14}
                  className="text-emerald-300"
                />

                <span
                  className="
                    text-[11px]
                    uppercase
                    tracking-[0.2em]
                    font-semibold
                    text-emerald-300
                  "
                >
                  {Math.round(
                    report.confidence * 100
                  )}% confidence
                </span>

              </div>
            </div>
          </div>

          {/* summary cards */}
          <div className="grid lg:grid-cols-2 gap-6 mt-10">

            {/* RCA */}
            <div
              className="
                rounded-3xl
                border border-white/[0.06]
                bg-white/[0.03]
                p-6
              "
            >

              <div className="flex items-center gap-4 mb-5">

                <div
                  className="
                    w-12 h-12
                    rounded-2xl
                    border border-orange-500/15
                    bg-orange-500/10
                    flex items-center justify-center
                  "
                >

                  <AlertTriangle
                    size={20}
                    className="text-orange-300"
                  />

                </div>

                <div>

                  <p
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.22em]
                      text-zinc-600
                    "
                  >
                    Root Cause
                  </p>

                  <h3
                    className="
                      mt-1
                      text-xl
                      font-bold
                      text-white
                    "
                  >
                    Incident Analysis
                  </h3>

                </div>
              </div>

              <p
                className="
                  text-zinc-400
                  leading-relaxed
                "
              >
                {report.root_cause_summary}
              </p>
            </div>

            {/* FIX */}
            <div
              className="
                rounded-3xl
                border border-white/[0.06]
                bg-white/[0.03]
                p-6
              "
            >

              <div className="flex items-center gap-4 mb-5">

                <div
                  className="
                    w-12 h-12
                    rounded-2xl
                    border border-emerald-400/15
                    bg-emerald-400/10
                    flex items-center justify-center
                  "
                >

                  <ShieldCheck
                    size={20}
                    className="text-emerald-300"
                  />

                </div>

                <div>

                  <p
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.22em]
                      text-zinc-600
                    "
                  >
                    Recovery Strategy
                  </p>

                  <h3
                    className="
                      mt-1
                      text-xl
                      font-bold
                      text-white
                    "
                  >
                    Applied Remediation
                  </h3>

                </div>
              </div>

              <p
                className="
                  text-zinc-400
                  leading-relaxed
                "
              >
                {report.fix_applied}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* EVIDENCE */}
      {/* ================================================= */}

      {report.evidence &&
        report.evidence.length > 0 && (

          <section
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <div className="flex items-center gap-4 mb-8">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-cyan-500/15
                  bg-cyan-500/10
                  flex items-center justify-center
                "
              >

                <Activity
                  size={20}
                  className="text-cyan-300"
                />

              </div>

              <div>

                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    text-zinc-600
                  "
                >
                  Runtime Signals
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-black
                    text-white
                  "
                >
                  Evidence Streams
                </h2>

              </div>
            </div>

            <div className="space-y-3">

              {report.evidence.map(
                (e, i) => (

                  <div
                    key={i}
                    className="
                      flex items-start gap-4
                      rounded-2xl
                      border border-white/[0.06]
                      bg-white/[0.03]
                      px-5 py-4
                    "
                  >

                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2" />

                    <p
                      className="
                        font-mono
                        text-sm
                        text-zinc-400
                        break-all
                      "
                    >
                      {e}
                    </p>

                  </div>
                )
              )}
            </div>
          </section>
        )}

      {/* ================================================= */}
      {/* REMEDIATION */}
      {/* ================================================= */}

      {report.remediation_steps &&
        report.remediation_steps.length > 0 && (

          <section
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <div className="flex items-center gap-4 mb-8">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-orange-500/15
                  bg-orange-500/10
                  flex items-center justify-center
                "
              >

                <Sparkles
                  size={20}
                  className="text-orange-300"
                />

              </div>

              <div>

                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    text-zinc-600
                  "
                >
                  Autonomous Recovery
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-black
                    text-white
                  "
                >
                  Remediation Pipeline
                </h2>

              </div>
            </div>

            <div className="space-y-4">

              {report.remediation_steps.map(
                (step, i) => (

                  <div
                    key={i}
                    className="
                      flex gap-5
                      rounded-3xl
                      border border-white/[0.06]
                      bg-white/[0.03]
                      p-5
                    "
                  >

                    <div
                      className="
                        w-10 h-10
                        rounded-2xl
                        border border-orange-500/15
                        bg-orange-500/10
                        flex items-center justify-center
                        text-orange-300
                        font-black
                        shrink-0
                      "
                    >
                      {i + 1}
                    </div>

                    <p
                      className="
                        text-zinc-400
                        leading-relaxed
                        pt-2
                      "
                    >
                      {step}
                    </p>

                  </div>
                )
              )}
            </div>
          </section>
        )}

      {/* ================================================= */}
      {/* TIMELINE */}
      {/* ================================================= */}

      {report.timeline &&
        report.timeline.length > 0 && (

          <section
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <div className="flex items-center gap-4 mb-10">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-emerald-400/15
                  bg-emerald-400/10
                  flex items-center justify-center
                "
              >

                <Activity
                  size={20}
                  className="text-emerald-300"
                />

              </div>

              <div>

                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    text-zinc-600
                  "
                >
                  Autonomous Sequence
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-black
                    text-white
                  "
                >
                  Incident Timeline
                </h2>

              </div>
            </div>

            <div className="relative">

              {/* line */}
              <div
                className="
                  absolute left-[9px] top-0 bottom-0
                  w-px
                  bg-gradient-to-b
                  from-orange-500/40
                  via-white/10
                  to-transparent
                "
              />

              <div className="space-y-8">

                {report.timeline.map(
                  (t, i) => (

                    <div
                      key={i}
                      className="
                        relative
                        flex gap-6
                      "
                    >

                      {/* node */}
                      <div
                        className="
                          relative z-10
                          w-5 h-5 rounded-full
                          bg-orange-400
                          shadow-[0_0_20px_rgba(255,120,40,0.45)]
                          mt-1
                        "
                      />

                      {/* content */}
                      <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-3">

                          <span
                            className="
                              text-[11px]
                              uppercase
                              tracking-[0.18em]
                              text-zinc-600
                              font-mono
                            "
                          >
                            {t.timestamp}
                          </span>

                          <div
                            className="
                              rounded-full
                              border border-orange-500/15
                              bg-orange-500/10
                              px-3 py-1
                              text-[10px]
                              uppercase
                              tracking-[0.2em]
                              text-orange-300
                            "
                          >
                            EVENT
                          </div>
                        </div>

                        <div
                          className="
                            mt-4
                            rounded-3xl
                            border border-white/[0.06]
                            bg-white/[0.03]
                            p-5
                          "
                        >

                          <p
                            className="
                              text-zinc-400
                              leading-relaxed
                            "
                          >
                            {t.event}
                          </p>

                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}

      {/* ================================================= */}
      {/* PR */}
      {/* ================================================= */}

      {report.pr_description && (

        <section
          className="
            rounded-[34px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
            p-8
          "
        >

          <div className="flex items-center gap-4 mb-8">

            <div
              className="
                w-12 h-12
                rounded-2xl
                border border-white/[0.08]
                bg-white/[0.03]
                flex items-center justify-center
              "
            >

              <FileText
                size={20}
                className="text-white"
              />

            </div>

            <div>

              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.22em]
                  text-zinc-600
                "
              >
                GitHub Integration
              </p>

              <h2
                className="
                  mt-1
                  text-2xl
                  font-black
                  text-white
                "
              >
                Pull Request Summary
              </h2>

            </div>
          </div>

          <div
            className="
              rounded-[30px]
              border border-white/[0.06]
              bg-[#050505]
              p-6
              overflow-x-auto
            "
          >

            <pre
              className="
                whitespace-pre-wrap
                leading-relaxed
                font-mono
                text-sm
                text-zinc-400
              "
            >
              {report.pr_description}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}