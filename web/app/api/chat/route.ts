// Chat API route
import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getLLMProvider, ensureAgentInitialized } from '@/lib/agent';
import { getSessionManager } from '@/lib/session-manager';
import type { ChatRequest, ChatResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    await ensureAgentInitialized();

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
    console.log('[Chat API] Starting agent.run for query:', query);
    const response = await agent.run(query);
    console.log('[Chat API] Agent.run completed, response:', response?.content?.substring(0, 100));

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
