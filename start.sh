#!/bin/bash
echo "Starting Restaurant POS..."
cd "$(dirname "$0")"
npm run build && npm start

