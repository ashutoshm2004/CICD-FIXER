import type { PatchEntry } from "@/lib/types";

import {
  FileCode2,
  Sparkles,
  GitBranch,
} from "lucide-react";

/* ================================================= */
/* DIFF RENDER */
/* ================================================= */

function renderDiff(
  original: string | undefined,
  replacement: string | undefined
) {

  const origLines =
    (original ?? "").split("\n");

  const replLines =
    (replacement ?? "").split("\n");

  return (

    <div className="space-y-[2px]">

      {/* removed */}
      {origLines.map((line, i) => (

        <div
          key={`del-${i}`}
          className="
            group
            flex items-start gap-4
            rounded-xl
            border border-red-500/10
            bg-red-500/[0.05]
            px-4 py-2.5
            transition-all duration-300
            hover:bg-red-500/[0.08]
          "
        >

          {/* symbol */}
          <div
            className="
              mt-[2px]
              text-red-400
              font-black
              select-none
            "
          >
            —
          </div>

          {/* line */}
          <div
            className="
              flex-1
              whitespace-pre-wrap
              break-words
              font-mono
              text-[13px]
              leading-relaxed
              text-red-200
            "
          >
            {line || " "}
          </div>
        </div>
      ))}

      {/* added */}
      {replLines.map((line, i) => (

        <div
          key={`add-${i}`}
          className="
            group
            flex items-start gap-4
            rounded-xl
            border border-emerald-500/10
            bg-emerald-500/[0.05]
            px-4 py-2.5
            transition-all duration-300
            hover:bg-emerald-500/[0.08]
          "
        >

          {/* symbol */}
          <div
            className="
              mt-[2px]
              text-emerald-400
              font-black
              select-none
            "
          >
            +
          </div>

          {/* line */}
          <div
            className="
              flex-1
              whitespace-pre-wrap
              break-words
              font-mono
              text-[13px]
              leading-relaxed
              text-emerald-200
            "
          >
            {line || " "}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================= */
/* COMPONENT */
/* ================================================= */

export default function DiffViewer({
  patches,
}: {
  patches: PatchEntry[];
}) {

  if (
    !patches ||
    patches.length === 0
  ) {

    return (

      <div
        className="
          rounded-3xl
          border border-white/[0.06]
          bg-white/[0.02]
          p-8
          text-center
        "
      >

        <div
          className="
            w-16 h-16
            rounded-2xl
            border border-orange-500/10
            bg-orange-500/10
            flex items-center justify-center
            mx-auto
          "
        >

          <FileCode2
            size={28}
            className="text-orange-300"
          />

        </div>

        <h3
          className="
            mt-6
            text-xl
            font-bold
            text-white
          "
        >
          No Patch Generated
        </h3>

        <p
          className="
            mt-3
            text-zinc-500
            max-w-md
            mx-auto
          "
        >
          Autonomous agents did not generate
          remediation patches for this incident.
        </p>

      </div>
    );
  }

  return (

    <div className="space-y-6">

      {patches.map((patch, i) => (

        <div
          key={i}
          className="
            relative overflow-hidden
            rounded-[30px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
          "
        >

          {/* glow */}
          <div
            className="
              pointer-events-none
              absolute inset-0
              bg-[radial-gradient(circle_at_top_left,rgba(255,120,40,0.05),transparent_30%)]
            "
          />

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div
            className="
              relative z-10
              flex flex-col lg:flex-row lg:items-center justify-between gap-5
              border-b border-white/[0.05]
              px-6 py-5
              bg-white/[0.02]
            "
          >

            {/* left */}
            <div className="flex items-center gap-4">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-orange-500/10
                  bg-orange-500/10
                  flex items-center justify-center
                "
              >

                <FileCode2
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
                  Patched File
                </p>

                <h3
                  className="
                    mt-1
                    text-white
                    font-semibold
                    break-all
                  "
                >
                  {patch.file}
                </h3>

              </div>
            </div>

            {/* chip */}
            <div
              className="
                inline-flex items-center gap-2
                rounded-full
                border border-emerald-400/15
                bg-emerald-400/10
                px-4 py-2
                backdrop-blur-xl
              "
            >

              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.2em]
                  font-semibold
                  text-emerald-300
                "
              >
                PATCH GENERATED
              </span>

            </div>
          </div>

          {/* ================================================= */}
          {/* EXPLANATION */}
          {/* ================================================= */}

          {patch.explanation && (

            <div
              className="
                relative z-10
                border-b border-white/[0.05]
                px-6 py-5
              "
            >

              <div className="flex items-start gap-4">

                <div
                  className="
                    w-10 h-10
                    rounded-2xl
                    border border-orange-500/10
                    bg-orange-500/10
                    flex items-center justify-center
                    shrink-0
                  "
                >

                  <Sparkles
                    size={16}
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
                    AI Remediation Reasoning
                  </p>

                  <p
                    className="
                      mt-3
                      text-zinc-400
                      leading-relaxed
                    "
                  >
                    {patch.explanation}
                  </p>

                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* DIFF */}
          {/* ================================================= */}

          <div
            className="
              relative z-10
              p-5
              overflow-x-auto
              max-h-[500px]
              overflow-y-auto
            "
          >

            {/* terminal top */}
            <div
              className="
                flex items-center justify-between
                mb-5
                rounded-2xl
                border border-white/[0.05]
                bg-white/[0.02]
                px-5 py-3
              "
            >

              {/* left */}
              <div className="flex items-center gap-3">

                <div className="w-3 h-3 rounded-full bg-red-400" />

                <div className="w-3 h-3 rounded-full bg-orange-400" />

                <div className="w-3 h-3 rounded-full bg-emerald-400" />

              </div>

              {/* right */}
              <div
                className="
                  flex items-center gap-2
                  text-[10px]
                  uppercase
                  tracking-[0.2em]
                  text-zinc-600
                "
              >

                <GitBranch size={12} />

                Autonomous Recovery Diff

              </div>
            </div>

            {/* code */}
            <div className="space-y-[2px]">
              {renderDiff(
                patch.original,
                patch.replacement
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}