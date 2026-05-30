# AI Editable HTML

[English](README.md) | [中文](README.zh-CN.md)

AI Editable HTML 是一套面向 AI 生成 HTML 的可编辑协议、Skill、校验脚本和 Chrome 扩展。它的目标是让 AI 生成的单文件 HTML 页面可以在浏览器里局部修改，而不是每次小改动都重新生成整页。

适合处理包含流程图、节点图、可编辑文字和说明文档的 AI 生成页面。

## 为什么需要它

AI 很适合生成 HTML 报告、流程页面、图表和说明文档，但很多小修改并不值得重新让 AI 生成一遍。如果页面大体正确，只是某个节点位置不合适、某条线的文字不对、某段说明需要微调，再写一大段 prompt 让 AI 改，既浪费时间，也浪费 token，还容易把原本正确的地方改坏。

AI Editable HTML 让生成出来的页面默认仍然是普通、可阅读的 HTML。只有当你需要局部修改时，才点击进入编辑模式。

## 使用场景

- 你用 AI 生成了一个网页，但发现有一些地方不符合要求。如果再让 AI 按你的方案调整，需要重新描述需求、等待生成、消耗 token。这个时候可以直接用插件改文字、移动流程图节点、调整标签，然后下载修正后的 HTML。
- 你让 AI 编译器改代码、跑程序、跑测试，并输出一个“改了什么、测试结果如何”的 HTML 页面。结果页面大体有用，但部分描述、顺序或流程图结构不太合适，你可以直接在页面上改，而不是再写一大段话让 AI 重新整理。
- 你的 workflow 原本是一大堆 Markdown 文字。现在可以把 workflow 做成可编辑流程图页面，步骤、节点和连线都可以可视化调整。
- 你想把 AI 生成的 HTML 发给同事看。对方默认看到的是普通只读网页，只有需要小改动时才进入编辑模式。

## 项目包含

- `ai-editable-html/`：Codex skill，包含协议、runtime、示例、参考文档和 validator。
- `cursor-rules/`：Cursor 项目规则。
- `trae-rules/`：Trae 项目规则。
- `claude-rules/`：Claude Code 项目说明。
- `chrome-extension/`：Chrome MV3 扩展，用于可视化编辑。
- `scripts/`：一键安装和打包脚本。

## 功能

- 通过稳定的 `data-edit-id` 编辑文本块。
- 通过 JSON model 编辑流程图。
- 拖动流程图节点，连线自动跟随。
- 直接在节点上编辑文字。
- 直接在线条标签上编辑文字。
- 新增节点，并选择基础形状。
- 新增或删除连线。
- 等比例放大或缩小选中的节点。
- 下载修改后的 HTML。
- 校验生成页面里的流程图布局问题。

## 安装 Codex Skill

请按你的终端类型选择命令。PowerShell 示例用于 Windows PowerShell，zsh/bash 示例用于 macOS/Linux 终端。

Windows PowerShell:

```powershell
$repo="judadechunniunai/ai-editable-html"; $s="$env:TEMP\install-ai-editable-html.ps1"; iwr -UseB "https://raw.githubusercontent.com/$repo/main/scripts/install-skill.ps1" -OutFile $s; powershell -ExecutionPolicy Bypass -File $s -Repo $repo -Target codex
```

macOS/Linux zsh/bash:

```bash
curl -fsSL https://raw.githubusercontent.com/judadechunniunai/ai-editable-html/main/scripts/install-skill.sh | bash -s -- judadechunniunai/ai-editable-html codex
```

安装后会把完整 skill 复制到：

```text
~/.codex/skills/ai-editable-html
```

## 安装 Cursor 规则

在 Cursor 项目目录里运行：

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

会安装到：

```text
.cursor/rules/ai-editable-html.mdc
.cursor/ai-editable-html/
```

## 安装 Trae 规则

在 Trae 项目目录里运行：

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

会安装到：

```text
.trae/rules/ai-editable-html.md
.trae/ai-editable-html/
```

## 安装 Claude Code 说明

在 Claude Code 项目目录里运行：

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

会安装到：

```text
.claude/CLAUDE.md
.claude/ai-editable-html/
```

## 安装 Chrome 扩展

下载并解压：

[ai-editable-html-chrome-extension.zip](https://github.com/judadechunniunai/ai-editable-html/raw/main/downloads/ai-editable-html-chrome-extension.zip)

然后：

1. 打开 `chrome://extensions`
2. 启用开发者模式
3. 点击“加载已解压的扩展”
4. 选择解压后的扩展目录，或者本仓库里的 `chrome-extension/`
5. 如果要编辑本地 `file://` 文件，打开扩展详情里的“允许访问文件网址”

启用扩展后，页面默认仍是只读 HTML 展示。点击右上角浮动的 `Edit` 按钮后，才会进入编辑模式；点击 `Exit edit` 可以回到只读模式。修改会写回页面模型，并为当前页面同步一份浏览器本地快照。

## 使用方式

让安装了 skill/rule 的 AI 生成可编辑单文件 HTML 页面。

页面应该包含：

```html
<html data-ai-editable-html="v1">
```

以及：

```html
<script id="ai-editable-html-model" type="application/json">...</script>
```

## Runtime 和 Validator 的区别

项目里有两个不同用途的 JS：

- `assets/runtime-v1.js`：页面运行时。生成包含流程图的最终 HTML 时，应该内联进去。
- `scripts/validate_editable_html.js`：生成后检查工具。不要引入最终 HTML。

生成页面后可以运行 validator：

```bash
node .trae/ai-editable-html/scripts/validate_editable_html.js index.html
```

它会检查流程图数量、节点覆盖、节点过近、线条交叉、线条穿过无关节点、标签覆盖、缺失节点引用和所需画布尺寸。

## 重要约定

- 最终分享给同事看的 HTML 应该是自包含单文件。
- 最终 HTML 不要使用 `<script src="runtime-v1.js">`，因为 `file://` 页面在不同机器上可能加载不到相对路径脚本。
- JSON model 推荐用 `JSON.stringify` 生成。
- JSON 字符串里的双引号、反斜杠、换行必须正确转义。

## 仓库结构

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
