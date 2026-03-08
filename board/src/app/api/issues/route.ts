import { NextResponse } from "next/server";
import { getIssues, createIssue } from "@/lib/github";
import { COLUMNS, COLUMN_ORDER, getColumnForIssue } from "@/lib/columns";
import { BoardData } from "@/lib/types";

export async function GET() {
  try {
    const issues = await getIssues();

    const boardData: BoardData = {
      columns: {},
      columnOrder: COLUMN_ORDER,
    };

    // Initialize empty columns
    for (const col of COLUMNS) {
      boardData.columns[col.id] = { def: col, issues: [] };
    }

    // Assign issues to columns based on labels
    for (const issue of issues) {
      const columnId = getColumnForIssue(issue.labels, issue.state);
      if (boardData.columns[columnId]) {
        boardData.columns[columnId].issues.push(issue);
      }
    }

    return NextResponse.json(boardData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch issues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const issue = await createIssue(title.trim());
    return NextResponse.json(issue);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
