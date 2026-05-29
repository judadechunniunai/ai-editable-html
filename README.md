# AI Editable HTML

AI Editable HTML is a first-pass protocol, skill, and Chrome extension for making AI-generated single-file HTML locally editable without regenerating the whole page.

## 中文说明

AI Editable HTML 是一套面向 AI 生成 HTML 的可编辑协议、Skill、规则文件、校验脚本和 Chrome 扩展。它的目标是让 AI 生成的单文件 HTML 页面可以在浏览器里局部修改，而不是每次小改动都重新生成整页。

项目包含：

- `ai-editable-html/`：Codex skill，包含协议、runtime、示例和 validator。
- `cursor-rules/`：Cursor 项目规则。
- `trae-rules/`：Trae 项目规则。
- `claude-rules/`：Claude Code 项目说明。
- `chrome-extension/`：Chrome MV3 扩展，用于在页面里编辑文字、流程图节点和连线。

### Codex 一键安装

PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target codex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/judadechunniunai/ai-editable-html/main/scripts/install-skill.sh | bash -s -- judadechunniunai/ai-editable-html codex
```

安装后会复制完整 skill 到：

```text
~/.codex/skills/ai-editable-html
```

### 重要约定

- 最终交付给同事看的 HTML 应该是单文件页面。
- `runtime-v1.js` 是页面运行时，生成页面时应内联到最终 HTML，避免 `file://` 下 `runtime-v1.js: Failed to load resource`。
- `validate_editable_html.js` 是生成后检查工具，不要通过 `<script>` 引入最终页面。
- JSON model 必须是合法 JSON。中文可以直接写 UTF-8，也可以用 `\uXXXX`；字符串里的双引号、反斜杠、换行必须正确转义。推荐用 `JSON.stringify` 生成 model，而不是手写拼接 JSON。

### Trae / Cursor / Claude Code

这些工具安装时会复制项目规则，也会复制 validator/runtime 资源到对应项目目录：

- Cursor: `.cursor/ai-editable-html/`
- Trae: `.trae/ai-editable-html/`
- Claude Code: `.claude/ai-editable-html/`

生成页面后可以运行：

```bash
node .trae/ai-editable-html/scripts/validate_editable_html.js index.html
```

如果 validator 有 errors，必须修改后再次检查；warnings 至少做一轮布局优化。

The project has two parts:

- `ai-editable-html/`: a Codex-style skill that instructs an agent to generate `ai-editable-html-v1` pages.
- `cursor-rules/`: a Cursor project rule with the same generation protocol.
- `trae-rules/`: a Trae project rule with the same generation protocol.
- `claude-rules/`: Claude Code project instructions with the same generation protocol.
- `chrome-extension/`: a Chrome Manifest V3 extension that edits compatible pages in place.

## Current Features

- Editable plain text blocks through stable `data-edit-id` selectors.
- Editable flowcharts through JSON model blocks.
- Drag flow nodes; edges follow automatically.
- Add nodes.
- Add edges by selecting source and target nodes.
- Delete nodes and edges.
- Download the edited HTML.

## Install The Codex Skill

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

The installer copies the rule to `.cursor/rules/ai-editable-html.mdc` and copies validator/runtime resources to `.cursor/ai-editable-html/`.

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

## Install The Claude Code Instructions

From inside the Claude Code project where you want the instructions:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target claude -ClaudeProject .
```

Or from a cloned repo:

```powershell
.\scripts\install-skill.ps1 -Target claude -ClaudeProject .
```

The installer copies instructions to `.claude/CLAUDE.md` and copies validator/runtime resources to `.claude/ai-editable-html/`.

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
claude-rules/
  CLAUDE.md
downloads/
  ai-editable-html-chrome-extension.zip
```

## Notes

This v1 intentionally avoids agent-based editing. The skill makes generated HTML predictable, and the extension performs deterministic local edits.
