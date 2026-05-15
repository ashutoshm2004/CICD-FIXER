"use client";

import { useEffect, useState } from "react";
import { listScenarios, triggerDemo } from "@/lib/api";
import type { DemoScenario } from "@/lib/types";

export default function DemoPanel() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [launched, setLaunched] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    listScenarios()
      .then((r) => setScenarios(r.scenarios))
      .catch(console.error);
  }, []);

  async function run(key: string, name: string) {
    setTriggering(key);
    try {
      const res = await triggerDemo(key);
      setLaunched({ id: res.workflow_id, name });
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div className="space-y-3">
      {launched && (
        <div className="card border-green-800 bg-green-900/20 text-sm">
          <p className="text-green-400 font-medium">🚀 {launched.name} launched!</p>
          <a
            href={`/workflows/${launched.id}`}
            className="text-xs text-brand-400 hover:underline mt-1 block"
          >
            Watch live →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {scenarios.map((s) => (
          <button
            key={s.key}
            onClick={() => run(s.key, s.display_name)}
            disabled={!!triggering}
            className="flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700
                       border border-gray-700 rounded-lg text-left transition-colors disabled:opacity-50"
          >
            <span className="text-sm text-white">{s.display_name}</span>
            {triggering === s.key ? (
              <span className="w-4 h-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            ) : (
              <span className="text-xs text-slate-500">▶</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}