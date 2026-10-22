# Working on plank.to

## Plan workflow

Open work lives in [plan.md](plan.md); finished work moves to [done.md](done.md).

- "The next task" is the first unchecked `- [ ]` item in plan.md that an agent can do. Skip owner tasks (for example creating a mailbox) and say so.
- Each task gets its own branch, one commit, and a `git merge --no-ff <branch>` into `main`, then `git push origin main`.
- When a task is finished, remove it from plan.md and add a `- [x] **<Section> <short title>.**` entry to the end of done.md describing what changed, which checks passed, and what was not verified.

## Subagents and verification

- Spin up a **new subagent using the Sonnet model** (`model: "sonnet"`) for each task. The subagent implements the task on its branch but does not commit, merge, or push.
- The **main agent verifies the work before anything is committed to main**: read the full diff, check it against the task in plan.md and the MVP decisions, and run the checks itself (`npm run check` in `app/`, which covers typecheck, lint, format, contrast, and tests; `npm run build` in `web/` when the site changed). Fix or send back anything that fails.
- Only after verification does the main agent commit, merge into main, push, and move the task to done.md.
