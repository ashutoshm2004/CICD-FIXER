"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RepositoryTrigger() {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [workflow, setWorkflow] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function triggerRepository() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/github/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_url: repoUrl,
            branch,
            workflow_name: workflow || null,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setMessage(
            `ℹ️ ${data.message}`
        );
        return;
      }

      setMessage(`✅ ${data.message}`);
      setRepoUrl("");
      setWorkflow("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">
          Connect GitHub Repository
        </h2>

        <p className="text-slate-400 text-sm mt-1">
          Trigger AI debugging on a real failed GitHub workflow.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Repository URL
          </label>

          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Branch
          </label>

          <input
            type="text"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Workflow Name (Optional)
          </label>

          <input
            type="text"
            placeholder="CI / Build / Deploy"
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={triggerRepository}
          disabled={loading || !repoUrl}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed py-3 font-medium text-white transition"
        >
          {loading
            ? "Analyzing Repository..."
            : "🚀 Analyze Repository"}
        </button>

        {message && (
          <div className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}