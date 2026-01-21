/**
 * EventBus 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EventBus,
  TypedEventBus,
  eventBus,
  typedEventBus,
  createLoggingMiddleware,
  createErrorHandlingMiddleware,
  createValidationMiddleware,
  ScopedEventBus,
  type EventMetrics,
} from './event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.offAll();
  });

  describe('基本功能', () => {
    it('应该订阅和触发事件', () => {
      const handler = vi.fn();
      bus.on('test.event', handler);
      
      bus.emit('test.event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该支持多个处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('test.event', handler1);
      bus.on('test.event', handler2);
      
      bus.emit('test.event', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('应该支持异步处理器', async () => {
      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      bus.onAsync('test.event', handler);
      
      await bus.emit('test.event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持一次性订阅', () => {
      const handler = vi.fn();
      
      bus.once('test.event', handler);
      
      bus.emit('test.event', { data: 'first' });
      bus.emit('test.event', { data: 'second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'first' });
    });

    it('应该支持取消订阅', () => {
      const handler = vi.fn();
      const subscription = bus.on('test.event', handler);
      
      bus.emit('test.event', { data: 'first' });
      subscription.unsubscribe();
      bus.emit('test.event', { data: 'second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持通过 handlerId 取消订阅', () => {
      const handler = vi.fn();
      bus.on('test.event', handler, 'custom-id');
      
      bus.emit('test.event', { data: 'first' });
      bus.off('test.event', 'custom-id');
      bus.emit('test.event', { data: 'second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持等待事件', async () => {
      setTimeout(() => {
        bus.emit('test.event', { data: 'delayed' });
      }, 50);
      
      const result = await bus.waitFor('test.event', 100);
      expect(result).toEqual({ data: 'delayed' });
    });

    it('等待事件应该超时', async () => {
      await expect(bus.waitFor('test.event', 10))
        .rejects
        .toThrow('Timeout waiting for event: test.event');
    });
  });

  describe('中间件', () => {
    it('应该执行全局中间件', async () => {
      const middleware = vi.fn(async (context, next) => {
        expect(context.event).toBe('test.event');
        expect(context.data).toEqual({ data: 'test' });
        await next();
      });
      
      const handler = vi.fn();
      
      bus.use(middleware);
      bus.on('test.event', handler);
      
      await bus.emit('test.event', { data: 'test' });
      
      expect(middleware).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该执行事件特定中间件', async () => {
      const globalMiddleware = vi.fn(async (_, next) => await next());
      const eventMiddleware = vi.fn(async (_, next) => await next());
      
      bus.use(globalMiddleware);
      bus.useForEvent('specific.event', eventMiddleware);
      
      bus.on('specific.event', vi.fn());
      bus.on('other.event', vi.fn());
      
      await bus.emit('specific.event', {});
      await bus.emit('other.event', {});
      
      expect(globalMiddleware).toHaveBeenCalledTimes(2);
      expect(eventMiddleware).toHaveBeenCalledTimes(1);
    });

    it('中间件可以中止事件', async () => {
      const handler = vi.fn();
      bus.use(async (context, next) => {
        if (context.data.shouldAbort) {
          context.abort();
          return;
        }
        await next();
      });
      
      bus.on('test.event', handler);
      
      await bus.emit('test.event', { shouldAbort: true });
      await bus.emit('test.event', { shouldAbort: false });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('内置日志中间件应该工作', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      bus.use(createLoggingMiddleware('Test'));
      bus.on('test.event', () => {});
      
      await bus.emit('test.event', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('内置错误处理中间件应该工作', async () => {
      const errorHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      bus.use(createErrorHandlingMiddleware(errorHandler));
      bus.on('test.event', () => {
        throw new Error('Test error');
      });
      
      await expect(bus.emit('test.event', {}))
        .rejects
        .toThrow('Test error');
      
      expect(errorHandler).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('内置验证中间件应该工作', async () => {
      const validator = (data: any) => data.valid === true;
      
      bus.useForEvent('test.event', createValidationMiddleware(validator, 'Validation failed'));
      bus.on('test.event', vi.fn());
      
      await expect(bus.emit('test.event', { valid: false }))
        .rejects
        .toThrow('Validation failed for event: test.event');
      
      await expect(bus.emit('test.event', { valid: true }))
        .resolves
        .toBeUndefined();
    });
  });

  describe('作用域事件总线', () => {
    it('应该创建作用域总线', () => {
      const scopedBus = bus.createScopedBus('test');
      expect(scopedBus).toBeInstanceOf(ScopedEventBus);
    });

    it('作用域总线应该添加作用域前缀', () => {
      const handler = vi.fn();
      const scopedBus = bus.createScopedBus('test');
      
      scopedBus.on('event', handler);
      scopedBus.emit('event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      
      // 父总线也能收到带作用域前缀的事件
      const parentHandler = vi.fn();
      bus.on('test.event', parentHandler);
      scopedBus.emit('event', { data: 'test2' });
      
      expect(parentHandler).toHaveBeenCalledWith({ data: 'test2' });
    });

    it('应该支持取消作用域所有事件', () => {
      const scopedBus = bus.createScopedBus('test');
      const handler = vi.fn();
      
      scopedBus.on('event1', handler);
      scopedBus.on('event2', handler);
      
      expect(bus.listenerCount('test.event1')).toBe(1);
      expect(bus.listenerCount('test.event2')).toBe(1);
      
      scopedBus.offAll();
      
      expect(bus.listenerCount('test.event1')).toBe(0);
      expect(bus.listenerCount('test.event2')).toBe(0);
    });
  });

  describe('性能监控', () => {
    it('应该收集指标', async () => {
      const monitoredBus = new EventBus({ enableMetrics: true });
      
      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      monitoredBus.onAsync('test.event', handler);
      await monitoredBus.emit('test.event', {});

      const metrics = monitoredBus.getMetrics('test.event') as EventMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.totalHandlers).toBe(1);
      expect(metrics.avgExecutionTime).toBeGreaterThan(0);

      monitoredBus.offAll();
    });

    it('应该重置指标', () => {
      const monitoredBus = new EventBus({ enableMetrics: true });

      monitoredBus.on('test.event', vi.fn());
      monitoredBus.emit('test.event', {});

      let metrics = monitoredBus.getMetrics('test.event') as EventMetrics;
      expect(metrics.totalEvents).toBe(1);

      monitoredBus.resetMetrics('test.event');
      metrics = monitoredBus.getMetrics('test.event') as EventMetrics;
      expect(metrics.totalEvents).toBe(0);

      monitoredBus.offAll();
    });
  });

  describe('错误处理', () => {
    it('应该捕获同步处理器错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      bus.on('test.event', () => {
        throw new Error('Sync error');
      });
      
      await expect(bus.emit('test.event', {}))
        .resolves
        .toBeUndefined();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该捕获异步处理器错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      bus.onAsync('test.event', async () => {
        throw new Error('Async error');
      });
      
      await expect(bus.emit('test.event', {}))
        .resolves
        .toBeUndefined();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该处理监听器数量限制', () => {
      const busWithLimit = new EventBus({ maxListeners: 2 });
      
      busWithLimit.on('test.event', vi.fn(), 'handler1');
      busWithLimit.on('test.event', vi.fn(), 'handler2');
      
      expect(() => {
        busWithLimit.on('test.event', vi.fn(), 'handler3');
      }).toThrow('Maximum listeners (2) exceeded for event: test.event');
    });

    it('应该处理异步禁用时的错误', () => {
      const busWithoutAsync = new EventBus({ enableAsync: false });
      
      expect(() => {
        busWithoutAsync.onAsync('test.event', vi.fn());
      }).toThrow('Async events are disabled');
    });
  });

  describe('TypedEventBus', () => {
    interface TestEvents {
      'user.created': { id: string; name: string };
      'order.placed': { orderId: string; amount: number };
    }

    it('应该提供类型安全', () => {
      const typedBus = new TypedEventBus<TestEvents>();
      
      // 这些应该通过 TypeScript 类型检查
      typedBus.on('user.created', (user) => {
        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
      });
      
      typedBus.emit('user.created', {
        id: '123',
        name: 'Test User'
      });
      
      // 这些应该在编译时失败（但在运行时测试中我们无法测试）
      // typedBus.on('unknown.event', () => {}); // 类型错误
      // typedBus.emit('user.created', { id: '123' }); // 缺少 name，类型错误
    });

    it('应该支持类型安全的中间件', () => {
      const typedBus = new TypedEventBus<TestEvents>();
      
      typedBus.useForEvent('user.created', async (context, next) => {
        expect(context.data.id).toBeDefined();
        await next();
      });
      
      typedBus.on('user.created', vi.fn());
      
      expect(() => {
        typedBus.emit('user.created', {
          id: '123',
          name: 'Test'
        });
      }).not.toThrow();
    });
  });

  describe('单例实例', () => {
    it('应该提供默认 eventBus 单例', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
      
      const handler = vi.fn();
      eventBus.on('singleton.test', handler);
      eventBus.emit('singleton.test', { data: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      eventBus.offAll('singleton.test');
    });

    it('应该提供默认 typedEventBus 单例', () => {
      expect(typedEventBus).toBeDefined();
      
      const handler = vi.fn();
      typedEventBus.on('session.message.added', handler);
      typedEventBus.emit('session.message.added', {
        sessionId: 'test',
        message: { content: 'test' }
      });
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      typedEventBus.offAll('session.message.added');
    });
  });

  describe('实用函数', () => {
    it('应该支持 listenerCount', () => {
      bus.on('event1', vi.fn());
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());
      
      expect(bus.listenerCount('event1')).toBe(2);
      expect(bus.listenerCount('event2')).toBe(1);
      expect(bus.listenerCount()).toBe(3);
    });

    it('应该支持 eventNames', () => {
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());
      bus.onAsync('event3', vi.fn());
      
      const events = bus.eventNames();
      expect(events).toContain('event1');
      expect(events).toContain('event2');
      expect(events).toContain('event3');
    });

    it('应该支持 offAll', () => {
      bus.on('event1', vi.fn());
      bus.on('event2', vi.fn());
      bus.onAsync('event3', vi.fn());
      
      expect(bus.listenerCount()).toBe(3);
      
      bus.offAll('event1');
      expect(bus.listenerCount()).toBe(2);
      
      bus.offAll();
      expect(bus.listenerCount()).toBe(0);
    });
  });
});