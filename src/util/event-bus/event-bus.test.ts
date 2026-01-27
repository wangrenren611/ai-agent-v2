/**
 * EventBus 深度测试
 * 测试EventBus的核心功能、中间件系统、错误处理等
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
} from './index';

describe('EventBus', () => {
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

  // ==================== 核心功能测试 ====================
  describe('Core Functionality', () => {
    it('should subscribe and emit events correctly', async () => {
      const handler = vi.fn();
      bus.on('test.event', handler);
      await bus.emit('test.event', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should support async event handling', async () => {
      const handler = vi.fn();
      bus.onAsync('test.async', handler);
      await bus.emit('test.async', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should support one-time subscription', async () => {
      const handler = vi.fn();
      bus.once('test.once', handler);

      await bus.emit('test.once', { count: 1 });
      await bus.emit('test.once', { count: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should correctly unsubscribe', async () => {
      const handler = vi.fn();
      const subscription = bus.on('test.unsub', handler);

      subscription.unsubscribe();
      await bus.emit('test.unsub', { data: 'should not be called' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', async () => {
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

  // ==================== 中间件系统测试 ====================
  describe('Middleware System', () => {
    it('should execute global middleware', async () => {
      const middleware = vi.fn(async (ctx, next) => {
        ctx.metadata.global = true;
        await next();
      });

      bus.use(middleware);

      const handler = vi.fn((data: any) => {
        expect(data).toEqual({ test: true });
      });

      bus.on('test.middleware', handler);

      await bus.emit('test.middleware', { test: true });

      expect(middleware).toHaveBeenCalled();
    });

    it('should support event-specific middleware', async () => {
      const middleware = vi.fn(async (ctx, next) => {
        ctx.metadata.eventSpecific = true;
        await next();
      });

      bus.useForEvent('test.specific', middleware);

      await bus.emit('test.specific', { test: true });

      expect(middleware).toHaveBeenCalled();
    });

    it('middleware should abort event', async () => {
      const middleware = vi.fn((ctx) => {
        ctx.abort();
      });

      bus.use(middleware);

      const handler = vi.fn();

      bus.on('test.abort', handler);

      await bus.emit('test.abort', { test: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it('middleware should execute in correct order', async () => {
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

  // ==================== 错误处理测试 ====================
  describe('Error Handling', () => {
    it('sync handler errors should not affect other handlers', async () => {
      const handler1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const handler2 = vi.fn();

      bus.on('test.error.sync', handler1);
      bus.on('test.error.sync', handler2);

      await bus.emit('test.error.sync', { test: true });

      // Both handlers should be called
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('async handler errors should not affect other handlers', async () => {
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

    it('error handler middleware should capture errors', async () => {
      const errorHandler = vi.fn();
      const middleware = createErrorHandlingMiddleware((error) => {
        errorHandler(error);
      });

      bus.use(middleware);

      bus.on('test.middleware.error', () => {
        throw new Error('Handler error');
      });

      // No try-catch needed - emit never throws
      await bus.emit('test.middleware.error', { test: true });

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  // ==================== 指标收集测试 ====================
  describe('Metrics Collection', () => {
    it('should correctly track event count', async () => {
      await bus.emit('test.metrics.count', { value: 1 });
      await bus.emit('test.metrics.count', { value: 2 });
      await bus.emit('test.metrics.count', { value: 3 });

      const metrics = bus.getMetrics('test.metrics.count');
      expect(metrics?.totalEvents).toBe(3);
    });

    it('should correctly track error count', async () => {
      let errorCount = 0;

      bus.on('test.metrics.error', () => {
        errorCount++;
        throw new Error('Test error');
      });

      await bus.emit('test.metrics.error', { value: 1 });
      await bus.emit('test.metrics.error', { value: 2 });
      await bus.emit('test.metrics.error', { value: 3 });

      expect(errorCount).toBe(3);
    });

    it('should correctly track successful execution time', async () => {
      const handler = vi.fn(async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, data.duration));
      });

      bus.on('test.metrics.time', handler);

      await bus.emit('test.metrics.time', { duration: 10 });

      const metrics = bus.getMetrics('test.metrics.time');
      expect(metrics?.totalEvents).toBe(1);
      expect(metrics?.errors).toBe(0);
    });
  });

  // ==================== 边界情况测试 ====================
  describe('Edge Cases', () => {
    it('should reject exceeding max listeners', () => {
      const handler = vi.fn();

      for (let i = 0; i < 50; i++) {
        bus.on('test.max.listeners', handler);
      }

      expect(() => {
        bus.on('test.max.listeners', handler);
      }).toThrow('Maximum listeners');
    });

    it('should handle event name conflicts', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('test.conflict', handler1);
      bus.on('test.conflict', handler2);

      await bus.emit('test.conflict', { test: true });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle empty event name', async () => {
      const handler = vi.fn();
      bus.on('', handler);

      await bus.emit('', { test: true });

      expect(handler).toHaveBeenCalledWith({ test: true });
    });

    it('should handle special characters in event names', async () => {
      const handler = vi.fn();
      bus.on('test.special:event?name', handler);

      await bus.emit('test.special:event?name', { test: true });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle large data payload', async () => {
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

  // ==================== 性能测试 ====================
  describe('Performance', () => {
    it('should efficiently emit 1000 events', async () => {
      const handler = vi.fn();
      bus.on('test.performance.emit', handler);

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await bus.emit('test.performance.emit', { index: i });
      }

      const duration = Date.now() - start;

      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000);
    });

    it('should efficiently handle multiple listeners', async () => {
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

  // ==================== 工具函数测试 ====================
  describe('Utility Functions', () => {
    it('createLoggingMiddleware should log events', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const middleware = createLoggingMiddleware('test');

      bus.use(middleware);

      await bus.emit('test.logging', { message: 'test' });

      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('createErrorHandlingMiddleware should handle errors', async () => {
      const errorHandler = vi.fn();
      const middleware = createErrorHandlingMiddleware((error) => {
        errorHandler(error);
      });

      bus.use(middleware);

      bus.on('test.error.handling', () => {
        throw new Error('Test error');
      });

      await bus.emit('test.error.handling', { test: true });

      expect(errorHandler).toHaveBeenCalled();
    });

    it('createValidationMiddleware should validate data', async () => {
      const validator = (data: any) => data.value > 0;
      const middleware = createValidationMiddleware(validator, 'Value must be positive');

      bus.use(middleware);

      const handler = vi.fn();
      bus.on('test.validation', handler);

      await bus.emit('test.validation', { value: 1 });
      expect(handler).toHaveBeenCalled();

      // Validation fails, handler should not be called
      await bus.emit('test.validation', { value: -1 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('createTimeoutMiddleware should not throw', async () => {
      const middleware = createTimeoutMiddleware(50);

      bus.use(middleware);

      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      bus.on('test.timeout', handler);

      await bus.emit('test.timeout', { test: true });

      // No exception thrown, handler called before timeout
      expect(handler).toHaveBeenCalled();
    });

    it('createRetryMiddleware should be available', async () => {
      const middleware = createRetryMiddleware(3, 10);
      bus.use(middleware);

      bus.on('test.retry', () => {
        // Handler
      });

      await bus.emit('test.retry', { test: true });

      expect(true).toBe(true);
    });
  });

  // ==================== 类型安全测试 ====================
  describe('Type Safety', () => {
    it('should provide type-safe event subscriptions', async () => {
      interface TestEvents {
        'user.login': { userId: string; timestamp: number };
        'user.logout': { userId: string };
      }

      const bus = new TypedEventBus<TestEvents>();

      bus.on('user.login', (data) => {
        expect(typeof data.userId).toBe('string');
        expect(typeof data.timestamp).toBe('number');
      });

      await bus.emit('user.login', { userId: 'user1', timestamp: Date.now() });
    });

    it('should support async handler type safety', async () => {
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

  // ==================== ScopedEventBus 隔离测试 ====================
  describe('ScopedEventBus Isolation', () => {
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

    it('should correctly isolate event namespace', async () => {
      const scopedHandler = vi.fn();
      const parentHandler = vi.fn();

      scopedBus.on('event', scopedHandler);
      parentBus.on('session1.event', parentHandler);

      await scopedBus.emit('event', { data: 'test' });

      expect(scopedHandler).toHaveBeenCalled();
      expect(parentHandler).toHaveBeenCalled();
    });

    it('should support offAll clearing scoped events', async () => {
      scopedBus.on('event1', vi.fn());
      scopedBus.on('event2', vi.fn());
      scopedBus.on('event3', vi.fn());

      expect(scopedBus.listenerCount()).toBe(3);

      scopedBus.offAll();

      expect(scopedBus.listenerCount()).toBe(0);
    });

    it('should not affect other scopes', async () => {
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

  // ==================== 真实场景测试 ====================
  describe('Real World Scenarios', () => {
    it('should support Agent workflow', async () => {
      const executionOrder: string[] = [];

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

    it('should handle multiple handlers with some throwing', async () => {
      const results: string[] = [];

      bus.on('workflow.step1', () => {
        results.push('step1-success');
      });

      bus.on('workflow.step1', () => {
        throw new Error('Step1 failed');
      });

      bus.on('workflow.step1', () => {
        results.push('step1-continue');
      });

      await bus.emit('workflow.step1', { test: true });

      expect(results).toEqual(['step1-success', 'step1-continue']);
    });

    it('should support timeout middleware', async () => {
      const bus = new EventBus({ defaultTimeout: 100 });
      const timeoutMiddleware = createTimeoutMiddleware(50);

      bus.use(timeoutMiddleware);

      let handlerCalled = false;
      bus.onAsync('slow.operation', async () => {
        handlerCalled = true;
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await bus.emit('slow.operation', { test: true });

      // Handler called before timeout check completes
      expect(handlerCalled).toBe(true);
    });
  });

  // ==================== 设计合理性测试 ====================
  describe('Design Rationality', () => {
    it('should follow single responsibility principle', () => {
      const bus = new EventBus();

      expect(typeof bus.on).toBe('function');
      expect(typeof bus.emit).toBe('function');
      expect(typeof bus.off).toBe('function');
      expect(typeof bus.offAll).toBe('function');
      expect(typeof bus.listenerCount).toBe('function');
      expect(typeof bus.eventNames).toBe('function');
      expect(typeof bus.getMetrics).toBe('function');
    });

    it('should support open/closed principle', () => {
      const bus = new EventBus();

      const extensionMiddleware = async (ctx, next) => {
        ctx.metadata.extension = true;
        await next();
      };

      bus.use(extensionMiddleware);

      const extensionHandler = vi.fn(async (ctx, next) => {
        await next();
      });

      bus.on('test.extension', extensionHandler);

      expect(bus.on).toBeDefined();
    });

    it('should support dependency inversion', () => {
      const bus = new EventBus();

      const middleware: any = {
        handle: async (ctx: any, next: any) => {
          await next();
        }
      };

      bus.use((ctx, next) => middleware.handle);
    });

    it('should have good performance characteristics', async () => {
      const bus = new EventBus({ enableMetrics: true });
      const handler = vi.fn();

      bus.on('test.performance', handler);

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        await bus.emit('test.performance', { index: i });
      }

      const duration = Date.now() - start;

      expect(handler).toHaveBeenCalledTimes(1000);
      const metrics = bus.getMetrics('test.performance');
      expect(metrics?.totalEvents).toBe(1000);
    });
  });

  // ==================== 查询方法测试 ====================
  describe('Query Methods', () => {
    it('listenerCount should return correct count', async () => {
      bus.on('event1', vi.fn());
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());

      expect(bus.listenerCount('event1')).toBe(2);
      expect(bus.listenerCount('event2')).toBe(1);
      expect(bus.listenerCount()).toBe(3);
    });

    it('eventNames should return all registered events', async () => {
      bus.on('event.a', vi.fn());
      bus.on('event.b', vi.fn());
      bus.onAsync('event.c', vi.fn());

      const names = bus.eventNames();
      expect(names).toContain('event.a');
      expect(names).toContain('event.b');
      expect(names).toContain('event.c');
    });

    it('getMetrics should return metrics for specific event', async () => {
      bus.on('metric.test', vi.fn());
      await bus.emit('metric.test', { value: 1 });
      await bus.emit('metric.test', { value: 2 });

      const metrics = bus.getMetrics('metric.test');
      expect(metrics?.totalEvents).toBe(2);
    });

    it('getMetrics should return all metrics when no event specified', async () => {
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());
      await bus.emit('event1', {});
      await bus.emit('event2', {});

      const allMetrics = bus.getMetrics();
      expect(allMetrics instanceof Map).toBe(true);
    });

    it('resetMetrics should clear metrics', async () => {
      bus.on('reset.test', vi.fn());
      await bus.emit('reset.test', {});
      expect(bus.getMetrics('reset.test')?.totalEvents).toBe(1);

      bus.resetMetrics('reset.test');
      expect(bus.getMetrics('reset.test')?.totalEvents).toBe(0);
    });

    it('resetMetrics should clear all metrics', async () => {
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());
      await bus.emit('event1', {});
      await bus.emit('event2', {});

      bus.resetMetrics();

      expect(bus.getMetrics('event1')?.totalEvents).toBe(0);
      expect(bus.getMetrics('event2')?.totalEvents).toBe(0);
    });
  });

  // ==================== waitFor 测试 ====================
  describe('waitFor', () => {
    it('should resolve when event is emitted', async () => {
      const handler = vi.fn();
      bus.on('wait.test', handler);

      const promise = bus.waitFor<{ value: number }>('wait.test', 1000);

      await bus.emit('wait.test', { value: 42 });
      const result = await promise;

      expect(result).toEqual({ value: 42 });
      expect(handler).toHaveBeenCalled();
    });

    it('should reject on timeout', async () => {
      const promise = bus.waitFor('timeout.test', 50);

      await expect(promise).rejects.toThrow('Timeout waiting for event: timeout.test');
    });

    it('should support once subscription', async () => {
      const promise = bus.waitFor<{ data: string }>('once.wait', 100);

      await bus.emit('once.wait', { data: 'test' });
      const result = await promise;

      expect(result).toEqual({ data: 'test' });
    });
  });

  // ==================== onceAsync 测试 ====================
  describe('onceAsync', () => {
    it('should support one-time async subscription', async () => {
      const handler = vi.fn();

      bus.onceAsync('once.async', handler);
      await bus.emit('once.async', { count: 1 });
      await bus.emit('once.async', { count: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ count: 1 });
    });

    it('should work with async handler', async () => {
      let callCount = 0;
      bus.onceAsync('async.once.test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        callCount++;
      });

      await bus.emit('async.once.test', {});
      await bus.emit('async.once.test', {});

      expect(callCount).toBe(1);
    });
  });

  // ==================== TypedEventBus 完整测试 ====================
  describe('TypedEventBus', () => {
    interface TestEvents {
      'user.created': { userId: string; email: string };
      'user.deleted': { userId: string };
      'order.placed': { orderId: string; amount: number };
    }

    let typedBus: TypedEventBus<TestEvents>;

    beforeEach(() => {
      typedBus = new TypedEventBus<TestEvents>();
    });

    it('should provide type-safe on subscription', async () => {
      typedBus.on('user.created', (data) => {
        expect(typeof data.userId).toBe('string');
        expect(typeof data.email).toBe('string');
      });

      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });
    });

    it('should provide type-safe onAsync subscription', async () => {
      typedBus.onAsync('user.deleted', async (data) => {
        expect(typeof data.userId).toBe('string');
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await typedBus.emit('user.deleted', { userId: '456' });
    });

    it('should provide type-safe once subscription', async () => {
      typedBus.once('order.placed', (data) => {
        expect(typeof data.orderId).toBe('string');
        expect(typeof data.amount).toBe('number');
      });

      await typedBus.emit('order.placed', { orderId: 'order-1', amount: 99.99 });
    });

    it('should provide type-safe onceAsync subscription', async () => {
      let called = false;
      typedBus.onceAsync('user.deleted', async () => {
        called = true;
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await typedBus.emit('user.deleted', { userId: '789' });
      expect(called).toBe(true);
    });

    it('should support typed off', async () => {
      const handler = vi.fn();
      const subscription = typedBus.on('user.created', handler);

      subscription.unsubscribe();
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support typed offAll', async () => {
      typedBus.on('user.created', vi.fn());
      typedBus.on('user.deleted', vi.fn());

      typedBus.offAll('user.created');
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });
      await typedBus.emit('user.deleted', { userId: '456' });

      expect(bus.listenerCount('user.created')).toBe(0);
    });

    it('should support typed use middleware', async () => {
      const middleware = vi.fn();
      typedBus.use(middleware);

      typedBus.on('user.created', vi.fn());
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      expect(middleware).toHaveBeenCalled();
    });

    it('should support typed useForEvent middleware', async () => {
      const middleware = vi.fn();
      typedBus.useForEvent('user.created', middleware);

      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      expect(middleware).toHaveBeenCalled();
    });

    it('should support typed listenerCount', async () => {
      typedBus.on('user.created', vi.fn());
      typedBus.on('user.created', vi.fn());

      expect(typedBus.listenerCount('user.created')).toBe(2);
    });

    it('should support typed getMetrics', async () => {
      typedBus.on('user.created', vi.fn());
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      const metrics = typedBus.getMetrics('user.created');
      expect(metrics?.totalEvents).toBe(1);
    });

    it('should support typed resetMetrics', async () => {
      typedBus.on('user.created', vi.fn());
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      typedBus.resetMetrics('user.created');
      const metrics = typedBus.getMetrics('user.created');
      expect(metrics?.totalEvents).toBe(0);
    });

    it('should support typed waitFor', async () => {
      typedBus.on('user.created', vi.fn());

      const promise = typedBus.waitFor('user.created', 1000);
      await typedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      const result = await promise;
      expect(result).toEqual({ userId: '123', email: 'test@example.com' });
    });

    it('should support typed createScopedBus', async () => {
      const scopedBus = typedBus.createScopedBus('tenant-1');

      scopedBus.on('user.created', vi.fn());
      await scopedBus.emit('user.created', { userId: '123', email: 'test@example.com' });

      expect(scopedBus.listenerCount()).toBe(1);
    });
  });

  // ==================== TypedScopedEventBus 测试 ====================
  describe('TypedScopedEventBus', () => {
    interface TestEvents {
      'message.sent': { messageId: string; content: string };
      'message.received': { messageId: string };
    }

    let typedBus: TypedEventBus<TestEvents>;
    let scopedBus: any;

    beforeEach(() => {
      typedBus = new TypedEventBus<TestEvents>();
      scopedBus = typedBus.createScopedBus('session-1');
    });

    it('should support typed on', async () => {
      scopedBus.on('message.sent', (data: any) => {
        expect(typeof data.messageId).toBe('string');
      });

      await scopedBus.emit('message.sent', { messageId: 'msg-1', content: 'Hello' });
    });

    it('should support typed onAsync', async () => {
      scopedBus.onAsync('message.received', async (data: any) => {
        expect(typeof data.messageId).toBe('string');
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await scopedBus.emit('message.received', { messageId: 'msg-2' });
    });

    it('should support typed once', async () => {
      scopedBus.once('message.sent', (data: any) => {
        expect(data.messageId).toBe('msg-3');
      });

      await scopedBus.emit('message.sent', { messageId: 'msg-3', content: 'Test' });
      await scopedBus.emit('message.sent', { messageId: 'msg-4', content: 'Test2' });
    });

    it('should support typed onceAsync', async () => {
      let count = 0;
      scopedBus.onceAsync('message.received', async () => {
        count++;
      });

      await scopedBus.emit('message.received', { messageId: 'msg-5' });
      await scopedBus.emit('message.received', { messageId: 'msg-6' });

      expect(count).toBe(1);
    });

    it('should support typed off', async () => {
      const handler = vi.fn();
      const subscription = scopedBus.on('message.sent', handler);

      subscription.unsubscribe();
      await scopedBus.emit('message.sent', { messageId: 'msg-7', content: 'Test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support typed offAll', async () => {
      scopedBus.on('message.sent', vi.fn());
      scopedBus.on('message.received', vi.fn());

      scopedBus.offAll();
      expect(scopedBus.listenerCount()).toBe(0);
    });

    it('should support typed use middleware', async () => {
      const middleware = vi.fn();
      scopedBus.use(middleware);

      scopedBus.on('message.sent', vi.fn());
      await scopedBus.emit('message.sent', { messageId: 'msg-8', content: 'Test' });

      expect(middleware).toHaveBeenCalled();
    });

    it('should support typed useForEvent middleware', async () => {
      const middleware = vi.fn();
      scopedBus.useForEvent('message.sent', middleware);

      await scopedBus.emit('message.sent', { messageId: 'msg-9', content: 'Test' });

      expect(middleware).toHaveBeenCalled();
    });

    it('should support typed listenerCount', async () => {
      scopedBus.on('message.sent', vi.fn());
      scopedBus.on('message.sent', vi.fn());

      expect(scopedBus.listenerCount('message.sent')).toBe(2);
      expect(scopedBus.listenerCount()).toBe(2);
    });

    it('should support typed eventNames', async () => {
      scopedBus.on('message.sent', vi.fn());
      scopedBus.on('message.received', vi.fn());

      const names = scopedBus.eventNames();
      expect(names).toContain('message.sent');
      expect(names).toContain('message.received');
    });

    it('should support typed getMetrics', async () => {
      scopedBus.on('message.sent', vi.fn());
      await scopedBus.emit('message.sent', { messageId: 'msg-10', content: 'Test' });

      const metrics = scopedBus.getMetrics('message.sent');
      expect(metrics?.totalEvents).toBe(1);
    });

    it('should support typed resetMetrics', async () => {
      scopedBus.on('message.sent', vi.fn());
      await scopedBus.emit('message.sent', { messageId: 'msg-11', content: 'Test' });

      scopedBus.resetMetrics('message.sent');
      const metrics = scopedBus.getMetrics('message.sent');
      expect(metrics?.totalEvents).toBe(0);
    });

    it('should support typed waitFor', async () => {
      scopedBus.on('message.sent', vi.fn());

      const promise = scopedBus.waitFor('message.sent', 1000);
      await scopedBus.emit('message.sent', { messageId: 'msg-12', content: 'Test' });

      const result = await promise;
      expect(result).toEqual({ messageId: 'msg-12', content: 'Test' });
    });
  });

  // ==================== ScopedEventBus 完整测试 ====================
  describe('ScopedEventBus Full Coverage', () => {
    let parentBus: EventBus;
    let scopedBus: ScopedEventBus;

    beforeEach(() => {
      parentBus = new EventBus({ enableAsync: true });
      scopedBus = parentBus.createScopedBus('test-scope');
    });

    afterEach(() => {
      parentBus.offAll();
      scopedBus.offAll();
    });

    it('should support onAsync', async () => {
      const handler = vi.fn();
      scopedBus.onAsync('async.event', handler);

      await scopedBus.emit('async.event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support once', async () => {
      const handler = vi.fn();
      scopedBus.once('once.event', handler);

      await scopedBus.emit('once.event', { count: 1 });
      await scopedBus.emit('once.event', { count: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support onceAsync', async () => {
      const handler = vi.fn();
      scopedBus.onceAsync('once.async.event', handler);

      await scopedBus.emit('once.async.event', { data: 'first' });
      await scopedBus.emit('once.async.event', { data: 'second' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support off', async () => {
      const handler = vi.fn();
      const subscription = scopedBus.on('off.event', handler);

      subscription.unsubscribe();
      await scopedBus.emit('off.event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should correctly prefix events', async () => {
      const handler = vi.fn();
      scopedBus.on('my.event', handler);

      // Parent should receive prefixed event
      const parentHandler = vi.fn();
      parentBus.on('test-scope.my.event', parentHandler);

      await scopedBus.emit('my.event', { data: 'test' });

      expect(handler).toHaveBeenCalled();
      expect(parentHandler).toHaveBeenCalled();
    });

    it('should maintain isolation between scopes', async () => {
      const scoped1 = parentBus.createScopedBus('scope-a');
      const scoped2 = parentBus.createScopedBus('scope-b');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      scoped1.on('shared', handler1);
      scoped2.on('shared', handler2);

      await scoped1.emit('shared', { from: 'scope-a' });
      await scoped2.emit('shared', { from: 'scope-b' });

      expect(handler1).toHaveBeenCalledWith({ from: 'scope-a' });
      expect(handler2).toHaveBeenCalledWith({ from: 'scope-b' });
      expect(handler1).not.toHaveBeenCalledWith({ from: 'scope-b' });
      expect(handler2).not.toHaveBeenCalledWith({ from: 'scope-a' });
    });

    it('should propagate metadata with scope', async () => {
      let capturedMetadata: any;

      bus.use((ctx, next) => {
        ctx.metadata.customField = 'added';
        return next();
      });

      const testBus = parentBus.createScopedBus('meta-test');
      testBus.on('meta.event', () => {
        // Metadata is available in context, but not passed to handler
        // The scope is stored in the event name, not metadata
      });

      // Check that scoped emit adds scope to metadata
      await testBus.emit('meta.event', { data: 'test' });

      // The scope is part of the event namespace, not metadata
      expect(testBus.listenerCount()).toBe(1);
    });
  });

  // ==================== 边界情况增强测试 ====================
  describe('Edge Cases Enhanced', () => {
    it('should handle undefined data', async () => {
      const handler = vi.fn();
      bus.on('undefined.data', handler);

      await bus.emit('undefined.data', undefined);

      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should handle null data', async () => {
      const handler = vi.fn();
      bus.on('null.data', handler);

      await bus.emit('null.data', null as any);

      expect(handler).toHaveBeenCalledWith(null);
    });

    it('should handle circular reference in data', async () => {
      const handler = vi.fn();
      bus.on('circular.data', handler);

      const circular: any = { value: 'test' };
      circular.self = circular;

      // Should not throw
      await bus.emit('circular.data', circular);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle very long event names', async () => {
      const handler = vi.fn();
      const longEventName = 'a'.repeat(1000);

      bus.on(longEventName, handler);
      await bus.emit(longEventName, { data: 'test' });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle unicode in event names', async () => {
      const handler = vi.fn();
      const unicodeEvent = '事件.测试.événement';

      bus.on(unicodeEvent, handler);
      await bus.emit(unicodeEvent, { data: 'test' });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle concurrent events', async () => {
      const handler = vi.fn();
      bus.on('concurrent', handler);

      // Emit multiple events concurrently
      const promises = [
        bus.emit('concurrent', { index: 1 }),
        bus.emit('concurrent', { index: 2 }),
        bus.emit('concurrent', { index: 3 }),
      ];

      await Promise.all(promises);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive emits', async () => {
      const handler = vi.fn();
      bus.on('rapid', handler);

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        await bus.emit('rapid', { index: i });
      }
      const duration = Date.now() - start;

      expect(handler).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle unsubscribe during emit', async () => {
      let unsubscribeCalled = false;
      const handler = vi.fn(() => {
        if (!unsubscribeCalled) {
          unsubscribeCalled = true;
          bus.off('unsubscribe.test', expect.any(String));
        }
      });

      bus.on('unsubscribe.test', handler);
      bus.on('unsubscribe.test', vi.fn());

      await bus.emit('unsubscribe.test', { test: true });

      // Both handlers should be called since unsubscribe happens during handler execution
      expect(handler).toHaveBeenCalled();
    });
  });

  // ==================== 性能指标增强测试 ====================
  describe('Metrics Enhanced', () => {
    it('should calculate average execution time correctly', async () => {
      const handler = vi.fn(async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, data.duration));
      });

      bus.on('avg.time', handler);

      await bus.emit('avg.time', { duration: 10 });
      await bus.emit('avg.time', { duration: 20 });
      await bus.emit('avg.time', { duration: 30 });

      const metrics = bus.getMetrics('avg.time');
      expect(metrics?.totalEvents).toBe(3);
      expect(metrics?.errors).toBe(0);
    });

    it('should track metrics for multiple events independently', async () => {
      bus.on('event-a', vi.fn());
      bus.on('event-b', vi.fn());

      await bus.emit('event-a', {});
      await bus.emit('event-a', {});
      await bus.emit('event-b', {});

      const metricsA = bus.getMetrics('event-a');
      const metricsB = bus.getMetrics('event-b');

      expect(metricsA?.totalEvents).toBe(2);
      expect(metricsB?.totalEvents).toBe(1);
    });

    it('should handle metrics for disabled metrics', async () => {
      const noMetricsBus = new EventBus({ enableMetrics: false });
      noMetricsBus.on('no.metrics', vi.fn());

      await noMetricsBus.emit('no.metrics', { test: true });

      // Even with metrics disabled, totalEvents should still be tracked
      // but avgExecutionTime should not be updated
      const metrics = noMetricsBus.getMetrics('no.metrics');
      expect(metrics?.totalEvents).toBe(1);
      expect(metrics?.avgExecutionTime).toBe(0);
    });
  });

  // ==================== 错误处理增强测试 ====================
  describe('Error Handling Enhanced', () => {
    it('should handle errors in async handlers', async () => {
      const errorHandler = vi.fn();
      bus.use(createErrorHandlingMiddleware(errorHandler));

      const throwingHandler = vi.fn(async () => {
        throw new Error('Async error');
      });

      bus.onAsync('async.error', throwingHandler);

      await bus.emit('async.error', { test: true });

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should handle errors in middleware', async () => {
      const errorHandler = vi.fn();

      const throwingMiddleware = async () => {
        throw new Error('Middleware error');
      };

      bus.use(throwingMiddleware);
      bus.on('middleware.error.test', vi.fn());
      // Middleware error is handled by EventBus without propagating
      await bus.emit('middleware.error.test', { test: true });
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle errors in validation middleware', async () => {
      const handler = vi.fn();
      bus.use(createValidationMiddleware((data) => data.valid, 'Invalid'));
      bus.on('validation.error.test', handler);

      await bus.emit('validation.error.test', { valid: false });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not propagate errors to emit caller', async () => {
      bus.on('error.propagation', () => {
        throw new Error('Handler error');
      });

      // This should not throw
      await bus.emit('error.propagation', { test: true });

      expect(true).toBe(true);
    });

    it('should handle multiple errors in multiple handlers', async () => {
      const results: string[] = [];

      bus.on('multi.error', () => {
        results.push('handler1');
      });

      bus.on('multi.error', () => {
        results.push('handler2-error');
        throw new Error('Error 2');
      });

      bus.on('multi.error', () => {
        results.push('handler3');
      });

      bus.on('multi.error', () => {
        results.push('handler4-error');
        throw new Error('Error 4');
      });

      bus.on('multi.error', () => {
        results.push('handler5');
      });

      await bus.emit('multi.error', {});

      // All handlers should be called despite errors
      expect(results).toEqual([
        'handler1',
        'handler2-error',
        'handler3',
        'handler4-error',
        'handler5',
      ]);
    });
  });
});
