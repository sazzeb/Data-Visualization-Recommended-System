#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dataset_dir="$project_root/public/datasets/csv_file"
blob_prefix="${TRAVEL_DATA_BLOB_PREFIX:-travelwise-v1/csv_file}"

if ! command -v vercel >/dev/null 2>&1; then
  printf 'Vercel CLI is required. Install it and link this project first.\n' >&2
  exit 1
fi

if [ ! -d "$dataset_dir" ]; then
  printf 'Dataset directory is missing: %s\n' "$dataset_dir" >&2
  exit 1
fi

if ! vercel blob list --limit 1 >/dev/null; then
  printf '\nBlob credentials are unavailable for this linked Vercel project.\n' >&2
  printf '1. Connect a public Blob store to this project in the Vercel dashboard.\n' >&2
  printf '2. Run: vercel link\n' >&2
  printf '3. Run: vercel env pull .env.local\n' >&2
  printf '4. Check: vercel blob list --limit 1\n' >&2
  printf 'Then rerun this upload script. Do not paste your Blob token into chat.\n' >&2
  exit 1
fi

staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT

for source in "$dataset_dir"/*.csv; do
  [ -f "$source" ] || continue
  filename="$(basename "$source")"
  compressed="$staging_dir/$filename.gz"
  gzip -c "$source" > "$compressed"
  printf 'Uploading %s ...\n' "$filename"
  vercel blob put "$compressed" \
    --pathname "$blob_prefix/$filename.gz" \
    --access public
done

printf '\nSet TRAVEL_DATA_BASE_URL to the public Blob URL ending in /%s\n' "$blob_prefix"
