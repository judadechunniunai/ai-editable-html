#!/usr/bin/env bash
set -euo pipefail

repo="${1:-judadechunniunai/ai-editable-html}"
target="${2:-codex}"
ref="${3:-main}"
project_arg="${4:-$PWD}"
cursor_project="${4:-$PWD}"
trae_project="${5:-$project_arg}"
claude_project="${6:-$project_arg}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
repo_root=""

if [ -n "$script_dir" ] && [ -d "$script_dir/../ai-editable-html" ]; then
  repo_root="$(cd "$script_dir/.." && pwd)"
else
  if [ "$repo" = "YOUR_GITHUB_USERNAME/ai-editable-html" ]; then
    echo "Pass owner/ai-editable-html when running this script from GitHub raw." >&2
    exit 1
  fi
  temp_dir="$(mktemp -d)"
  zip_path="$temp_dir/repo.zip"
  echo "Downloading $repo@$ref from GitHub..."
  curl -fsSL \
    -H "Cache-Control: no-cache" \
    -H "Pragma: no-cache" \
    "https://codeload.github.com/$repo/zip/refs/heads/$ref" \
    -o "$zip_path"
  unzip -q "$zip_path" -d "$temp_dir/repo"
  repo_root="$(find "$temp_dir/repo" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  echo "Using repository source $repo_root"
fi

install_codex() {
  source_dir="$repo_root/ai-editable-html"
  target_root="$HOME/.codex/skills"
  target_dir="$target_root/ai-editable-html"
  if [ ! -d "$source_dir" ]; then
    echo "Cannot find skill source at $source_dir" >&2
    exit 1
  fi
  mkdir -p "$target_root"
  rm -rf "$target_dir"
  cp -R "$source_dir" "$target_dir"
  echo "Installed Codex skill to $target_dir"
}

install_cursor() {
  source_file="$repo_root/cursor-rules/ai-editable-html.mdc"
  resource_source="$repo_root/ai-editable-html"
  target_root="$cursor_project/.cursor/rules"
  target_file="$target_root/ai-editable-html.mdc"
  resource_target="$cursor_project/.cursor/ai-editable-html"
  if [ ! -f "$source_file" ]; then
    echo "Cannot find Cursor rule at $source_file" >&2
    exit 1
  fi
  if [ ! -d "$resource_source" ]; then
    echo "Cannot find AI Editable HTML resources at $resource_source" >&2
    exit 1
  fi
  mkdir -p "$target_root"
  cp "$source_file" "$target_file"
  echo "Installed Cursor rule to $target_file"

  mkdir -p "$cursor_project/.cursor"
  rm -rf "$resource_target"
  cp -R "$resource_source" "$resource_target"
  echo "Installed Cursor resources to $resource_target"
}

install_trae() {
  source_file="$repo_root/trae-rules/ai-editable-html.md"
  resource_source="$repo_root/ai-editable-html"
  target_root="$trae_project/.trae/rules"
  target_file="$target_root/ai-editable-html.md"
  resource_target="$trae_project/.trae/ai-editable-html"
  if [ ! -f "$source_file" ]; then
    echo "Cannot find Trae rule at $source_file" >&2
    exit 1
  fi
  if [ ! -d "$resource_source" ]; then
    echo "Cannot find AI Editable HTML resources at $resource_source" >&2
    exit 1
  fi
  mkdir -p "$target_root"
  cp "$source_file" "$target_file"
  echo "Installed Trae rule to $target_file"

  mkdir -p "$trae_project/.trae"
  rm -rf "$resource_target"
  cp -R "$resource_source" "$resource_target"
  echo "Installed Trae resources to $resource_target"
}

install_claude() {
  source_file="$repo_root/claude-rules/CLAUDE.md"
  resource_source="$repo_root/ai-editable-html"
  target_root="$claude_project/.claude"
  target_file="$target_root/CLAUDE.md"
  resource_target="$target_root/ai-editable-html"
  if [ ! -f "$source_file" ]; then
    echo "Cannot find Claude rule at $source_file" >&2
    exit 1
  fi
  if [ ! -d "$resource_source" ]; then
    echo "Cannot find AI Editable HTML resources at $resource_source" >&2
    exit 1
  fi
  mkdir -p "$target_root"
  cp "$source_file" "$target_file"
  echo "Installed Claude Code instructions to $target_file"

  rm -rf "$resource_target"
  cp -R "$resource_source" "$resource_target"
  echo "Installed Claude Code resources to $resource_target"
}

case "$target" in
  codex)
    install_codex
    ;;
  cursor)
    install_cursor
    ;;
  trae)
    install_trae
    ;;
  claude)
    install_claude
    ;;
  both)
    install_codex
    install_cursor
    ;;
  all)
    install_codex
    install_cursor
    install_trae
    install_claude
    ;;
  *)
    echo "Target must be codex, cursor, trae, claude, both, or all." >&2
    exit 1
    ;;
esac
