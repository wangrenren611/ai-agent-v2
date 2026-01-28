#!/bin/bash

# ============================================================================
# AI Agent - 环境变量测试脚本
# ============================================================================
# 验证系统环境变量配置是否正确（类似 Claude Code）
# ============================================================================

set -e

echo "=========================================="
echo "  AI Agent - 环境变量测试 (Claude Code 风格）"
echo "=========================================="
echo ""

# 检查核心环境变量
echo "📋 检查核心环境变量..."
echo ""

has_error=0

# 检查 ANTHROPIC_API_KEY（类似 Claude Code）
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:20}..."
else
    echo "⚠️  ANTHROPIC_API_KEY: 未设置"
    echo "   提示: 使用 ANTHROPIC_API_KEY 作为通用 API Key（类似 Claude Code）"
fi

echo ""

# 检查 AI_MODEL
if [ -n "$AI_MODEL" ]; then
    echo "✅ AI_MODEL: $AI_MODEL"
else
    echo "⚠️  AI_MODEL: 未设置（将使用默认值: gpt-4o）"
fi

echo ""

# 检查 TEMPERATURE
if [ -n "$TEMPERATURE" ]; then
    echo "✅ TEMPERATURE: $TEMPERATURE"
else
    echo "ℹ️  TEMPERATURE: 未设置（将使用默认值: 0.7）"
fi

echo ""
echo "=========================================="
echo "  检查特定提供者的 API Key"
echo "=========================================="
echo ""

# GLM
if [ -n "$GLM_API_KEY" ]; then
    echo "✅ GLM_API_KEY: ${GLM_API_KEY:0:20}..."
    if [ -n "$GLM_BASE_URL" ]; then
        echo "   GLM_BASE_URL: $GLM_BASE_URL"
    fi
else
    echo "ℹ️  GLM_API_KEY: 未设置"
fi

echo ""

# Kimi
if [ -n "$KIMI_API_KEY" ]; then
    echo "✅ KIMI_API_KEY: ${KIMI_API_KEY:0:20}..."
    if [ -n "$KIMI_BASE_URL" ]; then
        echo "   KIMI_BASE_URL: $KIMI_BASE_URL"
    fi
else
    echo "ℹ️  KIMI_API_KEY: 未设置"
fi

echo ""

# DeepSeek
if [ -n "$DEEPSEEK_API_KEY" ]; then
    echo "✅ DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:20}..."
    if [ -n "$DEEPSEEK_BASE_URL" ]; then
        echo "   DEEPSEEK_BASE_URL: $DEEPSEEK_BASE_URL"
    fi
else
    echo "ℹ️  DEEPSEEK_API_KEY: 未设置"
fi

echo ""

# OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ OPENAI_API_KEY: ${OPENAI_API_KEY:0:20}..."
    if [ -n "$OPENAI_BASE_URL" ]; then
        echo "   OPENAI_BASE_URL: $OPENAI_BASE_URL"
    fi
else
    echo "ℹ️  OPENAI_API_KEY: 未设置"
fi

echo ""

# MiniMax
if [ -n "$MINIMAX_API_KEY" ]; then
    echo "✅ MINIMAX_API_KEY: ${MINIMAX_API_KEY:0:20}..."
    if [ -n "$MINIMAX_BASE_URL" ]; then
        echo "   MINIMAX_BASE_URL: $MINIMAX_BASE_URL"
    fi
    if [ -n "$MINIMAX_GROUP_ID" ]; then
        echo "   MINIMAX_GROUP_ID: $MINIMAX_GROUP_ID"
    fi
else
    echo "ℹ️  MINIMAX_API_KEY: 未设置"
fi

echo ""

# Qwen
if [ -n "$QWEN_API_KEY" ]; then
    echo "✅ QWEN_API_KEY: ${QWEN_API_KEY:0:20}..."
    if [ -n "$QWEN_BASE_URL" ]; then
        echo "   QWEN_BASE_URL: $QWEN_BASE_URL"
    fi
