# b2a — Board-to-Agent Pipeline

## Implementation Specification

-----

## Overview

**b2a** is a GitHub-native agentic pipeline where a Kanban board (GitHub Projects) drives autonomous Claude Code agents via GitHub Actions. A human moves a card from Backlog to In Progress to start the pipeline. From that point, specialised Claude agents handle each subsequent stage autonomously — implementing, reviewing, testing, and closing work — communicating via issue comments and moving cards between columns when their stage is complete.

There is no custom infrastructure. The entire system is GitHub Actions + the official `anthropics/claude-code-action` + the `gh` CLI.

-----

## Repository Structure

```
b2a/
├── CLAUDE.md                          # Project context, coding standards, conventions
├── README.md                          # This file
└── .github/
    └── workflows/
        ├── agent-implement.yml        # Triggered when card moves to "In Progress"
        ├── agent-review.yml           # Triggered when card moves to "Review"
        ├── agent-test.yml             # Triggered when card moves to "Testing"
        └── agent-blocked.yml          # Triggered when circuit breaker fires or card moves to "Blocked"
```

-----

## Kanban Board Columns

|Column     |Trigger              |Actor                         |
|-----------|---------------------|------------------------------|
|Backlog    |None                 |Human adds cards here         |
|In Progress|`agent-implement.yml`|Implementation agent          |
|Review     |`agent-review.yml`   |Review agent                  |
|Testing    |`agent-test.yml`     |Test agent                    |
|Done       |None                 |Final state, no workflow fires|
|Blocked    |`agent-blocked.yml`  |Notifies human, halts pipeline|

-----

## GitHub Projects Setup

### Project Configuration

- Create a GitHub Project (Projects v2) linked to the b2a repository
- Add a **Status** single-select field with the column values listed above
- Each project item must be linked to a GitHub Issue in the b2a repo — this is how agents access work context

### Webhook / Trigger Mechanism

GitHub Actions supports `projects_v2_item.edited` as a workflow trigger. Each workflow file watches for a card moving to its specific column.

```yaml
on:
  projects_v2_item:
    types: [edited]
```

Each workflow filters on the `status` field change to its target column name.

-----

## Authentication & Secrets

### Required Secrets (set in repo Settings → Secrets → Actions)

|Secret                   |Description                                                                                                   |
|-------------------------|--------------------------------------------------------------------------------------------------------------|
|`CLAUDE_CODE_OAUTH_TOKEN`|Generated locally by running `claude setup-token`. Uses your Claude Pro/Max subscription — no API key billing.|
|`PROJECT_ID`             |The GitHub Projects v2 node ID (obtain via GraphQL or `gh project list`)                                      |

### GitHub Token

`GITHUB_TOKEN` is automatically available in every Actions run. No setup needed. The `gh` CLI uses it automatically for issue reads, comments, and project card mutations.

### Initial Setup

Run the following from your terminal to configure the GitHub App and secrets in one step:

```bash
claude
/install-github-app
```

This guides you through installing the Anthropic GitHub App on your repo and storing the OAuth token.

-----

## Workflow Files

### Shared Pattern

All four workflow files follow the same structure:

1. Filter the trigger to the correct column
1. Extract the issue number from the project item
1. Check out the repo
1. Run `anthropics/claude-code-action@v1` with a column-specific prompt
1. Claude uses `gh` CLI internally to read issue context, make commits, move the card, and post comments

### `agent-implement.yml`

