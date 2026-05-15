import type {
  WorkflowSummary,
  WorkflowDetail,
  DemoScenario,
  TriggerDemoResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Workflows ───────────────────────────────────────────────────────────────

export async function listWorkflows(
  limit = 20,
  status?: string
): Promise<WorkflowSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return request<WorkflowSummary[]>(`/workflows/?${params}`);
}

export async function getWorkflow(id: string): Promise<WorkflowDetail> {
  return request<WorkflowDetail>(`/workflows/${id}`);
}

export async function getWorkflowLogs(id: string): Promise<{ logs: string }> {
  return request<{ logs: string }>(`/workflows/${id}/logs`);
}

export async function getAgentTrace(
  id: string
): Promise<{ trace: WorkflowDetail["agent_trace"] }> {
  return request(`/workflows/${id}/trace`);
}

export async function deleteWorkflow(id: string): Promise<{ deleted: string }> {
  return request(`/workflows/${id}`, { method: "DELETE" });
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export async function listScenarios(): Promise<{ scenarios: DemoScenario[] }> {
  return request<{ scenarios: DemoScenario[] }>("/demo/scenarios");
}

export async function triggerDemo(
  scenarioKey: string
): Promise<TriggerDemoResponse> {
  return request<TriggerDemoResponse>(`/demo/trigger/${scenarioKey}`, {
    method: "POST",
  });
}

export async function resetDemo(): Promise<{ deleted: number; message: string }> {
  return request("/demo/reset", { method: "DELETE" });
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}