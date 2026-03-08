export const DEFAULT_PIPELINE_YML = `pipeline:
  - id: planning
    label: "status:planning"
    color: "#0052CC"
    model: "claude-opus-4-6"
    next: "status:in-progress"
    blocked: "status:blocked"
    prompt: |
      You are the planning agent for the b2a pipeline.

      Your job:
      1. Read this issue fully to understand what needs to be done.
      2. Analyse the codebase to understand the current architecture and relevant code.
      3. Create a detailed implementation plan covering:
         - Which files need to be created or modified
         - What changes are needed in each file
         - Edge cases and potential pitfalls
         - Testing strategy
         - Any dependencies or prerequisites
      4. Post the implementation plan as a comment on the issue.
      5. Advance the pipeline by swapping labels:
         \\\`\\\`\\\`
         gh issue edit $ISSUE --remove-label "status:planning" --add-label "status:in-progress"
         \\\`\\\`\\\`

      Do not advance until the plan is posted.
      If the issue is unclear, you cannot create a plan, or you encounter repeated permission denials or errors:
         \\\`\\\`\\\`
         gh issue comment $ISSUE --body "Moving to blocked: <explain the reason>"
         gh issue edit $ISSUE --remove-label "status:planning" --add-label "status:blocked"
         \\\`\\\`\\\`
      Do not retry the same failing action more than twice. If something is denied or broken, move to blocked immediately.

  - id: in-progress
    label: "status:in-progress"
    color: "#E36209"
    model: "claude-sonnet-4-6"
    next: "status:review"
    blocked: "status:blocked"
    circuit_breaker: 3
    prompt: |
      You are the implementation agent for the b2a pipeline.

      Your job:
      1. Read this issue fully, including all comments (especially any planning or review feedback).
      2. Create a feature branch from main:
         \\\`\\\`\\\`
         git checkout -b feat/issue-$ISSUE-short-description main
         \\\`\\\`\\\`
      3. Implement the changes described in the issue. Follow the standards in CLAUDE.md.
      4. If there is prior review feedback in the issue comments, address all of it.
      5. Write or update tests as appropriate.
      6. Commit your changes with a meaningful commit message referencing the issue number (format: \\\`type: description (#$ISSUE)\\\`).
      7. Push the branch and create a pull request (or update the existing one):
         \\\`\\\`\\\`
         git push -u origin HEAD
         gh pr create --title "type: description (#$ISSUE)" --body "Closes #$ISSUE" --base main || gh pr edit --body "Closes #$ISSUE"
         \\\`\\\`\\\`
      8. Post a comment on the issue summarising what you did and linking the PR.
      9. Advance the pipeline by swapping labels:
         \\\`\\\`\\\`
         gh issue edit $ISSUE --remove-label "status:in-progress" --add-label "status:review"
         \\\`\\\`\\\`

      Do not advance until the implementation is complete, committed, and a PR is open.
      If you cannot complete the task, encounter repeated permission denials, or hit errors you cannot resolve:
         \\\`\\\`\\\`
         gh issue comment $ISSUE --body "Moving to blocked: <explain the reason>"
         gh issue edit $ISSUE --remove-label "status:in-progress" --add-label "status:blocked"
         \\\`\\\`\\\`
      Do not retry the same failing action more than twice. If something is denied or broken, move to blocked immediately.

  - id: review
    label: "status:review"
    color: "#6F42C1"
    model: "claude-sonnet-4-6"
    on_approve: "close"
    on_reject: "status:in-progress"
    blocked: "status:blocked"
    prompt: |
      You are the code review agent for the b2a pipeline.

      Your job:
      1. Read this issue fully, including all comments and history.
      2. Find the pull request linked to this issue:
         \\\`\\\`\\\`
         gh pr list --search "$ISSUE" --state open --json number,title,url --jq '.[0]'
         \\\`\\\`\\\`
      3. Review the PR diff against the standards in CLAUDE.md:
         \\\`\\\`\\\`
         gh pr diff <PR_NUMBER>
         \\\`\\\`\\\`
      4. Check for: correctness, edge cases, test coverage, code style, security issues.
      5. Run the test suite if available (check CLAUDE.md for the test command).

      If the implementation is acceptable:
      - Post an approval comment on the PR.
      - Merge the PR:
        \\\`\\\`\\\`
        gh pr merge <PR_NUMBER> --squash --delete-branch
        \\\`\\\`\\\`
      - Move the card to Done and close the issue:
        \\\`\\\`\\\`
        gh issue edit $ISSUE --remove-label "status:review" --add-label "status:done"
        gh issue close $ISSUE --reason completed
        \\\`\\\`\\\`

      If changes are required:
      - Post a detailed review comment on the PR listing every specific change needed:
        \\\`\\\`\\\`
        gh pr comment <PR_NUMBER> --body "<detailed feedback>"
        \\\`\\\`\\\`
      - Also post a summary comment on the issue so the implementation agent sees it.
      - Determine the current cycle count from existing cycles:N labels and add the next label:
        \\\`\\\`\\\`
        gh issue edit $ISSUE --add-label "cycles:N"
        \\\`\\\`\\\`
      - Move back to implementation:
        \\\`\\\`\\\`
        gh issue edit $ISSUE --remove-label "status:review" --add-label "status:in-progress"
        \\\`\\\`\\\`

      Be specific in feedback. The implementation agent only has your comments to work from.

      If you encounter repeated permission denials or errors you cannot resolve:
         \\\`\\\`\\\`
         gh issue comment $ISSUE --body "Moving to blocked: <explain the reason>"
         gh issue edit $ISSUE --remove-label "status:review" --add-label "status:blocked"
         \\\`\\\`\\\`
      Do not retry the same failing action more than twice. If something is denied or broken, move to blocked immediately.

columns:
  - id: todo
    color: "#6B7280"
  - id: done
    color: "#0E8A16"
  - id: blocked
    label: "status:blocked"
    color: "#CB2431"
`;

