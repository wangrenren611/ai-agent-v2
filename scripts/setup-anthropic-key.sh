#!/bin/bash

# ============================================================================
# AI Agent - 快速设置 ANTHROPIC_API_KEY (类似 Claude Code）
# ============================================================================

set -e

echo "=========================================="
echo "  AI Agent - 设置 ANTHROPIC_API_KEY"
echo "=========================================="
echo ""
echo "类似 Claude Code，使用 ANTHROPIC_API_KEY 作为通用 API Key"
echo ""

# 检测 Shell 类型
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_NAME="bash"
    if [ -f "$HOME/.bashrc" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    else
        SHELL_CONFIG="$HOME/.bash_profile"
    fi
else
    echo "❌ 不支持的 Shell 类型"
    echo "   支持: zsh, bash"
    exit 1
fi

echo "检测到 Shell: $SHELL_NAME"
echo "配置文件: $SHELL_CONFIG"
echo ""

# 获取 API Key
echo "=========================================="
echo "  输入 API Key"
echo "=========================================="
echo ""
echo "请输入你的 API Key (GLM、Kimi、DeepSeek 等):"
echo ""
echo "快速获取 API Key:"
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
echo "=========================================="
echo "  选择模型"
echo "=========================================="
echo ""
echo "请选择默认模型:"
echo "1) glm-4.7 (推荐，GLM）"
echo "2) glm-4-plus (GLM）"
echo "3) kimi-k2.5 (Kimi）"
echo "4) deepseek-chat (DeepSeek）"
echo "5) gpt-4o-mini (OpenAI）"
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

echo ""
echo "选择的模型: $model_name"

# 备份原配置文件
if [ -f "$SHELL_CONFIG" ]; then
    backup_file="${SHELL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SHELL_CONFIG" "$backup_file"
    echo "✅ 已备份原配置文件: $backup_file"
fi

# 删除旧的 ANTHROPIC_API_KEY 配置
if grep -q "ANTHROPIC_API_KEY" "$SHELL_CONFIG" 2>/dev/null; then
    echo "检测到已存在的 ANTHROPIC_API_KEY，将更新..."
    
    # 使用临时文件处理
    temp_file=$(mktemp)
    
    # 删除旧的 AI Agent 配置
    awk '
        /^# AI Agent Configuration/,/^# End AI Agent Configuration/ {
            if (/^# End AI Agent Configuration/) {
                print
                next
            }
            next
        }
        {
            print
        }
    ' "$SHELL_CONFIG" > "$temp_file"
    
    mv "$temp_file" "$SHELL_CONFIG"
fi

# 追加新配置
cat >> "$SHELL_CONFIG" <<'EOF'

# ============================================================================
# AI Agent Configuration (类似 Claude Code）
# ============================================================================

# 通用 API Key（类似 Claude Code 的 ANTHROPIC_API_KEY）
export ANTHROPIC_API_KEY="__API_KEY__"

# 默认模型
export AI_MODEL="__MODEL__"

# 生成温度
export TEMPERATURE="0.7"

# End AI Agent Configuration
EOF

# 替换占位符
sed -i.bak "s/__API_KEY__/$api_key/g" "$SHELL_CONFIG"
sed -i.bak "s/__MODEL__/$model_name/g" "$SHELL_CONFIG"

# 清理备份文件
rm -f "${SHELL_CONFIG}.bak"

echo ""
echo "=========================================="
echo "  ✅ 配置完成！"
echo "=========================================="
echo ""
echo "配置摘要:"
echo "  ANTHROPIC_API_KEY: ${api_key:0:20}..."
echo "  AI_MODEL: $model_name"
echo "  TEMPERATURE: 0.7"
echo ""

echo "下一步:"
echo ""
echo "1. 重新加载 Shell 配置:"
if [ "$SHELL_NAME" = "zsh" ]; then
    echo "   source ~/.zshrc"
    echo "   或"
    echo "   exec zsh"
elif [ "$SHELL_NAME" = "bash" ]; then
    echo "   source $SHELL_CONFIG"
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
echo "4. 测试配置:"
echo "   ./scripts/test-config.sh"
echo ""

# 可选：立即重新加载
read -p "是否立即重新加载 Shell 配置？(y/n) " should_reload
if [[ "$should_reload" =~ ^[Yy]$ ]]; then
    if [ "$SHELL_NAME" = "zsh" ]; then
        exec zsh
    else
        exec bash
    fi
fi

echo "💡 提示: 配置已写入 $SHELL_CONFIG"
echo "   重启终端后生效"
echo ""
