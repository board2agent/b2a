# b2a

This repository implements the **board-to-agent pipeline** — a GitHub-native system where a Kanban board (GitHub Projects v2) drives autonomous Claude Code agents via GitHub Actions.

## How It Works

A human moves a card from **Backlog → In Progress** to start the pipeline. Agents then handle each stage:

- **In Progress** → Implementation agent codes the solution
- **Review** → Review agent checks the code
- **Testing** → Test agent runs the suite
- **Done** → Pipeline complete
- **Blocked** → Human intervention required

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

Update this section after creating the GitHub Project. Retrieve IDs with:

```bash
gh project list --owner YOUR_ORG_OR_USER

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

```
Project ID:        PVT_xxxxxxxxxxxx   (replace after setup)
Status Field ID:   PVTSSF_xxxxxxxxxxxx (replace after setup)

Column option IDs:
  Backlog:      xxxxxxxxxxxx
  In Progress:  xxxxxxxxxxxx
  Review:       xxxxxxxxxxxx
  Testing:      xxxxxxxxxxxx
  Done:         xxxxxxxxxxxx
  Blocked:      xxxxxxxxxxxx
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

Note: `projects_v2_item` triggers cannot be replicated locally with `act`. Use the GitHub UI to test card movement triggers.
