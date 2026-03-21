#!/bin/bash
set -e
cd /opt/projects/rentally
echo '=== Deploy Rentally ==='
git pull origin main

# Build frontend si existe
if [ -f frontend/package.json ]; then
  cd frontend && npm install && npm run build && cd ..
fi

# Restart backend
if systemctl is-active --quiet rentally-backend; then
  systemctl restart rentally-backend
fi

# Fix permisos
chmod -R 755 /opt/projects/rentally/frontend/dist 2>/dev/null || true

echo '=== Deploy OK ==='
