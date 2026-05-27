#!/usr/bin/env bash
set -euo pipefail

repo="${1:-judadechunniunai/ai-editable-html}"
target="${2:-codex}"
ref="${3:-main}"
cursor_project="${4:-$PWD}"

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
  curl -fsSL "https://github.com/$repo/archive/refs/heads/$ref.zip" -o "$zip_path"
  unzip -q "$zip_path" -d "$temp_dir/repo"
  repo_root="$(find "$temp_dir/repo" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
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
  target_root="$cursor_project/.cursor/rules"
  target_file="$target_root/ai-editable-html.mdc"
  if [ ! -f "$source_file" ]; then
    echo "Cannot find Cursor rule at $source_file" >&2
    exit 1
  fi
  mkdir -p "$target_root"
  cp "$source_file" "$target_file"
  echo "Installed Cursor rule to $target_file"
}

case "$target" in
  codex)
    install_codex
    ;;
  cursor)
    install_cursor
    ;;
  both)
    install_codex
    install_cursor
    ;;
  *)
    echo "Target must be codex, cursor, or both." >&2
    exit 1
    ;;
esac
