#!/bin/sh
# Double-click on macOS (or run ./start.command on Linux) to start DermaLogic.
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then node tools/serve.mjs
elif command -v python3 >/dev/null 2>&1; then (sleep 1; open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173) & python3 -m http.server 5173
else open DermaLogic.html 2>/dev/null || xdg-open DermaLogic.html
fi
