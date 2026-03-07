import { NextResponse } from "next/server";
import { createLabel, createOrUpdateFile } from "@/lib/github";
import { COLUMNS } from "@/lib/columns";
import { DEFAULT_PIPELINE_YML, DEFAULT_WORKFLOW_YML } from "@/lib/defaults";

export async function POST() {
  try {
    const results: string[] = [];

    // 1. Create status labels
    for (const col of COLUMNS) {
      if (col.label) {
        await createLabel(col.label, col.color, `b2a pipeline: ${col.title}`);
        results.push(`Label: ${col.label} (${col.color})`);
      }
    }

    // 2. Create .b2a/pipeline.yml
    await createOrUpdateFile(
      ".b2a/pipeline.yml",
      DEFAULT_PIPELINE_YML,
      "chore: add b2a pipeline config"
    );
    results.push("File: .b2a/pipeline.yml");

    // 3. Create .github/workflows/b2a-agent.yml
    await createOrUpdateFile(
      ".github/workflows/b2a-agent.yml",
      DEFAULT_WORKFLOW_YML,
      "chore: add b2a unified agent workflow"
    );
    results.push("File: .github/workflows/b2a-agent.yml");

    return NextResponse.json({ success: true, created: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to onboard repo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
