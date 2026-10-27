#!/bin/sh
set -e

# Write per-app .env files from environment variables
echo "VITE_LESSON_ORIGIN=${VITE_LESSON_ORIGIN}" > /app/apps/hub/.env
echo "VITE_HUB_ORIGIN=${VITE_HUB_ORIGIN}" > /app/apps/lessons/phonics-cvc/.env
echo "VITE_LESSON_ENTRY=${VITE_LESSON_ENTRY:-/}" >> /app/apps/hub/.env

# Execute the command
exec "$@"