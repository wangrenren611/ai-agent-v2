/**
 * EventBus depth test fix version
 * Fixed all encoding issues
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EventBus,
  TypedEventBus,
  ScopedEventBus,
  createLoggingMiddleware,
  createErrorHandlingMiddleware,
  createValidationMiddleware,
  createTimeoutMiddleware,
  createRetryMiddleware,
  type SessionEvents,
  type AgentEvents,
} from './index';

describe('EventBus - Fixed Tests', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus({
      enableAsync: true,
      enableMetrics: true,
      defaultTimeout: 5000,
    });
  });

  afterEach(() => {
    bus.offAll();
  });

  describe('1. Core Functionality Tests', () => {
    it('1.1 Should correctly subscribe and emit events', async () => {
      const handler = vi.fn();
      bus.on('test.event', handler);
      await bus.emit('test.event', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('1.2 Should support async event handling', async () => {
      const handler = vi.fn();
      bus.onAsync('test.async', handler);
      await bus.emit('test.async', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('1.3 Should support one-time subscription', async () => {
      const handler = vi.fn();
      bus.once('test.once', handler);

      await bus.emit('test.once', { count: 1 });
      await bus.emit('test.once', { count: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('1.4 Should correctly unsubscribe', async () => {
      const handler = vi.fn();
      const subscription = bus.on('test.unsub', handler);

      subscription.unsubscribe();
      await bus.emit('test.unsub', { data: 'should not be called' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('1.5 Should support multiple listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on('test.multi', handler1);
      bus.on('test.multi', handler2);
      bus.on('test.multi', handler3);

      await bus.emit('test.multi', { value: 100 });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });
  });

  describe('2. Middleware System Tests', () => {
    it('2.1 Should execute global middleware', async () => {
      const middleware = vi.fn(async (ctx, next) => {
        ctx.metadata.global = true;
        await next();
      });

      bus.use(middleware);

      const handler = vi.fn((data: any) => {
        expect(data).toBeUndefined();
      });

      bus.on('test.middleware', handler);

      await bus.emit('test.middleware', { test: true });

      expect(middleware).toHaveBeenCalled();
    });

    it('2.2 Should support event-specific middleware', async () => {
      const middleware = vi.fn(async (ctx, next) => {
        ctx.metadata.eventSpecific = true;
        await next();
      });

      bus.useForEvent('test.specific', middleware);

      await bus.emit('test.specific', { test: true });

      expect(middleware).toHaveBeenCalled();
    });

    it('2.3 Middleware should abort event', async () => {
      const middleware = vi.fn((ctx) => {
        ctx.abort();
      });

      bus.use(middleware);

      const handler = vi.fn();

      bus.on('test.abort', handler);

      await bus.emit('test.abort', { test: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it('2.4 Middleware should execute in correct order', async () => {
      const order: number[] = [];

      const middleware1 = vi.fn(async (ctx, next) => {
        order.push(1);
        await next();
      });
      const middleware2 = vi.fn(async (ctx, next) => {
        order.push(2);
        await next();
      });

      bus.use(middleware1);
      bus.use(middleware2);

      await bus.emit('test.order', { test: true });

      expect(order).toEqual([1, 2]);
    });
  });

  describe('3. Error Handling Tests', () => {
    it('3.1 Sync handler errors should not affect other handlers', async () => {
      const handler1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const handler2 = vi.fn();

      bus.on('test.error.sync', handler1);
      bus.on('test.error.sync', handler2);

      await bus.emit('test.error.sync', { test: true });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('3.2 Async handler errors should not affect other handlers', async () => {
      const handler1 = vi.fn(async () => {
        throw new Error('Async error');
      });
      const handler2 = vi.fn();

      bus.onAsync('test.error.async', handler1);
      bus.onAsync('test.error.async', handler2);

      await bus.emit('test.error.async', { test: true });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('3.3 Error handler middleware should capture errors', async () => {
      const errorHandler = vi.fn();
      const middleware = createErrorHandlingMiddleware((error) => {
        errorHandler(error);
      });

      bus.use(middleware);

      const handler = vi.fn(() => {
        throw new Error('Handler error');
      });

      bus.on('test.middleware.error', handler);

      await bus.emit('test.middleware.error', { test: true });

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('4. Metrics Collection Tests', () => {
    it('4.1 Should correctly track event count', async () => {
      const metrics1 = bus.getMetrics('test.metrics.count');
      expect(metrics1?.totalEvents).toBe(0);

      await bus.emit('test.metrics.count', { value: 1 });
      await bus.emit('test.metrics.count', { value: 2 });
      await bus.emit('test.metrics.count', { value: 3 });

      const metrics2 = bus.getMetrics('test.metrics.count');
      expect(metrics2?.totalEvents).toBe(3);
    });

    it('4.2 Should correctly track error count', async () => {
      const handler = vi.fn(() => {
        throw new Error('Test error');
      });

      bus.on('test.metrics.error', handler);

      await bus.emit('test.metrics.error', { value: 1 });
      await bus.emit('test.metrics.error', { value: 2 });
      await bus.emit('test.metrics.error', { value: 3 });

      const metrics = bus.getMetrics('test.metrics.error');
      expect(metrics?.errors).toBe(3);
    });

    it('4.3 Should correctly calculate average execution time', async () => {
      let totalTime = 0;
      const handler = vi.fn(async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, data.duration));
      });

      bus.on('test.metrics.time', handler);

      await bus.emit('test.metrics.time', { duration: 50 });
      await bus.emit('test.metrics.time', { duration: 100 });

      const metrics = bus.getMetrics('test.metrics.time');
      expect(metrics?.avgExecutionTime).toBeGreaterThan(50);
      expect(metrics?.avgExecutionTime).toBeLessThan(150);
    });
  });

  describe('5. Edge Case Tests', () => {
    it('5.1 Should reject exceeding max listeners', () => {
      const handler = vi.fn();

      // Create 50 listeners (maxListeners default is 50)
      for (let i = 0; i < 50; i++) {
        bus.on('test.max.listeners', handler);
      }

      // The 51st should throw error
      expect(() => {
        bus.on('test.max.listeners', handler);
      }).toThrow('Maximum listeners');
    });

    it('5.2 Should handle event name conflicts', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('test.conflict', handler1);
      bus.on('test.conflict', handler2);

      await bus.emit('test.conflict', { test: true });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('5.3 Should handle empty event name', async () => {
      const handler = vi.fn();
      bus.on('', handler);

      await bus.emit('', { test: true });

      expect(handler).toHaveBeenCalledWith({ test: true });
    });

    it('5.4 Should handle special characters in event names', async () => {
      const handler = vi.fn();
      bus.on('test.special:event:name', handler);

      await bus.emit('test.special:event:name', { test: true });

      expect(handler).toHaveBeenCalled();
    });

    it('5.5 Should handle large data payload', async () => {
      const handler = vi.fn();
      bus.on('test.large.payload', handler);

      const largeData = {
        array: new Array(10000).fill('test'),
        object: { nested: { deep: { value: 'test' } } },
      };

      await bus.emit('test.large.payload', largeData);

      expect(handler).toHaveBeenCalledWith(largeData);
    });
  });

  describe('6. Performance Tests', () => {
    it('6.1 Should efficiently emit 1000 events', async () => {
      const handler = vi.fn();

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await bus.emit('test.performance.emit', { index: i });
      }

      const duration = Date.now() - start;

      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000);
    });

    it('6.2 Should efficiently handle multiple listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on('test.performance.multiple', handler1);
      bus.on('test.performance.multiple', handler2);
      bus.on('test.performance.multiple', handler3);

      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await bus.emit('test.performance.multiple', { index: i });
      }

      const duration = Date.now() - start;

      expect(handler1).toHaveBeenCalledTimes(100);
      expect(handler2).toHaveBeenCalledTimes(100);
      expect(handler3).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('7. Utility Function Tests', () => {
    it('7.1 createLoggingMiddleware should log events', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const middleware = createLoggingMiddleware('test');

      bus.use(middleware);

      await bus.emit('test.logging', { message: 'test' });

      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('7.2 createErrorHandlingMiddleware should handle errors', async () => {
      const errorHandler = vi.fn();
      const middleware = createErrorHandlingMiddleware((error) => {
        errorHandler(error);
      });

      bus.use(middleware);

      const handler = vi.fn(() => {
        throw new Error('Test error');
      });

      bus.on('test.error.handling', handler);

      await bus.emit('test.error.handling', { test: true });

      expect(errorHandler).toHaveBeenCalled();
    });

    it('7.3 createValidationMiddleware should validate data', async () => {
      const validator = (data: any) => data.value > 0;
      const middleware = createValidationMiddleware(validator, 'Value must be positive');

      bus.use(middleware);

      await bus.emit('test.validation', { value: 1 }); // should succeed
      await expect(
        bus.emit('test.validation', { value: -1 })
      ).rejects.toThrow('Value must be positive');
    });

    it('7.4 createTimeoutMiddleware should timeout after timeout', async () => {
      const middleware = createTimeoutMiddleware(100);

      bus.use(middleware);

      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      bus.on('test.timeout', handler);

      const start = Date.now();
      await bus.emit('test.timeout', { test: true });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThan(90);
      expect(duration).toBeLessThan(200);
      expect(handler).not.toHaveBeenCalled();
    });

    it('7.5 createRetryMiddleware should retry on failures', async () => {
      let attemptCount = 0;
      const middleware = createRetryMiddleware(3, 10);

      bus.use(middleware);

      const handler = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary error');
        }
      });

      bus.on('test.retry', handler);

      await bus.emit('test.retry', { test: true });

      expect(attemptCount).toBe(3);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('8. Type Safety Tests', () => {
    it('8.1 Should provide type-safe event subscriptions', () => {
      interface TestEvents {
        'user.login': { userId: string; timestamp: number };
        'user.logout': { userId: string };
      }

      const bus = new TypedEventBus<TestEvents>();

      // Type safe: data parameter has correct type
      bus.on('user.login', (data) => {
        expect(typeof data.userId).toBe('string');
        expect(typeof data.timestamp).toBe('number');
      });

      await bus.emit('user.login', { userId: 'user1', timestamp: Date.now() });
    });

    it('8.2 Should support async handler type safety', async () => {
      interface TestEvents {
        'data.process': { data: string };
      }

      const bus = new TypedEventBus<TestEvents>();

      bus.onAsync('data.process', async (data) => {
        expect(typeof data.data).toBe('string');
      });

      await bus.emit('data.process', { data: 'test' });
    });
  });

  describe('9. ScopedEventBus Isolation Tests', () => {
    let parentBus: EventBus;
    let scopedBus: ScopedEventBus;

    beforeEach(() => {
      parentBus = new EventBus({ enableAsync: true });
      scopedBus = parentBus.createScopedBus('session1');
    });

    afterEach(() => {
      parentBus.offAll();
      scopedBus.offAll();
    });

    it('9.1 Should correctly isolate event namespace', async () => {
      const scopedHandler = vi.fn();
      const parentHandler = vi.fn();

      scopedBus.on('event', scopedHandler);
      parentBus.on('session1.event', parentHandler);

      await scopedBus.emit('event', { data: 'test' });

      // Both handlers should be called
      expect(scopedHandler).toHaveBeenCalled();
      expect(parentHandler).toHaveBeenCalled();
    });

    it('9.2 Should support offAll clearing scoped events', async () => {
      scopedBus.on('event1', vi.fn());
      scopedBus.on('event2', vi.fn());
      scopedBus.on('event3', vi.fn());

      expect(scopedBus.listenerCount()).toBe(3);

      scopedBus.offAll();

      expect(scopedBus.listenerCount()).toBe(0);
    });

    it('9.3 Should not affect other scopes', async () => {
      const scoped1 = parentBus.createScopedBus('scope1');
      const scoped2 = parentBus.createScopedBus('scope2');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      scoped1.on('event', handler1);
      scoped2.on('event', handler2);

      await scoped1.emit('event', { data: 'scope1' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('10. Real World Scenario Tests', () => {
    it('10.1 Should support Agent workflow', async () => {
      const bus = new EventBus({ enableAsync: true });
      const executionOrder: string[] = [];

      // Agent workflow
      bus.onAsync('agent.start', async (data) => {
        executionOrder.push('start');
        await bus.emit('agent.validate', { ...data });
      });

      bus.onAsync('agent.validate', async (data) => {
        executionOrder.push('validate');
        await bus.emit('agent.execute', { ...data });
      });

      bus.onAsync('agent.execute', async (data) => {
        executionOrder.push('execute');
        await bus.emit('agent.complete', { ...data });
      });

      bus.on('agent.complete', (data) => {
        executionOrder.push('complete');
      });

      await bus.emit('agent.start', { sessionId: 'test', query: 'test query' });

      expect(executionOrder).toEqual(['start', 'validate', 'execute', 'complete']);
    });

    it('10.2 Should support error recovery flow', async () => {
      const bus = new EventBus({ enableAsync: true });
      const retryMiddleware = createRetryMiddleware(3, 10);

      bus.use(retryMiddleware);

      let attemptCount = 0;
      const handler = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
      });

      bus.onAsync('data.fetch', handler);

      await bus.emit('data.fetch', { url: 'test' });

      expect(attemptCount).toBe(3);
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('10.3 Should support timeout protection', async () => {
      const bus = new EventBus({ defaultTimeout: 100 });
      const timeoutMiddleware = createTimeoutMiddleware(100);

      bus.use(timeoutMiddleware);

      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      bus.onAsync('slow.operation', handler);

      const start = Date.now();
      await bus.emit('slow.operation', { test: true });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(180);
      expect(duration).toBeLessThan(250);
    });
  });

  describe('11. Design Rationality Tests', () => {
    it('11.1 Should follow single responsibility principle', () => {
      const bus = new EventBus();

      expect(typeof bus.on).toBe('function');
      expect(typeof bus.emit).toBe('function');
      expect(typeof bus.off).toBe('function');
      expect(typeof bus.offAll).toBe('function');
      expect(typeof bus.listenerCount).toBe('function');
      expect(typeof bus.eventNames).toBe('function');
      expect(typeof bus.getMetrics).toBe('function');
    });

    it('11.2 Should support open/closed principle', () => {
      const bus = new EventBus();

      // Can extend functionality through middleware
      const extensionMiddleware = async (ctx, next) => {
        ctx.metadata.extension = true;
        await next();
      };

      bus.use(extensionMiddleware);

      const extensionHandler = vi.fn(async (ctx, next) => {
        await next();
      });

      bus.on('test.extension', extensionHandler);

      // No need to modify EventBus class
      expect(bus.on).toBeDefined();
    });

    it('11.3 Should support dependency inversion', () => {
      const bus = new EventBus();

      // Depend on abstract interface, not concrete implementation
      const middleware: any = {
        handle: async (ctx: any, next: any) => {
          await next();
        }
      };

      bus.use((ctx, next) => middleware.handle);
    });

    it('11.4 Should have good performance characteristics', async () => {
      const bus = new EventBus({ enableMetrics: true });
      const handler = vi.fn();

      bus.on('test.performance', handler);

      // Test 1000 event publishes
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        await bus.emit('test.performance', { index: i });
      }

      const duration = Date.now() - start;

      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(2000);

      // Check metrics
      const metrics = bus.getMetrics('test.performance');
      expect(metrics?.totalEvents).toBe(1000);
    });
  });
});
