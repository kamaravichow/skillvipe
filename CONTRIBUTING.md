# Contributing to skillvipe

Thanks for helping! Bug reports, corrections to config paths, and support for new agents are all welcome.

## Getting started

```sh
git clone https://github.com/kamaravichow/skillvipe.git
cd skillvipe
npm install
npm run build        # or: npm run dev   (tsc --watch)
node dist/cli.js     # interactive UI
node dist/cli.js list
```

Requires Node.js 22+.

### Work against a sandbox, not your real configs

skillvipe edits real agent config files. While developing, point it at a fake home folder:

```sh
mkdir -p /tmp/sv-home/.codex
printf '[mcp_servers.demo]\ncommand = "npx"\n' > /tmp/sv-home/.codex/config.toml
HOME=/tmp/sv-home CLAUDE_CONFIG_DIR= CODEX_HOME= XDG_CONFIG_HOME= node dist/cli.js
```

`SKILLVIPE_HOME` moves skillvipe's own state, backups and trash (default `~/.skillvipe`).

## Architecture

```
src/
├── cli.tsx               argument parsing, chooses UI or `list`
├── list.ts               plain-text / JSON output
├── harnesses/index.ts    WHERE each agent keeps things (declarative)
├── scanners/             HOW each kind of source is read and changed
│   ├── skills.ts         skill folders
│   ├── json-mcp.ts       MCP maps in JSON/JSONC (native flag or stash)
│   ├── toml.ts           Codex config.toml MCP servers and plugins
│   ├── plugins.ts        Claude plugins, JSON plugin arrays, plugin folders
│   ├── path-items.ts     shared move-to-stash logic for files and folders
│   └── common.ts         source identity, command lookup, secret masking
├── core/
│   ├── types.ts          Item, Source and Harness types
│   ├── inventory.ts      merges sources across agents, finds duplicates
│   ├── state.ts          ~/.skillvipe/state.json (stashed entries)
│   ├── json-file.ts      edits JSON/JSONC while keeping comments and formatting (jsonc-parser)
│   ├── toml-file.ts      line-level TOML edits
│   ├── fs.ts             atomic writes, backups, trash, moves
│   └── maintenance.ts    cleanup candidates, trash and backup sizes
└── ui/                   Ink (React) components
```

The core idea:

1. A **harness** is just a list of **sources** (`src/harnesses/index.ts`). Each source says *where* something lives: a skills folder, a JSON file plus the path to its MCP map, a TOML file, and so on.
2. A **scanner** for each source type reads it and returns **items**. Each item carries its own `ops.setEnabled()` and `ops.remove()`, so the UI never needs to know which agent or file format an item comes from.
3. `inventory.ts` gives each source an identity key (`sourceKey`). When two agents declare the same folder or file entry, it is scanned once and gets both agents in `usedBy`.

## Adding a new agent

Most agents only need a new entry in `src/harnesses/index.ts`:

```ts
function myAgent(cwd: string): Harness {
  const dir = fromHome('.myagent');
  return {
    id: 'myagent',
    name: 'My Agent',
    markers: [dir],                       // present => agent is installed
    sources: [
      {
        type: 'json-mcp',
        scope: 'user',
        file: path.join(dir, 'config.json'),
        mapPath: ['mcpServers'],
        // Use a native flag if the agent supports one, otherwise { mode: 'stash' }
        disable: { mode: 'flag', key: 'disabled', disabledValue: true },
      },
      { type: 'skills-dir', scope: 'user', dir: path.join(dir, 'skills') },
      { type: 'plugin-dir', scope: 'user', dir: path.join(dir, 'plugins'), accept: 'dirs' },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.myagent', 'skills') },
    ],
  };
}
```

Then:

1. Add the id to `HarnessId` in `src/core/types.ts`.
2. Add the harness to `allHarnesses()` and `HARNESS_NAMES` in `src/harnesses/index.ts`.
3. Add a short tag and color in `harnessStyle` in `src/ui/theme.ts`.
4. Document the paths, with links to the agent's docs, in `docs/harnesses.md`, and add a row to the README table.

If the agent stores things in a format no scanner handles yet, add a new `Source` variant to `src/core/types.ts`, a scanner in `src/scanners/`, and a case in `src/scanners/index.ts`.

## Guidelines

- **Never lose user data.** Back up files before writing them (`editJson`, `setTomlKey` and `removeTomlTable` already do this). Send folders to the trash, never `rm` them. When stashing, save to the stash *before* removing from the config.
- **Keep the file as the user wrote it.** Edit single values. Don't re-serialize whole files.
- **Prefer native disable flags** when the agent documents one.
- **Don't flag agent-managed content as broken** (cloud-synced folders, bundled plugins, caches).
- **Mask secrets** in anything shown or printed (`maskSecrets` in `scanners/common.ts`).
- Keep functions small and named for what they do. TypeScript strict mode must pass (`npm run build`).

## Submitting changes

1. Fork, create a branch, and make your change.
2. Run `npm run build`, then try the change against a sandbox home (see above).
3. In the PR, describe what you tested and, for path changes, link the agent's docs.

## Reporting issues

Please include your OS, Node version, the agent and its version, and the output of `npx skillvipe list`. Check that output for anything sensitive before you post it. MCP URLs are masked, but project paths are not.

## Releasing (maintainers)

```sh
npm version patch   # or minor / major
npm publish         # runs the build via prepublishOnly
git push --follow-tags
```

Add an entry to `CHANGELOG.md` before releasing.
