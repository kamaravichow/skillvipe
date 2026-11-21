# skillvipe

[![npm version](https://img.shields.io/npm/v/skillvipe.svg)](https://www.npmjs.com/package/skillvipe)
[![node](https://img.shields.io/node/v/skillvipe.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/skillvipe.svg)](LICENSE)

**One terminal UI for every MCP server, skill and plugin your coding agents load.**

skillvipe lists all of them in one place, lets you switch any of them off for a while, removes the ones you don't want, and finds the broken ones.

```sh
npx skillvipe
```

Works with **Claude Code · Codex · OpenCode · Pi · Muse Code · Antigravity CLI**.

```
 ◆ skillvipe  MCP servers · skills · plugins for your coding agents          ● 84 on  ○ 12 off  ⚠ 13 issues
  All agents 96   Claude Code 52   Codex 33   OpenCode 46   Pi   Muse Code   Antigravity CLI 15
  show  All   MCP   Skills   Plugins                                                              1/96
╭──────────────────────────────────────────────────────────────────────────────────────────────────────╮
│❯   ● aws-mcp                 MCP     user     CC       uvx mcp-proxy-for-aws@latest https://aws-mcp… │
│    ○ aws-mcp                 MCP     user     CX       uvx mcp-proxy-for-aws@latest https://aws-mcp… │
│    ● browserbase             MCP     user     CC       https://mcp.browserbase.com/mcp?apiKey=•••    │
│    ● instabox                SKILL   user     CX OC MU ⚠ duplicate of ~/.claude/skills/instabox      │
│    ○ vercel@claude-plugins…  PLUGIN  user     CC       v0.50.0                                       │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────╯
 ←→ agent  tab type  space toggle  m mark  d remove  / search  c cleanup  ? help  q quit
```

## Why

Every agent keeps MCP servers, skills and plugins in its own files, and several of them also read each other's folders. After a few months you end up with:

- MCP servers loading tools you never use, which costs context tokens on every turn
- the same skill installed in three folders, so one agent loads it twice
- servers that point at binaries you've since uninstalled
- no easy way to try a setup without a plugin and then put it back

skillvipe reads every one of those places and gives you a single list to manage them.

## Features

- **Everything in one list.** Each agent has its own tab, and the "All agents" tab shows everything together. Shared folders such as `~/.agents/skills` appear once, along with every agent that loads them.
- **Disable for a while** with `space`. Where the agent has its own on/off flag, skillvipe uses it. Otherwise it sets the item aside in `~/.skillvipe` and puts it back exactly as it was when you re-enable it.
- **Remove** with `d`. Config files are backed up before every change, and removed folders go to a trash folder, not straight to deletion.
- **Cleanup** with `c` finds:
  - skills with no `SKILL.md`, and broken symlinks
  - MCP servers whose command isn't installed
  - plugins that are enabled but not installed
  - skills that the same agent loads twice
- **Bulk actions**: mark items with `m` (or `a` for everything visible), then toggle or remove them all at once.
- **Your files stay readable.** Comments and formatting in JSON, JSONC and TOML config files are kept.
- **Credentials are hidden.** API keys in URLs and flags are masked in the UI and in the JSON output.
- **Scriptable**: `skillvipe list --json` prints the full inventory as JSON.

## Install

Nothing to install. Run it with `npx` (requires **Node.js 22+**):

```sh
npx skillvipe
```

Or install it globally:

```sh
npm install -g skillvipe
skillvipe
```

## Usage

```sh
skillvipe                     # interactive manager
skillvipe list                # plain-text inventory
skillvipe list --json         # machine-readable inventory
skillvipe --cwd ../my-repo    # also scan another folder's project-level config
skillvipe --help
```

### Keys

| Key | Action |
| --- | --- |
| `↑` `↓` / `j` `k` | move |
| `PgUp` `PgDn` / `g` `G` | jump |
| `←` `→` / `h` `l` | switch agent tab |
| `tab` / `1`–`4` | filter: all · MCP · skills · plugins |
| `/` | search by name or detail |
| `space` | enable / disable |
| `m` / `a` | mark one / mark all visible |
| `d` | remove (asks first) |
| `c` | cleanup view |
| `r` | rescan |
| `?` | help |
| `q` / `esc` | quit |

Agents read their config when they start, so **restart an agent after you change something**.

## Supported agents

| Agent | MCP servers | Skills | Plugins / extensions |
| --- | --- | --- | --- |
| Claude Code | `~/.claude.json`, `.mcp.json` | `~/.claude/skills` | `~/.claude/settings.json` → `enabledPlugins` |
| Codex | `~/.codex/config.toml` | `~/.codex/skills`, `~/.agents/skills` | `~/.codex/config.toml` → `[plugins]` |
| OpenCode | `~/.config/opencode/opencode.json(c)` | `~/.config/opencode/skills` (+ Claude and `.agents` folders) | `plugin` array, `~/.config/opencode/plugins/` |
| Pi | `~/.pi/agent/mcp.json` | `~/.pi/agent/skills` | `~/.pi/agent/settings.json` → `packages`, `~/.pi/agent/extensions/` |
| Muse Code | `~/.config/muse/settings.json` | `~/.config/muse/skills` (+ `.agents`, Claude and Codex folders) | not yet supported |
| Antigravity CLI | `~/.gemini/config/mcp_config.json` | `~/.gemini/config/skills`, `~/.gemini/skills` | `~/.gemini/config/plugins/` |

Project-level locations in the current folder (`.mcp.json`, `.claude/skills`, `.agents/skills`, `.opencode/`, `.pi/` and so on) are scanned too. skillvipe respects `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `PI_CODING_AGENT_DIR` and `XDG_CONFIG_HOME`.

The exact paths, how each kind of item is disabled, and the documentation sources are in **[docs/harnesses.md](docs/harnesses.md)**.

## Safety

skillvipe edits the config files your tools depend on, so it is careful about how it changes them:

| | |
| --- | --- |
| **Reversible disable** | Native flags where they exist. Everything else is parked in `~/.skillvipe/state.json` (config entries) or `~/.skillvipe/disabled/` (folders) and restored exactly. |
| **Backups** | Every config file is copied to `~/.skillvipe/backups/` before it changes. |
| **Trash, not delete** | Removed folders go to `~/.skillvipe/trash/`. You empty it yourself from the cleanup view. |
| **Atomic writes** | Files are written to a temp file and renamed into place. |
| **Minimal edits** | Only the changed value is rewritten, so comments and formatting are kept. |
| **Shared folders** | The confirm dialog warns you when an item is loaded by more than one agent. |
| **Agent-managed content** | Folders the agents manage themselves, such as Claude's cloud-synced `skills/synced`, are never flagged as broken. |

> **Note:** Claude Code rewrites `~/.claude.json` while it runs. Quit running Claude Code sessions before you change MCP servers stored there, or your change may be overwritten.

### Undoing a change by hand

- Disabled items: run skillvipe and press `space` again, or move the folder back from `~/.skillvipe/disabled/`.
- Removed folders: move them back from `~/.skillvipe/trash/<timestamp>/`.
- Config edits: copy the file back from `~/.skillvipe/backups/` (each backup's filename starts with a timestamp).

## Contributing

Contributions are welcome, especially support for more agents. Adding one usually means writing a single declarative entry. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the architecture and a walkthrough.

## License

[MIT](LICENSE)
