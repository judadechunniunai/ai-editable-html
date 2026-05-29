# AI Editable HTML

[English](README.md) | [中文](README.zh-CN.md)

AI Editable HTML is a protocol, skill, validator, and Chrome extension for making AI-generated single-file HTML locally editable without regenerating the whole page.

It is useful when an AI-generated page contains flowcharts, diagrams, editable text, or documentation that needs small local changes.

## What Is Included

- `ai-editable-html/`: Codex skill with the protocol, runtime, examples, references, and validator.
- `cursor-rules/`: Cursor project rule.
- `trae-rules/`: Trae project rule.
- `claude-rules/`: Claude Code project instructions.
- `chrome-extension/`: Chrome Manifest V3 extension for visual editing.
- `scripts/`: one-command installers and packaging scripts.

## Features

- Editable text blocks through stable `data-edit-id` selectors.
- Editable flowcharts through JSON model blocks.
- Drag flow nodes; edges follow automatically.
- Edit node labels and edge labels inline.
- Add nodes with basic shape choices.
- Add or delete edges.
- Scale selected nodes up or down.
- Download the edited HTML.
- Validate generated HTML for flowchart layout problems.

## Install The Codex Skill

Use the command for your shell. The PowerShell snippets are for Windows PowerShell, and the zsh/bash snippets are for macOS/Linux terminals.

Windows PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target codex
```

macOS/Linux zsh/bash:

```bash
curl -fsSL https://raw.githubusercontent.com/judadechunniunai/ai-editable-html/main/scripts/install-skill.sh | bash -s -- judadechunniunai/ai-editable-html codex
```

The installer copies the full skill to:

```text
~/.codex/skills/ai-editable-html
```

## Install The Cursor Rule

Run this inside the Cursor project:

Windows PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target cursor -CursorProject .
```

macOS/Linux zsh/bash:

```bash
repo="judadechunniunai/ai-editable-html"
s="/tmp/install-ai-editable-html.sh"
curl -fsSL "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.sh" -o "$s"
bash "$s" "$repo" cursor main .
```

This installs:

```text
.cursor/rules/ai-editable-html.mdc
.cursor/ai-editable-html/
```

## Install The Trae Rule

Run this inside the Trae project:

Windows PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target trae -TraeProject .
```

macOS/Linux zsh/bash:

```bash
repo="judadechunniunai/ai-editable-html"
s="/tmp/install-ai-editable-html.sh"
curl -fsSL "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.sh" -o "$s"
bash "$s" "$repo" trae main .
```

This installs:

```text
.trae/rules/ai-editable-html.md
.trae/ai-editable-html/
```

## Install The Claude Code Instructions

Run this inside the Claude Code project:

Windows PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target claude -ClaudeProject .
```

macOS/Linux zsh/bash:

```bash
repo="judadechunniunai/ai-editable-html"
s="/tmp/install-ai-editable-html.sh"
curl -fsSL "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.sh" -o "$s"
bash "$s" "$repo" claude main .
```

This installs:

```text
.claude/CLAUDE.md
.claude/ai-editable-html/
```

## Install The Chrome Extension

Download and unzip:

[ai-editable-html-chrome-extension.zip](https://github.com/judadechunniunai/ai-editable-html/raw/main/downloads/ai-editable-html-chrome-extension.zip)

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the unzipped extension folder, or select `chrome-extension/` from a cloned repo.
5. If editing local `file://` files, enable Allow access to file URLs.

When the extension is enabled, pages stay in read-only HTML mode by default. Click the floating `Edit` button to enter edit mode.

## Usage

Ask an agent with the installed skill/rule to generate an editable single-file HTML page.

The generated page should include:

```html
<html data-ai-editable-html="v1">
```

and:

```html
<script id="ai-editable-html-model" type="application/json">...</script>
```

## Runtime And Validator

There are two different JavaScript files:

- `assets/runtime-v1.js`: page runtime. It should be inlined into the final HTML when flow blocks exist.
- `scripts/validate_editable_html.js`: generation-time checker. Do not include it in the final HTML.

Run the validator after generating a page:

```bash
node .trae/ai-editable-html/scripts/validate_editable_html.js index.html
```

It checks flow count, node overlap, close nodes, edge crossings, edges through unrelated nodes, label collisions, missing endpoints, and required canvas size.

## Important Notes

- Final shared HTML should be self-contained.
- Do not use `<script src="runtime-v1.js">` in final shared HTML, because `file://` pages may fail to load relative local scripts.
- Generate the JSON model with a real JSON serializer such as `JSON.stringify`.
- Escape quotes, backslashes, and line breaks correctly inside JSON strings.

## Repository Layout

```text
ai-editable-html/
  SKILL.md
  agents/openai.yaml
  assets/runtime-v1.js
  assets/example-editable-page.html
  references/protocol-v1.md
  scripts/validate_editable_html.js
chrome-extension/
  manifest.json
  content.css
  content.js
scripts/
  install-skill.ps1
  install-skill.sh
  package-extension.ps1
  package-extension.sh
cursor-rules/
  ai-editable-html.mdc
trae-rules/
  ai-editable-html.md
claude-rules/
  CLAUDE.md
downloads/
  ai-editable-html-chrome-extension.zip
```
