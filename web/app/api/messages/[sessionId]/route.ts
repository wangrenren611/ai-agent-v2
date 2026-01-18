// Messages API route
import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session-manager';
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

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Messages GET error:', error);
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
    await ensureAgentInitialized();

    const { sessionId } = await params;
    const llmProvider = getLLMProvider();
    const sessionManager = getSessionManager(sessionId, llmProvider);
    await sessionManager.clearAll();

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
