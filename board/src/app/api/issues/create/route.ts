import { NextRequest, NextResponse } from "next/server";
import { createIssue } from "@/lib/github";
import { CreateIssueRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateIssueRequest = await request.json();
    const { title, body: issueBody } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const issue = await createIssue(title.trim(), issueBody);

    return NextResponse.json({ success: true, issue });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
