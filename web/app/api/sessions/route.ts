// Sessions API route
import { NextRequest, NextResponse } from 'next/server';
import { getAllSessionIds, hasSession } from '@/lib/session-manager';
import { getLLMProvider, isAgentInitialized, initializeAgent } from '@/lib/agent';
import { DeepSeekProvider } from '@agent/providers/deepseek';
import fs from 'node:fs/promises';
import path from 'node:path';

// Ensure agent is initialized
function ensureAgentInitialized() {
  if (!isAgentInitialized()) {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }

    const llmProvider = new DeepSeekProvider({ apiKey, baseURL, model: 'deepseek-chat' });
    initializeAgent({ llmProvider });
  }
}

export async function GET() {
  try {
    const sessionIds = getAllSessionIds();

    // Get session info from file system
    const sessions = await Promise.all(
      sessionIds.map(async (id) => {
        try {
          const sessionPath = path.join(process.cwd(), '..', '.memory', id);
          const messagesPath = path.join(sessionPath, 'messages.json');

          const content = await fs.readFile(messagesPath, 'utf-8');
          const messages = JSON.parse(content);

          return {
            id,
            messageCount: messages.length || 0,
            createdAt: messages.length > 0 ? messages[0].timestamp || new Date().toISOString() : new Date().toISOString(),
          };
        } catch (error) {
          return {
            id,
            messageCount: 0,
            createdAt: new Date().toISOString(),
          };
        }
      })
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureAgentInitialized();

    const body = await request.json();
    const { sessionId, userId } = body;

    // Generate session ID if not provided
    const newSessionId = sessionId || `session_${Date.now()}`;

    if (hasSession(newSessionId)) {
      return NextResponse.json(
        { error: 'Session already exists', sessionId: newSessionId },
        { status: 409 }
      );
    }

    const llmProvider = getLLMProvider();
    const { getSessionManager } = await import('@/lib/session-manager');
    const sessionManager = getSessionManager(newSessionId, llmProvider, userId);
    await sessionManager.init();

    return NextResponse.json({
      sessionId: newSessionId,
      messageCount: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sessions POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
