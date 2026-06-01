# Repository Instructions

## Superpowers Workflow

- Use the installed superpowers skills when they apply to the task.
- Before feature work, behavior changes, bug fixes, or pull request work, check the relevant superpowers workflow first.
- For implementation work, follow the applicable planning, test-driven development, debugging, and verification workflows unless the user explicitly says otherwise.
- Before claiming work is complete, run the relevant verification commands and report the actual results.
- If a superpowers workflow conflicts with direct user instructions, follow the user instructions and state the tradeoff.

## Git Workflow

- Do not implement features or fixes directly on `main`.
- Before starting code changes, fetch `origin` and create a task branch or worktree from `origin/main`.
- Prefer worktrees for task work:

```bash
git fetch origin
git worktree add -b codex/<task-slug> .worktrees/<task-slug> origin/main
```

- Do not create pull requests from local `main`.
- If `main` is ahead of or behind `origin/main`, stop and ask before rebasing, resetting, or creating a pull request.
- Stage only files related to the current task.
- After a pull request is merged, sync local `main` to `origin/main`, remove the task worktree, and delete merged task branches.
- Never run destructive git commands such as `git reset --hard`, `git clean`, branch deletion, or worktree removal without explicit user approval.
