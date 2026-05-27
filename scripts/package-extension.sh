#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_root/chrome-extension"
output_dir="$repo_root/downloads"
output_file="$output_dir/ai-editable-html-chrome-extension.zip"

if [ ! -d "$source_dir" ]; then
  echo "Cannot find Chrome extension source at $source_dir" >&2
  exit 1
fi

mkdir -p "$output_dir"
rm -f "$output_file"
(cd "$source_dir" && zip -qr "$output_file" .)
echo "Wrote $output_file"
