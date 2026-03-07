import { NextRequest, NextResponse } from "next/server";
import { moveIssue, getIssues } from "@/lib/github";
import { getColumnById, getStatusLabels } from "@/lib/columns";
import { MoveRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: MoveRequest = await request.json();
    const { issueNumber, toColumnId } = body;

    if (!issueNumber || !toColumnId) {
      return NextResponse.json({ error: "issueNumber and toColumnId are required" }, { status: 400 });
    }

    const targetColumn = getColumnById(toColumnId);
    if (!targetColumn) {
      return NextResponse.json({ error: `Unknown column: ${toColumnId}` }, { status: 400 });
    }

    // Get current issue labels to know which status labels to remove
    const issues = await getIssues();
    const issue = issues.find((i) => i.number === issueNumber);
    if (!issue) {
      return NextResponse.json({ error: `Issue #${issueNumber} not found` }, { status: 404 });
    }

    const currentStatusLabels = getStatusLabels(issue.labels);

    await moveIssue(issueNumber, currentStatusLabels, targetColumn.label);

    return NextResponse.json({ success: true, column: toColumnId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to move issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
