#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 构建dist目录中的主文件路径
const mainFile = path.join(projectRoot, 'dist', 'index.js');

// 检查文件是否存在
const fs = require('fs');
if (!fs.existsSync(mainFile)) {
  console.error('Error: Built files not found. Please run "npm run build" first.');
  process.exit(1);
}

// 传递所有参数给主程序
const args = process.argv.slice(2);

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