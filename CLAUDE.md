# b2a

This repository implements the **board-to-agent pipeline** — a GitHub-native system where a Kanban board (GitHub Projects v2) drives autonomous Claude Code agents via GitHub Actions.

## How It Works

A human moves a card from **Todo -> Planning** to start the pipeline. Agents then handle each stage:

1. **Planning** -> Planning agent (Opus) analyses the issue and posts an implementation plan
2. **In Progress** -> Implementation agent (Sonnet) codes the solution
3. **Review** -> Review agent (Sonnet) does code review, runs tests, and smoke/playwright tests
4. **Done** -> Pipeline complete
- **Blocked** -> Human intervention required (at any stage)

## Stack

- Shell scripts (bash) for any helper logic
- GitHub Actions for orchestration
- `gh` CLI for all GitHub API interactions
- `anthropics/claude-code-action@v1` for agent runs
- Tests: (update this when the project has a test suite — e.g. `npm test`, `make test`, `pytest`)

## Conventions

### Commit Messages

```
type: description (#ISSUE_NUMBER)
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
- `feat: add user authentication (#12)`
- `fix: handle null response from API (#7)`

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
2. Post a comment on the issue explaining what was done before moving the card
3. Move the card to the next column only after completing their stage
4. Reference the issue number in all commits
5. Never force-push or rewrite history
6. If blocked or uncertain, move the card to **Blocked** and explain why in a comment

## Project Board

All project board IDs are stored as **repository variables** (accessible in workflows via `vars.*`):

| Variable | Description |
|---|---|
| `PROJECT_ID` | GitHub Project V2 ID |
| `STATUS_FIELD_ID` | Status field ID |
| `STATUS_TODO` | Todo option ID |
| `STATUS_PLANNING` | Planning option ID |
| `STATUS_IN_PROGRESS` | In Progress option ID |
| `STATUS_REVIEW` | Review option ID |
| `STATUS_DONE` | Done option ID |
| `STATUS_BLOCKED` | Blocked option ID |

To move a card in a workflow, use:
```bash
gh project item-edit \
  --project-id "${{ vars.PROJECT_ID }}" \
  --id "<ITEM_NODE_ID>" \
  --field-id "${{ vars.STATUS_FIELD_ID }}" \
  --single-select-option-id "${{ vars.STATUS_<COLUMN> }}"
```

## Circuit Breaker

The implementation agent checks for `cycles:` labels before running. If more than 3 `cycles:` labels exist, the card is automatically moved to **Blocked**.

When resolving a blocked card:
1. Read the full issue comment history to understand the loop
2. Remove all `cycles:` labels from the issue
3. Update the issue body or add a comment clarifying the correct approach
4. Move the card back to **In Progress**

## Running Workflows Locally (for debugging)

```bash
# Install act for local Actions testing
brew install act

# Run a specific workflow
act -W .github/workflows/agent-blocked.yml
```

Agent workflows are triggered automatically via `projects_v2_item` events when a card's Status field changes on the project board. Each agent moves the card to the next column using `gh project item-edit` when its stage is complete. To set the model, use the `ANTHROPIC_MODEL` environment variable on the step. This trigger requires the repo to be owned by a GitHub organization.
