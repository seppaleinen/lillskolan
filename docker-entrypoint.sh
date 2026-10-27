#!/bin/sh
set -e

# Write per-app .env files from environment variables
cat > /app/apps/hub/.env << EOF
VITE_LESSON_ORIGIN=${VITE_LESSON_ORIGIN}
VITE_LESSON_ENTRY=${VITE_LESSON_ENTRY:-/}
EOF
echo "VITE_HUB_ORIGIN=${VITE_HUB_ORIGIN}" > /app/apps/lessons/phonics-cvc/.env

# Execute the command
exec "$@"