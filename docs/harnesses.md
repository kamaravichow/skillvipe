# Where each agent keeps its MCP servers, skills and plugins

This is the reference skillvipe is built on. Paths use the defaults; the environment variables in each section override them. "Project" means the folder skillvipe was started in (or `--cwd`).

Formats change between releases, so if you notice something out of date, please [open an issue](https://github.com/kamaravichow/skillvipe/issues) or send a PR. The definitions live in [`src/harnesses/index.ts`](../src/harnesses/index.ts).

## Disable mechanisms

skillvipe uses three strategies:

| Strategy | Used when | What happens |
| --- | --- | --- |
| **Native flag** | The agent has its own on/off field | Writes the flag (`enabled = false`, `"disabled": true`, …). Re-enabling removes the flag again. |
| **Config stash** | The agent has no flag | Moves the entry from the config file into `~/.skillvipe/state.json`. Re-enabling writes it back unchanged. |
| **Path stash** | The item is a folder or file (skills, extensions, plugin folders) | Moves it to `~/.skillvipe/disabled/<folder>-<hash>/`. Re-enabling moves it back. |

---

## Claude Code

Env: `CLAUDE_CONFIG_DIR` (default `~/.claude`).

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.claude.json` → `mcpServers` (or `$CLAUDE_CONFIG_DIR/.claude.json`) | user | config stash |
| MCP | `~/.claude.json` → `projects["<project path>"].mcpServers` | project (local) | config stash |
| MCP | `<project>/.mcp.json` → `mcpServers` | project | config stash |
| Skills | `~/.claude/skills/<name>/SKILL.md` | user | path stash |
| Skills | `<project>/.claude/skills/<name>/SKILL.md` | project | path stash |
| Plugins | `~/.claude/settings.json` → `enabledPlugins["name@marketplace"]` | user | native flag (`true` / `false`) |
| Plugins | `~/.claude/plugins/installed_plugins.json`, files in `~/.claude/plugins/cache/` | user | removed together with the plugin |

Notes:

- Plugins synced from claude.ai (`name@synced`) live in `~/.claude/plugins/synced/<account>/<name>`. Removing one only clears the settings entry, because claude.ai would sync the files back.
- `~/.claude/skills/synced/` is a cloud-synced container managed by Claude and is not listed.
- Claude Code rewrites `~/.claude.json` while it runs.

Docs: <https://docs.claude.com/en/docs/claude-code/mcp>, <https://docs.claude.com/en/docs/claude-code/skills>, <https://docs.claude.com/en/docs/claude-code/plugins>

## Codex

Env: `CODEX_HOME` (default `~/.codex`).

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.codex/config.toml` → `[mcp_servers.<name>]` (plus sub-tables such as `.env`) | user | native `enabled = false` |
| MCP | `<project>/.codex/config.toml` | project | native `enabled = false` |
| Skills | `~/.codex/skills/<name>/SKILL.md` | user | path stash |
| Skills | `~/.agents/skills/<name>/SKILL.md` | user (shared) | path stash |
| Skills | `<project>/.agents/skills/<name>/SKILL.md` | project | path stash |
| Plugins | `~/.codex/config.toml` → `[plugins."name@marketplace"]`, files in `~/.codex/plugins/cache/<marketplace>/<name>` | user | native `enabled = false` |

Codex also supports `[[skills.config]] path = "…" enabled = false`. skillvipe uses the path stash instead, because it works the same way for every agent that reads the folder.

Docs: <https://developers.openai.com/codex/skills>

## OpenCode

Env: `XDG_CONFIG_HOME` (default `~/.config`).

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.config/opencode/opencode.jsonc` or `opencode.json` → `mcp.<name>` | user | native `"enabled": false` |
| MCP | `<project>/opencode.json(c)`, `<project>/.opencode/opencode.json(c)` | project | native `"enabled": false` |
| Plugins | same files → `plugin` or `plugins` array | user / project | config stash |
| Plugins | `~/.config/opencode/plugins/` (`.js`/`.ts` files or package folders) | user | path stash |
| Plugins | `<project>/.opencode/plugins/` | project | path stash |
| Skills | `~/.config/opencode/skills`, plus `~/.claude/skills` and `~/.agents/skills` | user | path stash |
| Skills | `<project>/.opencode/skills`, `.claude/skills`, `.agents/skills` | project | path stash |

Docs: <https://opencode.ai/docs/mcp-servers/>, <https://opencode.ai/docs/skills/>, <https://opencode.ai/docs/plugins/>

## Pi

Env: `PI_CODING_AGENT_DIR` (default `~/.pi/agent`).

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.pi/agent/mcp.json` → `mcpServers` | user | config stash |
| MCP | `<project>/.pi/mcp.json` | project | config stash |
| Packages | `~/.pi/agent/settings.json` → `packages` array (string or `{ "source": … }`) | user | config stash |
| Extensions | `~/.pi/agent/extensions/` (files or folders) | user | path stash |
| Skills | `~/.pi/agent/skills/<name>/SKILL.md` | user | path stash |
| (same under `<project>/.pi/`) | | project | |

Docs: <https://pi.dev/docs/latest/configuration>, <https://docs.pi.dev/latest/settings>

## Muse Code

Env: `XDG_CONFIG_HOME` (default `~/.config`).

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.config/muse/settings.json` → `mcpServers` (legacy spelling `mcp_servers` also read) | user | native `"enabled": false` |
| MCP | `<project>/.mcp.json` (shared with Claude Code) | project | config stash |
| Skills | `~/.config/muse/skills`, `~/.agents/skills`, `~/.claude/skills`, `$CODEX_HOME/skills` | user | path stash |
| Skills | `<project>/.agents/skills` | project | path stash |
| Plugins | managed by `muse plugins` in an internal store | — | not supported yet |

`settings.json` must contain `"schema_version": 1`. skillvipe only edits existing files, so that key is preserved.

Docs: <https://dev.meta.ai/docs/muse-code/extending>, <https://meta-models.github.io/muse-code-sdk/next/guides/extend>

## Antigravity CLI

| Kind | Location | Scope | Disable |
| --- | --- | --- | --- |
| MCP | `~/.gemini/config/mcp_config.json` → `mcpServers` | user | native `"disabled": true` |
| MCP | `<project>/.agents/mcp_config.json` | project | native `"disabled": true` |
| Skills | `~/.gemini/config/skills`, `~/.gemini/skills`, `~/.gemini/antigravity-cli/skills` | user | path stash |
| Skills | `<project>/.agents/skills` | project | path stash |
| Plugins | `~/.gemini/config/plugins/<folder>/` | user | path stash |
| Plugins | `<project>/.agents/plugins/<folder>/` | project | path stash |

`~/.gemini/antigravity-cli/mcp/<server>/` is a tool-schema cache that Antigravity writes itself, not configuration, so skillvipe ignores it.

Docs: <https://antigravity.google/docs/mcp/>, <https://antigravity.google/docs/customization-discovery>

---

## Shared folders

Several agents read the same folders. skillvipe scans each folder once and shows every agent that reads it:

| Folder | Read by |
| --- | --- |
| `~/.agents/skills` | Codex, OpenCode, Muse Code |
| `~/.claude/skills` | Claude Code, OpenCode, Muse Code |
| `~/.codex/skills` | Codex, Muse Code |
| `<project>/.agents/skills` | Codex, OpenCode, Muse Code, Antigravity CLI |
| `<project>/.mcp.json` | Claude Code, Muse Code |

Disabling or removing an item in a shared folder affects every agent in its "used by" list.
