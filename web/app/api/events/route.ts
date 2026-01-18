// SSE events API route
import { NextRequest } from 'next/server';
import { sseEventManager } from '@/lib/event-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Subscribe to SSE events
      const unsubscribe = sseEventManager.subscribe(controller);

      // Send keepalive comments every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (error) {
          clearInterval(keepaliveInterval);
        }
      }, 30000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(keepaliveInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
