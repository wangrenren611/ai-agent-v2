#!/usr/bin/env node
/**
 * 运行独立 CLI
 */
const { spawn } = require('child_process');
const path = require('path');

const nodePath = process.execPath;
const scriptPath = path.join(__dirname, '..', 'src', 'cli-standalone.mjs');

const child = spawn(nodePath, [scriptPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'development',
    },
});

child.on('error', (error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code || 0);
});

process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
});
