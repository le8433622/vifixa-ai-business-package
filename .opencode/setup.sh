#!/bin/bash

# OpenCode MCP + Skills Setup Script for Vifixa AI Project
# This script installs required MCP servers and verifies the setup

set -e

echo "🚀 Setting up OpenCode MCP + Skills for Vifixa AI..."
echo ""

# Check Node.js version
echo "📌 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ required. Current: $(node --version)"
    exit 1
fi
echo "✅ Node.js $(node --version)"
echo ""

# Install MCP servers globally
echo "📦 Installing MCP servers..."
echo "  - @modelcontextprotocol/server-filesystem"
npm install -g @modelcontextprotocol/server-filesystem

echo "  - @modelcontextprotocol/server-git"
npm install -g @modelcontextprotocol/server-git

echo "  - @supabase/mcp-server-supabase"
npm install -g @supabase/mcp-server-supabase

echo "✅ MCP servers installed"
echo ""

# Verify Supabase CLI
echo "📌 Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing..."
    npm install -g supabase
fi
echo "✅ Supabase CLI: $(supabase --version)"
echo ""

# Check Supabase login status
echo "📌 Checking Supabase authentication..."
if supabase projects list &> /dev/null; then
    echo "✅ Supabase authenticated"
else
    echo "⚠️  Please login to Supabase:"
    echo "   Run: supabase login"
    echo "   Then set: export SUPABASE_ACCESS_TOKEN=<your-token>"
fi
echo ""

# Verify project structure
echo "📌 Verifying project structure..."
REQUIRED_DIRS=("supabase" "mobile" "web" "tests")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ exists"
    else
        echo "⚠️  $dir/ not found - will be created in Step 1"
    fi
done
echo ""

# Summary
echo "========================================"
echo "✅ Setup complete!"
echo "========================================"
echo ""
echo "📚 Next steps:"
echo "1. If not authenticated, run: supabase login"
echo "2. Set environment variable:"
echo "   export SUPABASE_ACCESS_TOKEN=<your-token>"
echo "3. Start opencode in this directory"
echo "4. MCP servers will auto-connect"
echo "5. Use /skill <skill-name> to load specific skills"
echo ""
echo "📖 Documentation:"
echo "   - .opencode/README.md - MCP setup guide"
echo "   - .opencode/skills/INDEX.md - Skills catalog"
echo "   - agent.md - Step-by-step execution plan"
echo ""
