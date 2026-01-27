/**
 * CLI v2 (Ink-based) - Bootstrap Entry Point
 *
 * Ink-based implementation of CLI v2 with the same architecture as planned for OpenTUI.
 */

import React from 'react';
import { render } from 'ink';
import App from './app';

// ============================================================================
// TTY Check
// ============================================================================

// Check if we have an interactive terminal
const hasTTY = process.stdin.isTTY || process.stdout.isTTY;

if (!hasTTY) {
  console.error('\n❌ Error: This CLI requires an interactive terminal (TTY).\n');
  console.error('Please run this command directly in your terminal:');
  console.error('  pnpm dev:cli-v2-ink\n');
  console.error('Do NOT run it through:');
  console.error('  - IDE run buttons (unless configured for integrated terminal)');
  console.error('  - Piped commands (|)');
  console.error('  - Backgrounded processes (&)\n');
  process.exit(1);
}

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ============================================================================
// Signal Handling for Graceful Shutdown
// ============================================================================

const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ============================================================================
// Render Application
// ============================================================================

// Set terminal title
process.title = 'AI Agent v2';

// Render the app and wait until exit
const { waitUntilExit } = render(React.createElement(App));
waitUntilExit();
