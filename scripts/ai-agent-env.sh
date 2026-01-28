#!/bin/bash

# ============================================================================
# AI Agent 全局环境变量配置
# ============================================================================
#
# 使用方法:
#   1. 复制此文件到 ~/.ai-agent-env.sh
#   2. 编辑文件，填入你的 API Key
#   3. 在 ~/.zshrc 或 ~/.bash_profile 中添加:
#      source ~/.ai-agent-env.sh
# ============================================================================

# ============================================================================
# LLM Provider Configuration
# ============================================================================

# 选择默认模型
export AI_MODEL="glm-4.7"

# 生成温度
export TEMPERATURE="0.7"

# ============================================================================
# GLM Configuration (推荐)
# ============================================================================

export GLM_API_KEY="your-glm-api-key-here"
export GLM_BASE_URL="https://open.bigmodel.cn/api/coding/paas/v4"

# ============================================================================
# Kimi Configuration (备用)
# ============================================================================

export KIMI_API_KEY="your-kimi-api-key-here"
export KIMI_BASE_URL="https://api.moonshot.cn/v1"

# ============================================================================
# DeepSeek Configuration (备用)
# ============================================================================

export DEEPSEEK_API_KEY="your-deepseek-api-key-here"
export DEEPSEEK_BASE_URL="https://api.deepseek.com"

# ============================================================================
# OpenAI Configuration (备用)
# ============================================================================

export OPENAI_API_KEY="your-openai-api-key-here"
export OPENAI_BASE_URL="https://api.openai.com/v1"

# ============================================================================
# MiniMax Configuration (备用)
# ============================================================================

export MINIMAX_API_KEY="your-minimax-api-key-here"
export MINIMAX_GROUP_ID="your-minimax-group-id"
export MINIMAX_BASE_URL="https://api.minimax.chat/v1"

# ============================================================================
# Qwen Configuration (备用)
# ============================================================================

export QWEN_API_KEY="your-qwen-api-key-here"
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# ============================================================================
# Web Search API Configuration
# ============================================================================

export TAVILY_API_KEY="your-tavily-api-key-here"

# ============================================================================
# Agent Configuration
# ============================================================================

export AGENT_MAX_LOOP="1024"
export AGENT_TIMEOUT="60000"
export AGENT_ENABLE_BACKUP="true"
export AGENT_MAX_BACKUPS="5"

echo "✅ AI Agent 环境变量已加载"
echo "   当前模型: $AI_MODEL"
