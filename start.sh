#!/bin/bash
# FieldLog v7 — quick start
echo ""
echo "  FieldLog v7 — Field Reporting System"
echo "  ────────────────────────────────────"
echo ""
cd "$(dirname "$0")"
pip3 install flask flask-cors PyJWT openpyxl --quiet 2>/dev/null
python3 backend/app.py