export const DEFAULT_WORKFLOW_YML = `name: b2a Agent

on:
  issues:
    types: [labeled]

jobs:
  run-agent:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Install yq
        run: |
          sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      - name: Match stage
        id: stage
        run: |
          LABEL="\${{ github.event.label.name }}"
          STAGE=$(yq -r ".pipeline[] | select(.label == \\"\$LABEL\\")" .b2a/pipeline.yml)
          if [ -z "\$STAGE" ] || [ "\$STAGE" = "null" ]; then
            echo "skip=true" >> "\$GITHUB_OUTPUT"
            exit 0
          fi
          echo "skip=false" >> "\$GITHUB_OUTPUT"
          echo "model=$(echo "\$STAGE" | yq -r '.model')" >> "\$GITHUB_OUTPUT"
          echo "prompt<<EOF" >> "\$GITHUB_OUTPUT"
          echo "\$STAGE" | yq -r '.prompt' | sed "s/\\$ISSUE/\${{ github.event.issue.number }}/g" >> "\$GITHUB_OUTPUT"
          echo "EOF" >> "\$GITHUB_OUTPUT"
          BREAKER=$(echo "\$STAGE" | yq -r '.circuit_breaker // ""')
          echo "circuit_breaker=\$BREAKER" >> "\$GITHUB_OUTPUT"

      - name: Check circuit breaker
        if: steps.stage.outputs.skip == 'false' && steps.stage.outputs.circuit_breaker != ''
        id: breaker
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          MAX="\${{ steps.stage.outputs.circuit_breaker }}"
          CYCLES=$(gh issue view "\${{ github.event.issue.number }}" --json labels \\
            --jq "[.labels[].name | select(startswith(\\"cycles:\\"))] | length")
          if [ "\$CYCLES" -gt "\$MAX" ]; then
            gh issue edit "\${{ github.event.issue.number }}" \\
              --remove-label "\${{ github.event.label.name }}" --add-label "status:blocked"
            gh issue comment "\${{ github.event.issue.number }}" \\
              --body "Circuit breaker tripped after \$MAX review cycles. Moving to Blocked."
            echo "tripped=true" >> "\$GITHUB_OUTPUT"
          else
            echo "tripped=false" >> "\$GITHUB_OUTPUT"
          fi

      - name: Run Agent
        if: steps.stage.outputs.skip == 'false' && steps.breaker.outputs.tripped != 'true'
        uses: anthropics/claude-code-action@v1
        env:
          ANTHROPIC_MODEL: \${{ steps.stage.outputs.model }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: \${{ steps.stage.outputs.prompt }}
          claude_args: "--allowedTools Bash Read Write Edit Glob Grep"
          allowed_bots: "claude[bot],github-actions[bot]"
`;
