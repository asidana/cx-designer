#!/bin/sh
set -e

# Start backend
cd /app/server
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start frontend
serve -s /app/dist -l 3000 &

# Wait
wait
