import type { PatchEntry } from "@/lib/types";

function renderDiff(original: string | undefined, replacement: string | undefined) {
  const origLines = (original ?? "").split("\n");
  const replLines = (replacement ?? "").split("\n");

  return (
    <div className="font-mono text-xs leading-5">
      {origLines.map((line, i) => (
        <div key={`del-${i}`} className="bg-red-950/40 text-red-400 px-2">
          - {line}
        </div>
      ))}
      {replLines.map((line, i) => (
        <div key={`add-${i}`} className="bg-green-950/40 text-green-400 px-2">
          + {line}
        </div>
      ))}
    </div>
  );
}

export default function DiffViewer({ patches }: { patches: PatchEntry[] }) {
  if (!patches || patches.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">No file patches generated.</p>
    );
  }

  return (
    <div className="space-y-4">
      {patches.map((patch, i) => (
        <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
          {/* File header */}
          <div className="flex items-center justify-between bg-gray-800/60 px-3 py-1.5">
            <span className="font-mono text-xs text-slate-300">{patch.file}</span>
          </div>

          {/* Explanation */}
          {patch.explanation && (
            <div className="px-3 py-1.5 bg-gray-950/50 border-b border-gray-800">
              <p className="text-xs text-slate-400">{patch.explanation}</p>
            </div>
          )}

          {/* Diff */}
          <div className="overflow-x-auto bg-gray-950 max-h-48 overflow-y-auto scrollbar-thin p-2">
            {renderDiff(patch.original, patch.replacement)}
          </div>
        </div>
      ))}
    </div>
  );
}