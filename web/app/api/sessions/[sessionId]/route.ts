// Session detail API route
import { NextRequest, NextResponse } from 'next/server';
import { removeSession, getSessionManager } from '@/lib/session-manager';
import { getLLMProvider, ensureAgentInitialized } from '@/lib/agent';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await ensureAgentInitialized();

    const { sessionId } = await params;
    const llmProvider = getLLMProvider();
    const sessionManager = getSessionManager(sessionId, llmProvider);
    const messages = await sessionManager.getMessages();

    return NextResponse.json({
      id: sessionId,
      messageCount: messages.length,
      messages,
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Remove from cache
    removeSession(sessionId);

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error('Session DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
