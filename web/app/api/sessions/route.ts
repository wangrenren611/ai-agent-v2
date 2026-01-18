// Sessions API route
import { NextRequest, NextResponse } from 'next/server';
import { getAllSessionIds, hasSession } from '@/lib/session-manager';
import { getLLMProvider, ensureAgentInitialized } from '@/lib/agent';
import fs from 'node:fs/promises';
import path from 'node:path';

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
    await ensureAgentInitialized();

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
    const sessionManager = getSessionManager(newSessionId, llmProvider);
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