```yaml
name: Implementation Agent

on:
  projects_v2_item:
    types: [edited]

jobs:
  implement:
    if: github.event.changes.field_value.field_name == 'Status' &&
        github.event.changes.field_value.to.name == 'In Progress'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Check circuit breaker
        id: breaker
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ISSUE_NUMBER: ${{ github.event.projects_v2_item.content_node_id }}
        run: |
          # Extract issue number from node id and check review-cycle label count
          # If cycles > 3, move card to Blocked and exit
          CYCLES=$(gh issue view $ISSUE_NUMBER --json labels \
            --jq '[.labels[].name | select(startswith("cycles:"))] | length')
          echo "cycles=$CYCLES" >> $GITHUB_OUTPUT
          if [ "$CYCLES" -gt "3" ]; then
            echo "tripped=true" >> $GITHUB_OUTPUT
          else
            echo "tripped=false" >> $GITHUB_OUTPUT
          fi

      - name: Move to Blocked if circuit breaker tripped
        if: steps.breaker.outputs.tripped == 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh project item-edit \
            --project-id ${{ secrets.PROJECT_ID }} \
            --id ${{ github.event.projects_v2_item.node_id }} \
            --field-id STATUS_FIELD_ID \
            --single-select-option-id BLOCKED_OPTION_ID
          gh issue comment $ISSUE_NUMBER \
            --body "⚠️ Circuit breaker tripped after 3 review cycles. Moving to Blocked for human review."

      - name: Run Implementation Agent
        if: steps.breaker.outputs.tripped == 'false'
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            You are the implementation agent for the b2a pipeline.

            Your job:
            1. Run `gh issue view ${{ github.event.projects_v2_item.content_node_id }} --json title,body,comments,labels` to read the full issue context including any previous review feedback
            2. Implement the changes described in the issue. Follow the standards in CLAUDE.md.
            3. If there is prior review feedback in the issue comments, address all of it before proceeding.
            4. Write or update tests as appropriate.
            5. Commit your changes with a meaningful commit message referencing the issue number.
            6. Post a comment on the issue summarising what you did.
            7. Move the project card to the "Review" column using the gh CLI.

            Do not move the card to Review until the implementation is complete and committed.
            If you cannot complete the task, move the card to "Blocked" and explain why in a comment.
```

-----

### `agent-review.yml`

```yaml
name: Review Agent

on:
  projects_v2_item:
    types: [edited]

jobs:
  review:
    if: github.event.changes.field_value.field_name == 'Status' &&
        github.event.changes.field_value.to.name == 'Review'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Review Agent
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            You are the code review agent for the b2a pipeline.

            Your job:
            1. Run `gh issue view ${{ github.event.projects_v2_item.content_node_id }} --json title,body,comments,labels` to read the full issue and history.
            2. Review the code changes related to this issue against the standards in CLAUDE.md.
            3. Check for: correctness, edge cases, test coverage, code style, security issues.

            If the implementation is acceptable:
            - Post an approval comment on the issue
            - Move the card to "Testing"

            If changes are required:
            - Post a detailed comment on the issue listing every specific change needed
            - Add a label `cycles:N` where N increments the existing cycle count (check existing labels)
            - Move the card back to "In Progress"

            Be specific in feedback. The implementation agent only has your comments to work from.
```

-----

### `agent-test.yml`

```yaml
name: Test Agent

on:
  projects_v2_item:
    types: [edited]

jobs:
  test:
    if: github.event.changes.field_value.field_name == 'Status' &&
        github.event.changes.field_value.to.name == 'Testing'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Test Agent
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            You are the test agent for the b2a pipeline.

            Your job:
            1. Run `gh issue view ${{ github.event.projects_v2_item.content_node_id }} --json title,body,comments,labels` to read context.
            2. Run the full test suite using the appropriate command for this project (check CLAUDE.md or package.json/Makefile).
            3. If all tests pass:
               - Post a comment summarising test results
               - Move the card to "Done"
            4. If tests fail:
               - Post a comment with the specific failures
               - Move the card back to "In Progress" for the implementation agent to fix
               - Add a `cycles:N` label incrementing the cycle count

            Do not move to Done unless the test suite passes cleanly.
```

-----

### `agent-blocked.yml`

