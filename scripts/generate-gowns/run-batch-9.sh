#!/bin/bash
cd "$(dirname "$0")"
set -a
source .env
set +a
npx tsx generate-batch-9.ts
