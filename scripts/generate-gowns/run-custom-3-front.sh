#!/bin/bash
cd "$(dirname "$0")"
set -a
source .env
set +a
npx tsx generate-custom-3-front.ts
