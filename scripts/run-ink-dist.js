/**
 * Ink CLI 运行脚本 - 使用编译后的 dist 文件
 */
import { render } from 'ink';
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Spinner } from '@inkjs/ui';
import { CLIApp } from './dist/cli-ink/index.js';

dotenv.config({ path: '.env.development', override: true });

// ... 其余代码
