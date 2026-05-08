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
existing_anthropic=$(grep -E "^ANTHROPIC_API_KEY=" .env | cut -d= -f2-)
existing_openai=$(grep -E "^OPENAI_API_KEY=" .env | cut -d= -f2-)
existing_gclient=$(grep -E "^GOOGLE_CLIENT_ID=" .env | cut -d= -f2-)
existing_gsecret=$(grep -E "^GOOGLE_CLIENT_SECRET=" .env | cut -d= -f2-)

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
echo "AI provider API keys (used for classification and outreach):"
echo ""

# Anthropic
if [ -n "$existing_anthropic" ]; then
  prompt_anthropic="Anthropic API key [current: ${existing_anthropic:0:8}...]: "
else
  prompt_anthropic="Anthropic API key (https://console.anthropic.com/): "
fi
read -r -p "$prompt_anthropic" input_anthropic
if [ -n "$input_anthropic" ]; then
  sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$input_anthropic|" .env
  echo "  ✓ Anthropic key saved"
elif [ -n "$existing_anthropic" ]; then
  echo "  ✓ Keeping existing Anthropic key"
else
  echo "  — Skipped (Anthropic AI provider will be disabled)"
fi

echo ""

# OpenAI
if [ -n "$existing_openai" ]; then
  prompt_openai="OpenAI API key [current: ${existing_openai:0:8}...]: "
else
  prompt_openai="OpenAI API key (https://platform.openai.com/): "
fi
read -r -p "$prompt_openai" input_openai
if [ -n "$input_openai" ]; then
  sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$input_openai|" .env
  echo "  ✓ OpenAI key saved"
elif [ -n "$existing_openai" ]; then
  echo "  ✓ Keeping existing OpenAI key"
else
  echo "  — Skipped (OpenAI provider will be disabled)"
fi

echo ""
echo "Google OAuth credentials (enables Gmail draft creation):"
echo ""

# Google Client ID
if [ -n "$existing_gclient" ]; then
  prompt_gclient="Google Client ID [current: ${existing_gclient:0:8}...]: "
else
  prompt_gclient="Google Client ID (console.cloud.google.com): "
fi
read -r -p "$prompt_gclient" input_gclient
if [ -n "$input_gclient" ]; then
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$input_gclient|" .env
  echo "  ✓ Google Client ID saved"
elif [ -n "$existing_gclient" ]; then
  echo "  ✓ Keeping existing Google Client ID"
else
  echo "  — Skipped (Gmail integration will be disabled)"
fi

echo ""

# Google Client Secret
if [ -n "$existing_gsecret" ]; then
  prompt_gsecret="Google Client Secret [current: ${existing_gsecret:0:8}...]: "
else
  prompt_gsecret="Google Client Secret: "
fi
read -r -p "$prompt_gsecret" input_gsecret
if [ -n "$input_gsecret" ]; then
  sed -i "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$input_gsecret|" .env
  echo "  ✓ Google Client Secret saved"
elif [ -n "$existing_gsecret" ]; then
  echo "  ✓ Keeping existing Google Client Secret"
else
  echo "  — Skipped"
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
