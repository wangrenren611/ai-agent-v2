#!/bin/bash

# ============================================================================
# AI Agent - 系统环境变量配置脚本
# ============================================================================
# 类似 Claude Code 的方式：直接使用 ANTHROPIC_API_KEY
# ============================================================================

set -e

echo "=========================================="
echo "  AI Agent - 环境变量配置 (Claude Code 风格）"
echo "=========================================="
echo ""

# 检测 Shell 类型
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
    SHELL_NAME="bash"
else
    echo "❌ 不支持的 Shell 类型"
    echo "   支持: zsh, bash"
    exit 1
fi

echo "检测到 Shell: $SHELL_NAME"
echo "配置文件: $SHELL_CONFIG"
echo ""

# 检查是否已有 ANTHROPIC_API_KEY
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY 已设置"
    echo "   当前值: ${ANTHROPIC_API_KEY:0:12}..."
    echo ""
    read -p "是否要重新配置？(y/n) " should_reconfig
    if [[ ! "$should_reconfig" =~ ^[Yy]$ ]]; then
        echo "保持当前配置"
        exit 0
    fi
fi

# 获取 API Key
echo ""
echo "=========================================="
echo "  配置 API Key"
echo "=========================================="
echo ""
echo "请输入你的 API Key (推荐使用 GLM):"
echo ""
echo "获取地址:"
echo "  GLM: https://open.bigmodel.cn/usercenter/apikeys"
echo "  Kimi: https://platform.moonshot.cn/console/api-keys"
echo "  DeepSeek: https://platform.deepseek.com/api_keys"
echo ""
read -p "API Key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ API Key 不能为空"
    exit 1
fi

# 选择模型
echo ""
echo "请选择模型:"
echo "1) glm-4.7 (推荐）"
echo "2) glm-4-plus"
echo "3) kimi-k2.5"
echo "4) deepseek-chat"
echo "5) gpt-4o-mini"
echo ""
read -p "请输入选项 (1-5, 默认 1): " model_choice

# 映射模型选择
case $model_choice in
    2)
        model_name="glm-4-plus"
        ;;
    3)
        model_name="kimi-k2.5"
        ;;
    4)
        model_name="deepseek-chat"
        ;;
    5)
        model_name="gpt-4o-mini"
        ;;
    *)
        model_name="glm-4.7"
        ;;
esac

echo "选择的模型: $model_name"

# 获取温度（可选）
echo ""
read -p "生成温度 (0-2, 默认 0.7, 直接回车跳过): " temperature

if [ -z "$temperature" ]; then
    temperature="0.7"
fi

# 备份原配置文件
if [ -f "$SHELL_CONFIG" ]; then
    backup_file="${SHELL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SHELL_CONFIG" "$backup_file"
    echo "✅ 已备份原配置文件: $backup_file"
fi

# 添加环境变量到配置文件
echo ""
echo "=========================================="
echo "  写入环境变量到 $SHELL_CONFIG"
echo "=========================================="
echo ""

# 检查是否已存在 AI Agent 配置
if grep -q "AI Agent Configuration" "$SHELL_CONFIG" 2>/dev/null; then
    echo "检测到已存在的配置，将更新..."
    
    # 删除旧的 AI Agent 配置
    # 使用 sed 删除包含标记的行
    sed -i.backup '/# AI Agent Configuration/,/# End AI Agent Configuration/d' "$SHELL_CONFIG"
fi

# 追加新配置
cat >> "$SHELL_CONFIG" <<'EOF'

# ============================================================================
# AI Agent Configuration (类似 Claude Code）
# ============================================================================

export ANTHROPIC_API_KEY="__API_KEY__"
export AI_MODEL="__MODEL__"
export TEMPERATURE="__TEMP__"

# End AI Agent Configuration
EOF

# 替换占位符
sed -i.bak "s/__API_KEY__/$api_key/g" "$SHELL_CONFIG"
sed -i.bak "s/__MODEL__/$model_name/g" "$SHELL_CONFIG"
sed -i.bak "s/__TEMP__/$temperature/g" "$SHELL_CONFIG"

# 清理备份文件
rm -f "${SHELL_CONFIG}.bak"

echo "✅ 配置已写入"
echo ""
echo "配置摘要:"
echo "  API Key: ${api_key:0:12}..."
echo "  模型: $model_name"
echo "  温度: $temperature"
echo ""

# 清空 .env 文件（可选）
echo ""
read -p "是否清空 .env 文件，改用环境变量？(y/n) " clear_env

if [[ "$clear_env" =~ ^[Yy]$ ]]; then
    if [ -f ".env.development" ]; then
        mv .env.development .env.development.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ .env.development 已备份"
    fi
    if [ -f ".env.production" ]; then
        mv .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ .env.production 已备份"
    fi
fi

# 下一步
echo ""
echo "=========================================="
echo "  配置完成！"
echo "=========================================="
echo ""
echo "下一步:"
echo ""
echo "1. 重新加载 Shell 配置:"
if [ "$SHELL_NAME" = "zsh" ]; then
    echo "   source ~/.zshrc"
    echo "   或"
    echo "   exec zsh"
elif [ "$SHELL_NAME" = "bash" ]; then
    echo "   source ~/.bash_profile"
    echo "   或"
    echo "   exec bash"
fi
echo ""
echo "2. 验证配置:"
echo "   echo \$ANTHROPIC_API_KEY"
echo "   echo \$AI_MODEL"
echo ""
echo "3. 运行 AI Agent:"
echo "   pnpm dev"
echo ""
echo "4. 或使用 CLI 模式:"
echo "   pnpm dev:cli-v2-ink"
echo ""
echo "💡 提示: 配置已写入 $SHELL_CONFIG"
echo "   重启终端后生效"
echo ""
