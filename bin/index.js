#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 构建dist目录中的主文件路径
const mainFile = path.join(projectRoot, 'dist', 'cli-v3-ink/index.js');

// 检查文件是否存在
if (!fs.existsSync(mainFile)) {
  console.error('Error: Built files not found. Please run "npm run build" first.');
  process.exit(1);
}

// 传递所有参数给主程序
const args = process.argv.slice(2);

// 处理帮助和版本参数（不需要 TTY）
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
AI Agent v2 - CLI Assistant

Usage:
  Qpscode [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version number
  <message>      Start interactive chat with a message

For interactive mode, run without arguments.
  `);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

// 使用当前Node.js进程运行构建后的文件
const child = spawn(process.execPath, [mainFile, ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('close', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});