# Keeping Claude Code's rules and memory from being rewritten or lost

If you've written a procedure for Claude Code (a review checklist, a release flow, house rules) and found it quietly edited, "improved", or forgotten after a long session, this page collects the settings that make those rules stick. Everything here is plain Claude Code configuration. Nothing on this page needs Neither.

Checked against the Claude Code docs on 2026-10-05 ([memory](https://code.claude.com/docs/en/memory), [permissions](https://code.claude.com/docs/en/permissions), [hooks](https://code.claude.com/docs/en/hooks)).

## 1. Put rules you own in CLAUDE.md, not auto memory

Claude Code has two kinds of memory:

- **`CLAUDE.md` and `.claude/rules/*.md`** are instructions *you* write. Claude reads them at the start of every session.
- **Auto memory** (`MEMORY.md` and its topic files under `~/.claude/projects/<project>/memory/`) is Claude's *own* notebook. It writes there by itself, mostly from your corrections.

So if your procedure lives in auto memory, a long session full of corrections on that procedure will lead Claude to rewrite it, because that's what auto memory is for. Move anything you want to own into `CLAUDE.md` or a rules file such as `.claude/rules/pr-review.md`.

If you'd rather Claude not keep its own notes for a project at all, turn auto memory off in that project's `.claude/settings.json`:

```json
{ "autoMemoryEnabled": false }
```

## 2. Deny edits to the files you own

`CLAUDE.md` is context, not enforced configuration, so a line like "never edit this file" is only a request. A permission deny rule is enforced. In the project's `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Edit(/CLAUDE.md)",
      "Edit(/.claude/rules/**)",
      "Edit(/.claude/settings.json)",
      "Edit(/.claude/hooks/**)"
    ]
  }
}
```

Notes:

- In project settings a leading `/` anchors the path at the project root.
- `Edit` rules are what Claude Code checks for every built-in file write, including the Write tool. A path rule written as `Write(...)` is accepted but never consulted, so use `Edit(...)`.
- Denying edits to `.claude/settings.json` and the hooks folder stops Claude from removing the protection itself.
- Deny rules cover Claude's file tools, Bash commands Claude Code recognizes (`sed`, `tee`, redirections like `> file`), but not a script that opens files on its own. For OS-level enforcement, enable the sandbox.

## 3. Tell Claude *why* with a PreToolUse hook

A deny rule blocks the edit. A hook can block it and also tell Claude what to do instead, so it proposes the change in chat rather than retrying. Save this as `.claude/hooks/protect-rules.sh` and `chmod +x` it:

```sh
#!/bin/sh
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  */CLAUDE.md|*/.claude/rules/*)
    echo "$f is user-owned. Don't edit it; propose the change to the user instead." >&2
    exit 2 ;;
esac
exit 0
```

Register it in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-rules.sh" }
        ]
      }
    ]
  }
}
```

Exit code 2 blocks the tool call, and its stderr is passed back to Claude. The script needs `jq`. You can test it without Claude:

```sh
echo '{"tool_input":{"file_path":"/repo/CLAUDE.md"}}' | .claude/hooks/protect-rules.sh; echo "exit $?"   # exit 2
echo '{"tool_input":{"file_path":"/repo/src/app.ts"}}' | .claude/hooks/protect-rules.sh; echo "exit $?"  # exit 0
```

## 4. Keep the files in git

Commit `CLAUDE.md`, `.claude/rules/`, `.claude/settings.json`, and `.claude/hooks/`. Then any change, from Claude or anyone else, shows up in `git diff` and is one `git checkout` away from undone. Personal, uncommitted preferences can go in `CLAUDE.local.md` (add it to `.gitignore`).

## 5. Surviving `/compact`

After compaction, Claude Code re-reads the project-root `CLAUDE.md` from disk and re-injects it. Nested `CLAUDE.md` files and path-scoped rules reload when Claude next reads a file they apply to. If an instruction vanished after `/compact`, it was most likely given only in conversation. Write it into `CLAUDE.md` and it will persist.

## If you want memory that persists across tools and sessions

The steps above protect instructions inside one Claude Code project. If what you're after is decisions and context that carry across sessions, repos, and tools (Claude Code, Cursor, Claude Desktop), we built Neither for that: an MCP server that stores your team's decisions and lets the agent search them. You can try it from [the Neither start page](https://www.neither.online/start/?product=dev&utm_source=guide&utm_campaign=claude-code-rules).
