import { NextRequest, NextResponse } from "next/server";
import { getIssueComments } from "@/lib/github";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return NextResponse.json({ error: "Invalid issue number" }, { status: 400 });
    }

    const comments = await getIssueComments(issueNumber);
    return NextResponse.json(comments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
