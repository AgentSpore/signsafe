#!/bin/bash
# SignSafe — start FastAPI backend + Next.js frontend

cd "$(dirname "$0")"

# Backend on internal port 8894
uv run uvicorn signsafe.main:app --host 0.0.0.0 --port 8894 &
BACKEND_PID=$!

# Frontend on port 3000 (proxies /api/* to backend via catch-all route)
cd frontend
export BACKEND_URL=http://localhost:8894
if [ -d ".next" ]; then
    npx next start -p 3000 &
else
    npm run dev -- -p 3000 &
fi
FRONTEND_PID=$!

echo "SignSafe started:"
echo "  Backend:  http://localhost:8894"
echo "  Frontend: http://localhost:3000"

wait $BACKEND_PID $FRONTEND_PID
