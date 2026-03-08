import { ColumnDef } from "./types";

export const COLUMNS: ColumnDef[] = [
  { id: "todo", title: "Todo", label: null, color: "#6B7280" },
  { id: "planning", title: "Planning", label: "status:planning", color: "#0052CC" },
  { id: "in-progress", title: "In Progress", label: "status:in-progress", color: "#E36209" },
  { id: "review", title: "Review", label: "status:review", color: "#6F42C1" },
  { id: "done", title: "Done", label: "status:done", color: "#0E8A16" },
  { id: "blocked", title: "Blocked", label: "status:blocked", color: "#CB2431" },
];

export const COLUMN_ORDER = COLUMNS.map((c) => c.id);

const STATUS_PREFIX = "status:";

export function getColumnForIssue(labels: { name: string }[], state?: string): string {
  const statusLabel = labels.find((l) => l.name.startsWith(STATUS_PREFIX));
  if (!statusLabel) {
    // Closed issues with no status label belong in Done
    return state === "closed" ? "done" : "todo";
  }
  const col = COLUMNS.find((c) => c.label === statusLabel.name);
  return col ? col.id : "todo";
}

export function getColumnById(id: string): ColumnDef | undefined {
  return COLUMNS.find((c) => c.id === id);
}

export function getStatusLabels(labels: { name: string }[]): string[] {
  return labels.filter((l) => l.name.startsWith(STATUS_PREFIX)).map((l) => l.name);
}

export function getCycleCount(labels: { name: string }[]): number {
  return labels.filter((l) => l.name.startsWith("cycles:")).length;
}
