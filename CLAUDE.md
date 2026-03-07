# b2a

This repository implements the **board-to-agent pipeline** — a custom Kanban board that drives autonomous Claude Code agents via GitHub Actions. The board applies `status:*` labels to issues, which trigger a unified agent workflow.

## How It Works

A human drags a card on the board to start the pipeline. The board applies labels, which trigger agents:

1. **Todo** -> Human adds issues here (no label, no workflow)
2. **Planning** -> `status:planning` label triggers Planning agent (Opus) to analyse and plan
3. **In Progress** -> `status:in-progress` label triggers Implementation agent (Sonnet) to code
4. **Review** -> `status:review` label triggers Review agent (Sonnet) to review, test, and approve/reject
5. **Done** -> Pipeline complete (issue closed)
- **Blocked** -> `status:blocked` label notifies human for intervention

## Architecture

```
board/ (Next.js)          .b2a/pipeline.yml         .github/workflows/b2a-agent.yml
┌──────────────┐          ┌─────────────────┐       ┌──────────────────────┐
│ Drag card    │──label──>│ Stage config    │<──read─│ Single workflow      │
│ between cols │          │ (prompts,models)│       │ (matches label to    │
│              │<─poll────│                 │       │  stage, runs agent)  │
└──────────────┘          └─────────────────┘       └──────────────────────┘
```

- **Board UI** (`board/`): Next.js Kanban board running in Docker. Applies/removes `status:*` labels via GitHub API.
- **Pipeline config** (`.b2a/pipeline.yml`): Defines stages, prompts, models, and transitions. The single source of truth.
- **Unified workflow** (`.github/workflows/b2a-agent.yml`): One workflow handles all stages by reading the pipeline config at runtime.

## Stack

- **Board**: Next.js 14 (TypeScript, Tailwind CSS, @hello-pangea/dnd)
- **Orchestration**: GitHub Actions + `anthropics/claude-code-action@v1`
- **Pipeline config**: YAML (`.b2a/pipeline.yml`)
- **API**: GitHub REST API via `@octokit/rest` (board) and `gh` CLI (agents)
- **Runtime**: Docker Compose (local), GitHub Actions (CI)

## Running Locally

```bash
# Copy env template and fill in your values
cp .env.example .env

# Start the board
docker compose up

# Board available at http://localhost:3000
```

Required env vars:
- `GITHUB_TOKEN` — Personal Access Token with `repo` scope
- `GITHUB_OWNER` — GitHub org or username
- `GITHUB_REPO` — Repository name

## Onboarding a Repo

The board has an "Onboard Repo" button that creates:
1. Status labels (`status:planning`, `status:in-progress`, `status:review`, `status:done`, `status:blocked`)
2. Pipeline config (`.b2a/pipeline.yml`)
3. Unified workflow (`.github/workflows/b2a-agent.yml`)

The repo also needs `CLAUDE_CODE_OAUTH_TOKEN` set as a repository secret.

## Conventions

### Commit Messages

```
type: description (#ISSUE_NUMBER)
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### Branches

- Never commit directly to `main`
- Branch names: `feat/issue-NUMBER-short-description` or `fix/issue-NUMBER-short-description`
- All PRs must reference the issue number in the title or body

### Code Style

- Prefer clarity over cleverness
- Add comments for non-obvious logic
- Keep functions small and single-purpose

## Agent Constraints

All agents must:

1. Always read the full issue (including comments) before taking any action
2. Post a comment on the issue explaining what was done before advancing
3. Advance the pipeline by swapping labels (`gh issue edit --remove-label ... --add-label ...`)
4. Reference the issue number in all commits
5. Never force-push or rewrite history
6. If blocked or uncertain, swap to `status:blocked` and explain why in a comment

## Pipeline Config

The pipeline is defined in `.b2a/pipeline.yml`. Each stage maps a label to a prompt, model, and transition:

```yaml
pipeline:
  - id: planning
    label: "status:planning"
    model: "claude-opus-4-6"
    next: "status:in-progress"
    blocked: "status:blocked"
    prompt: |
      You are the planning agent...
```

To add a new stage, add an entry to `pipeline.yml`. No workflow changes needed.

## Circuit Breaker

The implementation agent checks for `cycles:` labels before running. If more than 3 `cycles:` labels exist, the card is automatically moved to **Blocked**.

When resolving a blocked card:
1. Read the full issue comment history to understand the loop
2. Remove all `cycles:` labels from the issue
3. Update the issue body or add a comment clarifying the correct approach
4. Move the card back to **In Progress**
