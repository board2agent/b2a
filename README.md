# b2a — Board-to-Agent Pipeline

A custom Kanban board that drives autonomous Claude Code agents via GitHub Actions. Drag a card between columns, and agents handle planning, implementation, and review automatically.

## Quick Start

```bash
# Clone and configure
git clone https://github.com/board2agent/b2a.git
cd b2a
cp .env.example .env
# Edit .env with your GitHub PAT, owner, and repo

# Start the board
docker compose up

# Open http://localhost:3000
```

## How It Works

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌────────┐    ┌──────┐
│  Todo   │───>│ Planning │───>│ In Progress │───>│ Review │───>│ Done │
│         │    │  (Opus)  │    │  (Sonnet)   │    │(Sonnet)│    │      │
└─────────┘    └──────────┘    └─────────────┘    └────────┘    └──────┘
  human          agent            agent             agent
  drags          plans            codes             reviews
                                                      │
                                                      ├──> approve -> Done
                                                      └──> reject  -> In Progress
```

1. **You** drag a card from Todo to Planning
2. The board applies `status:planning` label via GitHub API
3. GitHub Actions fires the unified workflow
4. The workflow reads `.b2a/pipeline.yml` to find the right prompt and model
5. Claude agent runs, does its work, swaps labels to advance the pipeline
6. The board polls GitHub and updates automatically

## Architecture

| Component | Purpose |
|---|---|
| `board/` | Next.js Kanban board (Docker Compose) |
| `.b2a/pipeline.yml` | Pipeline config — stages, prompts, models |
| `.github/workflows/b2a-agent.yml` | Single unified workflow for all stages |

### Why Labels?

GitHub Projects `projects_v2_item` doesn't work as an Actions trigger (despite being documented). Labels on issues (`issues: [labeled]`) are the reliable alternative. The board abstracts this away — you just drag cards.

## Pipeline Config

The pipeline is defined in `.b2a/pipeline.yml`:

```yaml
pipeline:
  - id: planning
    label: "status:planning"
    color: "#0052CC"
    model: "claude-opus-4-6"
    next: "status:in-progress"
    prompt: |
      You are the planning agent...

  - id: in-progress
    label: "status:in-progress"
    color: "#E36209"
    model: "claude-sonnet-4-6"
    circuit_breaker: 3
    prompt: |
      You are the implementation agent...
```

Adding a new stage = adding an entry to this file. No workflow changes needed.

## Onboarding a Repo

To connect a GitHub repository to the b2a pipeline, complete these steps:

### 1. Install the Claude Code GitHub App

Go to [github.com/apps/claude](https://github.com/apps/claude) and install it on the organization or account that owns the target repo. Grant it access to the specific repo (or all repos).

### 2. Set the `CLAUDE_CODE_OAUTH_TOKEN` secret

This links the agent to your Claude subscription (no API key needed).

1. Run `claude setup-token` in your terminal to generate an OAuth token
2. Go to the repo's **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `CLAUDE_CODE_OAUTH_TOKEN`, Value: the token from step 1

### 3. Create pipeline resources

Click **"Onboard Repo"** in the board UI (http://localhost:3000). This automatically creates:

- **Labels**: `status:planning` (blue), `status:in-progress` (orange), `status:review` (purple), `status:done` (green), `status:blocked` (red)
- **Pipeline config**: `.b2a/pipeline.yml` — defines stages, prompts, models, and transitions
- **Workflow**: `.github/workflows/b2a-agent.yml` — single unified workflow that reads the pipeline config

Alternatively, you can create these manually by copying from this repo.

### 4. Configure the board

Set your `.env` file (in `board/`) to point at the target repo:

```
GITHUB_TOKEN=ghp_your_pat
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
```

### 5. Verify

1. Create an issue in the target repo
2. Drag it from **Todo** to **Planning** on the board
3. Check that the `status:planning` label appears on the issue
4. Check that the `b2a Agent` workflow fires in the repo's Actions tab

## Circuit Breaker

If the review agent rejects implementation 3+ times, the card automatically moves to **Blocked** for human intervention. This prevents infinite agent loops.

## Column Colors

| Column | Color | Label |
|---|---|---|
| Todo | Grey | _(none)_ |
| Planning | Blue | `status:planning` |
| In Progress | Orange | `status:in-progress` |
| Review | Purple | `status:review` |
| Done | Green | `status:done` |
| Blocked | Red | `status:blocked` |

## Requirements

- Docker Desktop
- GitHub Personal Access Token (see below)
- `CLAUDE_CODE_OAUTH_TOKEN` secret on the target repo (run `claude setup-token` to generate)

## GitHub Personal Access Token (PAT)

The board needs a PAT to interact with issues, labels, and repo contents.

### Creating a PAT

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) (classic) or [Fine-grained tokens](https://github.com/settings/personal-access-tokens) (newer)
2. Generate a new token with the required permissions below
3. Copy it into your `.env` file as `GITHUB_TOKEN`

### Required Permissions

**Classic PAT:**
- `repo` scope (full control of private repositories) — covers issues, labels, and contents

If the repo is **public** and you don't need the onboard feature, `public_repo` alone is sufficient.

**Fine-grained PAT:**

| Permission | Access | Used For |
|---|---|---|
| Issues | Read and Write | Reading issues, applying/removing labels, posting comments |
| Contents | Read and Write | Creating pipeline config and workflow files (onboard feature) |

## Development

```bash
# Run with hot reload (uses docker-compose.override.yml)
docker compose up

# Or run natively
cd board
npm install
npm run dev
```