```yaml
name: Blocked Notification

on:
  projects_v2_item:
    types: [edited]

jobs:
  notify:
    if: github.event.changes.field_value.field_name == 'Status' &&
        github.event.changes.field_value.to.name == 'Blocked'
    runs-on: ubuntu-latest
    permissions:
      issues: write

    steps:
      - name: Notify human
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh issue comment ${{ github.event.projects_v2_item.content_node_id }} \
            --body "🚨 This card has been moved to **Blocked** and requires human intervention. Please review the issue history, resolve the blocker, and move the card to the appropriate column to resume the pipeline."
```

-----

## CLAUDE.md

The repo-level `CLAUDE.md` should include:

- Project description and purpose
- Language/framework and version
- How to run tests (exact command)
- Coding standards and conventions
- Commit message format
- Any constraints agents must respect (e.g. never commit to main directly, always reference issue number)
- How to find the project ID and field IDs for `gh project item-edit` calls

Example:

```markdown
# b2a

This repository implements the board-to-agent pipeline.

## Stack
- Node.js 20
- Tests: `npm test`

## Conventions
- Commits: `fix: description (#ISSUE_NUMBER)`
- Never commit directly to main
- All PRs must reference an issue

## Project Board
- Project ID: PVT_xxxxxxxxxxxx
- Status Field ID: PVTSSF_xxxxxxxxxxxx
- Column option IDs:
  - In Progress: xxxxxxxxxxxx
  - Review: xxxxxxxxxxxx
  - Testing: xxxxxxxxxxxx
  - Done: xxxxxxxxxxxx
  - Blocked: xxxxxxxxxxxx
```

-----

## Circuit Breaker Logic

### Problem

Without a circuit breaker, the implementation and review agents can loop indefinitely if the review agent keeps rejecting the implementation agent's output.

### Mechanism

- The review agent adds a label `cycles:1`, `cycles:2`, `cycles:3` each time it sends work back
- The implementation agent checks for any `cycles:` label at the start of each run
- If the count exceeds **3**, the card is moved to **Blocked** and a comment is posted for human intervention
- Labels are not removed — they accumulate as an audit trail
- A human resolving a blocked card should remove `cycles:` labels before moving the card forward

### Label Format

```
cycles:1
cycles:2
cycles:3
```

-----

## Human Intervention

Humans can participate at any point by:

- **Commenting on the issue** — the next agent run will see the comment and factor it into its work
- **Moving a card manually** — triggers the appropriate workflow for that column
- **Moving a Blocked card** — after resolving the blocker, move the card to the appropriate column (usually In Progress) to restart the pipeline
- **Editing the issue body** — agents always re-read the full issue on each run

-----

## Getting the Project Field IDs

The `gh project item-edit` command requires node IDs for the project, status field, and each option. Retrieve them with:

```bash
# List projects
gh project list --owner YOUR_ORG

# Get field and option IDs
gh api graphql -f query='
{
  node(id: "PROJECT_NODE_ID") {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name }
          }
        }
      }
    }
  }
}'
```

Store all IDs in `CLAUDE.md` so agents can reference them without making API calls.

-----

## Implementation Order for Claude Code

Build in this order:

1. **Create the GitHub Project** with the correct columns and link it to the repo
1. **Write `CLAUDE.md`** with project context and all field IDs populated
1. **Implement `agent-blocked.yml`** first — simplest workflow, good smoke test
1. **Implement `agent-implement.yml`** — core agent, most complex
1. **Implement `agent-review.yml`**
1. **Implement `agent-test.yml`**
1. **End-to-end test** — create an issue, add it to the board, move to In Progress, observe the pipeline

-----

## Known Limitations & Notes

- `projects_v2_item` triggers require the workflow to be on the default branch to fire
- Field IDs are stable but option IDs can change if columns are deleted and recreated — keep CLAUDE.md updated
- The `gh project item-edit` command syntax may require `--project-id` to be the numeric project number rather than the node ID depending on `gh` version — verify with `gh project list`
- Claude Code OAuth token is tied to your Claude.ai subscription tier — Max plan recommended for longer agentic runs
- Runs on `ubuntu-latest` (GitHub-hosted) by default; swap `runs-on` to your ARC runner label if using self-hosted K8s runners
