# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm typecheck` | Type check without emitting files |
| `pnpm build` | Build for production (outputs to `dist/`) |
| `pnpm dev` | Run CLI interactive mode |
| `pnpm dev:demo` | Run demo mode (non-interactive) |
| `pnpm dev:cli [sessionId]` | Run CLI with optional session ID |

## Environment Configuration

The app uses environment-specific `.env` files loaded by dotenv:
- `.env.development` - Development environment
- `.env.production` - Production environment

Required environment variables:
- `DEEPSEEK_API_KEY` - API key for LLM provider
- `DEEPSEEK_BASE_URL` - Base URL for LLM API

## Architecture Overview

This is a multi-session AI agent built with **Domain-Driven Design (DDD)** and **Repository Pattern**.

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  (src/cli/) - Interactive commands, readline with history   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Agent                               │
│  (src/agent/) - Orchestrates LLM calls and sessions         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼─────────┐  ┌───────▼────────┐  ┌───────▼─────────┐
│   Domain Layer   │  │ Application   │  │ Infrastructure  │
│ (src/domain/)    │  │ (src/app/)    │  │ (src/infra/)    │
│ - Session        │  │ SessionMgr    │  │ MessageRepo     │
│ - MessageQueue   │  │               │  │                 │
└──────────────────┘  └───────────────┘  └─────────────────┘
```

### Key Architectural Patterns

**Lazy-Loading History**: `SessionManager.getMessages()` automatically loads from DB if memory queue is empty. This enables seamless session restoration without explicit load calls.

**Command Pattern**: CLI commands are modular handlers in `src/cli/commands/`. To add a new command:
1. Create handler in `commands/` implementing `CommandHandler` interface
2. Register in `commands/index.ts` registry
3. No changes needed to main CLI class

**Mutable Context**: Commands receive `CommandContext` with wrapped values (`{ value: string }`) to allow mutations (sessionId changes, exit flag).

### Session Management

- **Session ID**: User-specified or auto-generated (`session_${timestamp}`)
- **Multi-user**: Each session has a `userId`
- **Memory Queue**: In-memory `MessageQueue` per session for fast access
- **Persistence**: Messages persisted to MongoDB via `MessageRepository`

### Code Organization Rules

**File Size Limit**: No source file should exceed **480 lines**. When a file approaches this limit, split it into smaller, focused modules.

**Principles**:
- Each file should have a single, clear responsibility
- Extract related functionality into separate modules
- Use barrel files (`index.ts`) for clean imports
- Keep CLI commands and utilities focused and split when needed

### CLI Implementation Details

The CLI uses **Node.js native `readline`** with built-in history support:
- Up/Down arrows navigate input history
- History persisted in `InputHistory` class (max 100 entries)
- Spinner (`ora`) is used during LLM calls - safely terminates before readline resumes

### Provider Interface

To add a new LLM provider, extend `LLMProvider` abstract class from `src/providers/base.ts`:
- Implement `generate(messages, options)` method
- Pass to Agent constructor via `AgentConfig`

### Database Models

- **Message**: `{ sessionId, userId, content, role, type, createdAt }`
- **Session**: `{ sessionId, userId, createdAt, updatedAt }`

Compound index on `{ sessionId: 1, createdAt: 1 }` optimizes history queries.
