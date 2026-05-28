# AI Editable HTML

AI Editable HTML is a first-pass protocol, skill, and Chrome extension for making AI-generated single-file HTML locally editable without regenerating the whole page.

The project has two parts:

- `ai-editable-html/`: a Codex-style skill that instructs an agent to generate `ai-editable-html-v1` pages.
- `cursor-rules/`: a Cursor project rule with the same generation protocol.
- `trae-rules/`: a Trae project rule with the same generation protocol.
- `chrome-extension/`: a Chrome Manifest V3 extension that edits compatible pages in place.

## Current Features

- Editable plain text blocks through stable `data-edit-id` selectors.
- Editable flowcharts through JSON model blocks.
- Drag flow nodes; edges follow automatically.
- Add nodes.
- Add edges by selecting source and target nodes.
- Delete nodes and edges.
- Download the edited HTML.

## Install The Skill

From a cloned repo:

```powershell
.\scripts\install-skill.ps1
```

Or on macOS/Linux:

```bash
./scripts/install-skill.sh
```

The installer copies `ai-editable-html/` to `~/.codex/skills/ai-editable-html`.

After this repo is published, install directly from GitHub with one command.

PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target codex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/judadechunniunai/ai-editable-html/main/scripts/install-skill.sh | bash -s -- judadechunniunai/ai-editable-html codex
```

## Install The Cursor Rule

From inside the Cursor project where you want the rule:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target cursor -CursorProject .
```

Or install both Codex and Cursor support:

```powershell
.\scripts\install-skill.ps1 -Target both -CursorProject .
```

## Install The Trae Rule

From inside the Trae project where you want the rule:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target trae -TraeProject .
```

Or from a cloned repo:

```powershell
.\scripts\install-skill.ps1 -Target trae -TraeProject .
```

The installer copies the rule to `.trae/rules/ai-editable-html.md` and copies validator/runtime resources to `.trae/ai-editable-html/`.

## Install The Chrome Extension

Download `downloads/ai-editable-html-chrome-extension.zip` from GitHub, unzip it, then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the unzipped extension folder, or select `chrome-extension/` from a cloned repo.
5. If editing local `file://` HTML files, enable Allow access to file URLs for this extension.

## Publish Your Fork

After logging in with GitHub CLI:

```powershell
gh auth login
.\scripts\publish-github.ps1 -Repo judadechunniunai/ai-editable-html -Visibility public
```

## Usage

Ask an agent with the installed skill to generate an editable single-file HTML page. Open that page in Chrome. The extension appears only on pages that have:

```html
<html data-ai-editable-html="v1">
```

and:

```html
<script id="ai-editable-html-model" type="application/json">...</script>
```

## Repository Layout

```text
ai-editable-html/
  SKILL.md
  agents/openai.yaml
  assets/runtime-v1.js
  assets/example-editable-page.html
  references/protocol-v1.md
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
downloads/
  ai-editable-html-chrome-extension.zip
```

## Notes

This v1 intentionally avoids agent-based editing. The skill makes generated HTML predictable, and the extension performs deterministic local edits.