else
    echo "ℹ️  QWEN_API_KEY: 未设置"
fi

echo ""
echo "=========================================="
echo "  检查其他配置"
echo "=========================================="
echo ""

# PROJECT_DIRECTORY
if [ -n "$PROJECT_DIRECTORY" ]; then
    echo "✅ PROJECT_DIRECTORY: $PROJECT_DIRECTORY"
else
    echo "ℹ️  PROJECT_DIRECTORY: 未设置（将使用当前目录）"
fi

echo ""

# VCS
if [ -n "$VCS" ]; then
    echo "✅ VCS: $VCS"
else
    echo "ℹ️  VCS: 未设置（将使用默认值: git）"
fi

echo ""

# PROJECT_LANGUAGE
if [ -n "$PROJECT_LANGUAGE" ]; then
    echo "✅ PROJECT_LANGUAGE: $PROJECT_LANGUAGE"
else
    echo "ℹ️  PROJECT_LANGUAGE: 未设置"
fi

echo ""
echo "=========================================="
echo "  配置优先级检测"
echo "=========================================="
echo ""

# 检测优先级
priority_count=0

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "🥇 优先级 1: ANTHROPIC_API_KEY (通用 Key，类似 Claude Code）"
    ((priority_count++))
elif [ -n "$GLM_API_KEY" ]; then
    echo "🥈 优先级 2: GLM_API_KEY (GLM 专用）"
    ((priority_count++))
elif [ -n "$KIMI_API_KEY" ]; then
    echo "🥈 优先级 2: KIMI_API_KEY (Kimi 专用）"
    ((priority_count++))
elif [ -n "$DEEPSEEK_API_KEY" ]; then
    echo "🥈 优先级 2: DEEPSEEK_API_KEY (DeepSeek 专用）"
    ((priority_count++))
elif [ -n "$OPENAI_API_KEY" ]; then
    echo "🥈 优先级 2: OPENAI_API_KEY (OpenAI 专用）"
    ((priority_count++))
elif [ -n "$MINIMAX_API_KEY" ]; then
    echo "🥈 优先级 2: MINIMAX_API_KEY (MiniMax 专用）"
    ((priority_count++))
elif [ -n "$QWEN_API_KEY" ]; then
    echo "🥈 优先级 2: QWEN_API_KEY (Qwen 专用）"
    ((priority_count++))
fi

if [ -f ".env.development" ]; then
    echo "🥉 优先级 3: .env.development 文件"
    ((priority_count++))
fi

if [ $priority_count -eq 0 ]; then
    echo "❌ 未检测到任何 API Key 配置"
    echo ""
    echo "请选择以下方式之一配置："
    echo ""
    echo "方式 1: 使用 ANTHROPIC_API_KEY（推荐，类似 Claude Code）"
    echo "  export ANTHROPIC_API_KEY=\"your-api-key\""
    echo "  export AI_MODEL=\"glm-4.7\""
    echo ""
    echo "方式 2: 使用特定提供者的 API Key"
    echo "  export GLM_API_KEY=\"your-api-key\""
    echo "  export AI_MODEL=\"glm-4.7\""
    echo ""
    echo "方式 3: 创建 .env.development 文件"
    echo "  cp .env.development.example .env.development"
    echo "  nano .env.development"
    echo ""
    echo "或运行配置向导:"
    echo "  ./scripts/setup-env.sh"
    echo ""
    has_error=1
fi

echo ""

# 总结
if [ $has_error -eq 0 ]; then
    echo "=========================================="
    echo "  ✅ 配置检测完成"
    echo "=========================================="
    echo ""
    echo "下一步:"
    echo "  1. 运行 AI Agent:"
    echo "     pnpm dev"
    echo ""
    echo "  2. 或运行 CLI 模式:"
    echo "     pnpm dev:cli-v2-ink"
    echo ""
else
    echo "=========================================="
    echo "  ⚠️  配置检测失败"
    echo "=========================================="
    echo ""
    echo "请先配置 API Key 后再运行"
    echo ""
    exit 1
fi
