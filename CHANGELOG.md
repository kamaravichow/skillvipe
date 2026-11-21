# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- LICENSE, CONTRIBUTING guide, per-agent reference (`docs/harnesses.md`) and repository metadata.

## [0.1.0] - 2026-11-21

### Added

- Interactive terminal UI listing MCP servers, skills and plugins for Claude Code, Codex, OpenCode, Pi, Muse Code and Antigravity CLI, at user and project level.
- Reversible enable/disable: native flags where available, otherwise stashed in `~/.skillvipe`.
- Removal with automatic config backups and a trash folder.
- Cleanup view: broken skills and symlinks, MCP servers whose command is missing, plugins that are enabled but not installed, duplicate skills loaded by the same agent; empty trash and clear backups.
- Bulk marking, search and filtering by type.
- `skillvipe list` and `skillvipe list --json`.
- Secret masking for MCP URLs and flags.

[Unreleased]: https://github.com/kamaravichow/skillvipe/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kamaravichow/skillvipe/releases/tag/v0.1.0
