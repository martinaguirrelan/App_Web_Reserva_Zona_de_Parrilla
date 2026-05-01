#!/bin/bash
set -e

echo "Iniciando backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
