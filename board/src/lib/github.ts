import { Octokit } from "@octokit/rest";
import { BoardIssue, IssueComment } from "./types";

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return new Octokit({ auth: token });
}

function getRepo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) throw new Error("GITHUB_OWNER and GITHUB_REPO must be set");
  return { owner, repo };
}

export async function getIssues(): Promise<BoardIssue[]> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  // Fetch open issues and recently closed issues (for Done column)
  const [openRes, closedRes] = await Promise.all([
    octokit.issues.listForRepo({
      owner, repo, state: "open", per_page: 100, sort: "updated", direction: "desc",
    }),
    octokit.issues.listForRepo({
      owner, repo, state: "closed", per_page: 30, sort: "updated", direction: "desc",
    }),
  ]);

  const data = [...openRes.data, ...closedRes.data];

  // Filter out pull requests (GitHub API returns them mixed with issues)
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? null,
      state: issue.state,
      assignee: issue.assignee
        ? { login: issue.assignee.login, avatar_url: issue.assignee.avatar_url }
        : null,
      labels: (issue.labels || [])
        .filter((l): l is { name: string; color: string } => typeof l === "object" && l !== null && "name" in l)
        .map((l) => ({ name: l.name!, color: l.color || "ededed" })),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      html_url: issue.html_url,
    }));
}

export async function getIssueComments(issueNumber: number): Promise<IssueComment[]> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const { data } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 50,
  });

  return data.map((comment) => ({
    id: comment.id,
    body: comment.body || "",
    user: {
      login: comment.user?.login || "unknown",
      avatar_url: comment.user?.avatar_url || "",
    },
    created_at: comment.created_at,
    html_url: comment.html_url,
  }));
}

export async function moveIssue(
  issueNumber: number,
  removeLabels: string[],
  addLabel: string | null
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  // Remove old status labels
  for (const label of removeLabels) {
    try {
      await octokit.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
    } catch {
      // Label might already be removed
    }
  }

  // Add new status label (if not moving to Todo, which has no label)
  if (addLabel) {
    await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [addLabel] });
  }
}

export async function createIssue(title: string): Promise<BoardIssue> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const { data: issue } = await octokit.issues.create({ owner, repo, title });

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    state: issue.state,
    assignee: issue.assignee
      ? { login: issue.assignee.login, avatar_url: issue.assignee.avatar_url }
      : null,
    labels: [],
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    html_url: issue.html_url,
  };
}

export async function createLabel(name: string, color: string, description?: string): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  try {
    await octokit.issues.createLabel({
      owner,
      repo,
      name,
      color: color.replace("#", ""),
      description,
    });
  } catch (error: unknown) {
    // Label already exists — update it
    if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 422) {
      await octokit.issues.updateLabel({
        owner,
        repo,
        name,
        color: color.replace("#", ""),
        description,
      });
    } else {
      throw error;
    }
  }
}

export async function createOrUpdateFile(
  path: string,
  content: string,
  message: string
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  // Check if file exists to get its SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && "sha" in data) {
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha,
  });
}
