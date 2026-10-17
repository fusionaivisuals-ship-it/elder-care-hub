#!/usr/bin/env bash
# Refresh CareMap open data from the official sources.
# Run from the repo root on your own computer (needs internet + python3):
#   bash scripts/fetch_data.sh
set -euo pipefail
mkdir -p data/raw

echo "1/3 Downloading MOHW 長照ABC據點 (national LTC providers, updated daily)..."
curl -fsSL "https://ltcpap.mohw.gov.tw/publish/abc.csv" -o data/raw/abc.csv

echo "2/3 Downloading New Taipei 社區照顧關懷據點 (community care centers)..."
curl -fsSL "https://data.ntpc.gov.tw/api/datasets/abfde51a-e8c1-4b2b-bd8f-eeb548a793b7/json?page=0&size=1000" -o data/raw/ntpc_community_care.json

echo "3/3 Rebuilding cleaned files..."
python3 -I scripts/build_providers.py data/raw/abc.csv data
python3 -I scripts/build_app_data.py data

echo "Done. Updated files in data/ — copy data/*.json into the app's public data folder if the app uses one."
