#!/usr/bin/env bash
set -e

echo ""
echo "  Sierra Signals — Setup"
echo "================================"
echo ""

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

# Read existing values so we can show them as defaults
existing_brave=$(grep -E "^BRAVE_API_KEY=" .env | cut -d= -f2-)
existing_tavily=$(grep -E "^TAVILY_API_KEY=" .env | cut -d= -f2-)

echo "Search provider API keys (press Enter to skip / keep existing):"
echo ""

# Brave
if [ -n "$existing_brave" ]; then
  prompt_brave="Brave Search API key [current: ${existing_brave:0:8}...]: "
else
  prompt_brave="Brave Search API key (https://brave.com/search/api/): "
fi
read -r -p "$prompt_brave" input_brave
if [ -n "$input_brave" ]; then
  sed -i "s|^BRAVE_API_KEY=.*|BRAVE_API_KEY=$input_brave|" .env
  echo "  ✓ Brave key saved"
elif [ -n "$existing_brave" ]; then
  echo "  ✓ Keeping existing Brave key"
else
  echo "  — Skipped (Brave provider will be disabled)"
fi

echo ""

# Tavily
if [ -n "$existing_tavily" ]; then
  prompt_tavily="Tavily API key [current: ${existing_tavily:0:8}...]: "
else
  prompt_tavily="Tavily API key (https://tavily.com): "
fi
read -r -p "$prompt_tavily" input_tavily
if [ -n "$input_tavily" ]; then
  sed -i "s|^TAVILY_API_KEY=.*|TAVILY_API_KEY=$input_tavily|" .env
  echo "  ✓ Tavily key saved"
elif [ -n "$existing_tavily" ]; then
  echo "  ✓ Keeping existing Tavily key"
else
  echo "  — Skipped (Tavily provider will be disabled)"
fi

echo ""
echo "================================"
echo "  Setup complete."
echo ""
echo "  Claude Agent is always available"
echo "  (uses your existing 'claude' login — no key needed)."
echo ""
echo "  To start the app:"
echo "    npm run dev"
echo "  Then open: http://localhost:5173"
echo "================================"
echo ""
