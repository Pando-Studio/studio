# No Full File Rewrites

## Rule

When modifying an existing file, ALWAYS use the **Edit tool** (targeted string replacement) instead of the **Write tool** (full file overwrite). The Write tool should only be used for creating **new** files.

## Why

Full file rewrites have caused critical regressions in the Qiplim codebase:
- `middleware.ts`: `__Secure-` cookie check was dropped, locking all prod users out of the dashboard
- `page.tsx`: root redirect was replaced with a full landing page, breaking i18n routing

## How to apply

1. **Read the file first** — understand what already exists
2. **Identify the minimal change** — only modify the lines you need
3. **Use Edit** with `old_string` / `new_string` for surgical changes
4. **Never use Write on files you didn't create** — if the file already exists, use Edit

## For subagents in worktrees

Subagents working in isolated worktrees are especially at risk because:
- They start from the commit at launch time, not the latest code
- Other agents may have made changes they don't see
- Full rewrites lose those concurrent changes

When a subagent prompt mentions modifying `middleware.ts`, `page.tsx`, or any shared file, the prompt MUST include:
- "Use targeted edits, NOT full file rewrites"
- List any critical patterns that must be preserved
