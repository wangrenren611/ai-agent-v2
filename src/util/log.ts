import chalk from 'chalk';
import ora, { Ora } from 'ora';

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const LEVEL_COLOR: Record<Exclude<LogLevel, 'silent'>, (s: string) => string> = {
  error: (s) => chalk.red(s),
  warn: (s) => chalk.yellow(s),
  info: (s) => chalk.blue(s),
  debug: (s) => chalk.gray(s),
};

function now(): string {
  return new Date().toISOString();
}

function stringify(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof Error) {
    const name = input.name || 'Error';
    const msg = input.message || '';
    const stack = input.stack ? `\n${input.stack}` : '';
    return `${name}: ${msg}${stack}`;
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function enabled(current: LogLevel, target: LogLevel): boolean {
  return LEVEL_ORDER[current] >= LEVEL_ORDER[target] && current !== 'silent';
}

function prefix(level: Exclude<LogLevel, 'silent'>, scope?: string): string {
  const base = `[${now()}] [${level.toUpperCase()}]`;
  const colored = LEVEL_COLOR[level](base);
  return scope ? `${colored} [${scope}]` : colored;
}

/**
 * 基于作用域的轻量日志封装
 * 使用场景：为不同子系统/模块创建专属日志器，统一输出风格且保留来源。
 */
class ScopedLogger {
  private readonly scope?: string;
  constructor(scope?: string) {
    this.scope = scope;
  }
  /**
   * 输出一般信息
   * 使用场景：模块初始化、配置加载结果、阶段进入、非异常运行态。
   * @param msg 字符串、对象或 Error，自动格式化
   */
  info(msg: unknown) {
    Log.info(msg, this.scope);
  }
  /**
   * 输出警告信息
   * 使用场景：可恢复异常、降级提示、重试提醒、即将过期/弃用。
   * @param msg 字符串、对象或 Error，自动格式化
   */
  warn(msg: unknown) {
    Log.warn(msg, this.scope);
  }
  /**
   * 输出错误信息
   * 使用场景：失败、异常中断、外部依赖不可用、需要关注的故障。
   * @param msg 字符串、对象或 Error，自动格式化（Error含stack）
   */
  error(msg: unknown) {
    Log.error(msg, this.scope);
  }
  /**
   * 输出成功信息
   * 使用场景：任务完成、构建成功、数据同步完成、阶段性里程碑。
   * @param msg 字符串或对象
   */
  success(msg: unknown) {
    Log.success(msg, this.scope);
  }
  /**
   * 输出调试信息
   * 使用场景：开发诊断、性能测量、参数/上下文细节、仅在debug级别显示。
   * @param msg 字符串或对象
   */
  debug(msg: unknown) {
    Log.debug(msg, this.scope);
  }
  /**
   * 结构化输出对象/JSON
   * 使用场景：接口返回、配置快照、调试上下文、状态采样。
   * @param obj 任意对象（自动JSON格式化）
   * @param label 可选标签，便于快速定位
   */
  json(obj: unknown, label?: string) {
    Log.json(obj, label, this.scope);
  }
  /**
   * 创建并启动进度Spinner
   * 使用场景：长耗时任务（拉取、构建、迁移、上传）；在非TTY自动降级。
   * @param text Spinner文案
   * @returns Ora实例，可用于succeed/fail/stop
   */
  spinner(text: string): Ora {
    return Log.spinner(text, this.scope);
  }
}

/**
 * 企业级日志工具：多级日志、作用域、结构化输出、进度Spinner。
 * 级别控制：LOG_LEVEL（silent|error|warn|info|debug）或设置DEBUG=1等价debug级别。
 * 注意：避免输出敏感信息（密钥、令牌、隐私数据）。
 */
class Log {
  private static level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.DEBUG ? 'debug' : 'info');

  /**
   * 设置全局日志级别
   * 使用场景：测试环境降低噪音、生产环境关闭debug、临时提升诊断粒度。
   * @param level 日志级别
   */
  static setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * 获取当前全局日志级别
   * 使用场景：运行时判断或输出诊断信息。
   * @returns 当前日志级别
   */
  static getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 输出一般信息
   * 使用场景：常规运行信息、关键步骤进入、配置加载结果。
   * @param msg 字符串、对象或 Error，自动格式化
   * @param scope 作用域名称（可选）
   */
  static info(msg: unknown, scope?: string) {
    if (!enabled(this.level, 'info')) return;
    console.log(`${prefix('info', scope)} ${chalk.green(stringify(msg))}`);
  }

  /**
   * 输出警告信息
   * 使用场景：可恢复异常、降级路径、超时重试提醒、弃用提示。
   * @param msg 字符串、对象或 Error，自动格式化
   * @param scope 作用域名称（可选）
   */
  static warn(msg: unknown, scope?: string) {
    if (!enabled(this.level, 'warn')) return;
    console.warn(`${prefix('warn', scope)} ${chalk.yellow(stringify(msg))}`);
  }

  /**
   * 输出错误信息
   * 使用场景：失败、异常中断、外部依赖不可用、需告警事件。
   * @param msg 字符串、对象或 Error，自动格式化（Error含stack）
   * @param scope 作用域名称（可选）
   */
  static error(msg: unknown, scope?: string) {
    if (!enabled(this.level, 'error')) return;
    console.error(`${prefix('error', scope)} ${chalk.red(stringify(msg))}`);
  }

  /**
   * 输出成功信息
   * 使用场景：任务完成、构建成功、数据同步完成、阶段性里程碑。
   * @param msg 字符串或对象
   * @param scope 作用域名称（可选）
   */
  static success(msg: unknown, scope?: string) {
    if (!enabled(this.level, 'info')) return;
    const p = `[${now()}] [SUCCESS]`;
    console.log(`${chalk.green(p)}${scope ? ` [${scope}]` : ''} ${chalk.green(stringify(msg))}`);
  }

  /**
   * 输出调试信息（仅在debug级别显示）
   * 使用场景：开发诊断、性能测量、参数与上下文细节。
   * @param msg 字符串或对象
   * @param scope 作用域名称（可选）
   */
  static debug(msg: unknown, scope?: string) {
    if (!enabled(this.level, 'debug')) return;
    console.debug(`${prefix('debug', scope)} ${chalk.gray(stringify(msg))}`);
  }

  /**
   * 结构化输出对象/JSON
   * 使用场景：接口返回、配置快照、调试上下文、状态采样。
   * @param obj 任意对象（自动JSON格式化）
   * @param label 可选标签，便于快速定位
   * @param scope 作用域名称（可选）
   */
  static json(obj: unknown, label?: string, scope?: string) {
    const body = stringify(obj);
    const head = label ? `${label}:` : '';
    if (enabled(this.level, 'info')) {
      console.log(`${prefix('info', scope)} ${chalk.white(head)}\n${body}`);
    }
  }

  /**
   * 创建指定作用域的日志器
   * 使用场景：为模块/子系统分配独立前缀，便于定位日志来源。
   * @param name 作用域名称
   * @returns ScopedLogger
   */
  static scope(name: string): ScopedLogger {
    return new ScopedLogger(name);
  }

  /**
   * 创建并启动进度Spinner
   * 使用场景：长耗时任务（拉取、构建、迁移、上传），TTY环境显示动画。
   * @param text Spinner文案
   * @param scope 作用域名称（可选）
   * @returns Ora实例，可用于succeed/fail/stop
   */
  static spinner(text: string, scope?: string): Ora {
    const full = scope ? `[${scope}] ${text}` : text;
    const isEnabled = process.stdout.isTTY;
    const s = ora({ text: full, isEnabled, spinner: 'dots' }).start();
    return s;
  }

  /**
   * 标记Spinner成功结束
   * 使用场景：步骤执行成功后结束进度展示。
   * @param spinner Ora实例
   * @param text 结束文案（可选）
   */
  static spinnerSucceed(spinner: Ora, text?: string) {
    spinner.succeed(text);
  }

  /**
   * 标记Spinner失败结束
   * 使用场景：步骤执行失败后结束进度展示。
   * @param spinner Ora实例
   * @param text 结束文案（可选）
   */
  static spinnerFail(spinner: Ora, text?: string) {
    spinner.fail(text);
  }

  /**
   * 停止Spinner但不改变状态
   * 使用场景：中断或切换到另一步骤前清理Spinner。
   * @param spinner Ora实例
   */
  static spinnerStop(spinner: Ora) {
    spinner.stop();
  }
}

export default Log;
export { ScopedLogger };
