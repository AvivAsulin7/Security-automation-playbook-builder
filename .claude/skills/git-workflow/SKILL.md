---
name: git-workflow
description: Use when starting an approved vertical slice branch, preparing commits, pushing a completed feature, opening a GitHub pull request, or reporting PR status. Never merge automatically.
---
# Git Workflow (Git + GitHub CLI)
Use one reviewable pull request per approved vertical slice. The user is the final reviewer and controls merging.

## Branches
- Never develop directly on `main`.
- Start each new slice from updated `main` after the previous PR is merged.
- Branch names must start with the slice number: `slice-<number>/<short-name>`.
- Branches: `slice-0/setup`, `slice-1/authentication`, `slice-2/playbook-management`, `slice-3/simulation`; final review fixes use `slice-4/final-review`.
- If the previous PR is not merged, stop and ask before starting a dependent slice.
- Inspect `git status`, current branch and remotes before switching branches.
- Never discard or overwrite uncommitted work.

## Before committing
1. Confirm the slice is verified per the CLAUDE.md development workflow (checks run, reviewer findings addressed).
2. Inspect `git diff` and `git status`; exclude `.env`, credentials, generated dependencies and build output.
3. Stage only intended files; prefer explicit paths to indiscriminate `git add .`.
4. Use concise conventional commits, e.g. `feat(auth): implement registration and login`.
5. Ask for user approval before committing if not already approved for this slice.

## Push and PR
- Never push or create a PR without explicit user approval.
- Verify `gh auth status`, the remote repository and the target branch.
- Push the feature branch: `git push -u origin <branch>`.
- Create a PR to `main` using `gh pr create --base main --head <branch> --title "..." --body "..."`.
- PR body must include scope, tests run/results, review findings resolved, known limitations and manual verification steps.
- Return the PR URL; do not claim creation succeeded until CLI confirms it.

## Forbidden operations
- Never merge, auto-merge, force-push, reset --hard, delete remote branches or rewrite shared history without explicit separate authorization.
- Do not commit secrets or edit repository protection settings.
- Do not create PRs for incomplete or unverified slices unless the user explicitly requests a draft PR.
- Do not silently create extra commits for unrelated changes.

## Useful commands
- `git status --short --branch`
- `git diff --check`
- `gh auth status`
- `gh pr create --base main --head <branch> --title "..." --body "..."`
- `gh pr view --web`
- `gh pr checks`
