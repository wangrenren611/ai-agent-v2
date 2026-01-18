// Event bus manager for SSE
import { TypedEventBus, SessionEvents, AgentEvents } from '@agent/util/event-bus';

// Global event bus instance for SSE streaming
class SSEEventManager {
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private eventBus: TypedEventBus<SessionEvents & AgentEvents>;

  constructor() {
    this.eventBus = new TypedEventBus<SessionEvents & AgentEvents>();
  }

  /**
   * Subscribe to event stream
   */
  subscribe(controller: ReadableStreamDefaultController): () => void {
    this.clients.add(controller);
    return () => this.clients.delete(controller);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error('Error sending SSE message:', error);
        this.clients.delete(controller);
      }
    });
  }

  /**
   * Get the event bus instance
   */
  getEventBus(): TypedEventBus<SessionEvents & AgentEvents> {
    return this.eventBus;
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const sseEventManager = new SSEEventManager();
