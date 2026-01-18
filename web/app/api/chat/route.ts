// Chat API route
import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getLLMProvider, isAgentInitialized } from '@/lib/agent';
import { getSessionManager } from '@/lib/session-manager';
import type { ChatRequest, ChatResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    if (!isAgentInitialized()) {
      return NextResponse.json(
        { error: 'Agent not initialized' },
        { status: 503 }
      );
    }

    const body: ChatRequest = await request.json();
    const { sessionId, query } = body;

    if (!sessionId || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, query' },
        { status: 400 }
      );
    }

    const agent = getAgent();
    const llmProvider = getLLMProvider();

    // Get or create session manager for this session
    const sessionManager = getSessionManager(sessionId, llmProvider);

    // Swap the session manager in the agent
    (agent as any).sessionManager = sessionManager;

    const startTime = Date.now();

    // Run the agent
    const response = await agent.run(query);

    const duration = Date.now() - startTime;

    if (!response) {
      return NextResponse.json(
        { error: 'Agent returned null response' },
        { status: 500 }
      );
    }

    const result: ChatResponse = {
      content: response.content,
      role: response.role,
      sessionId,
      duration,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
