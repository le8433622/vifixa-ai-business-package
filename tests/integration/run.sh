#!/usr/bin/env bash
# Integration Test Wrapper
# Points to the central AI function test script

cd "$(dirname "$0")/../.."
./scripts/test-ai-functions.sh "$@"
