/**
 * 日志格式化工具
 *
 * 智能格式化工具输出结果，减少日志冗余同时保留关键信息
 */

/**
 * 格式化工具执行结果
 * @param toolName 工具名称
 * @param result 工具执行结果
 * @returns 格式化后的字符串
 */
export function formatToolResult(toolName: string, result: string): string {
    // 空结果处理
    if (!result || result.length === 0) {
        return '[empty result]';
    }

    // 短结果直接返回
    const maxPreview = 200;
    if (result.length <= maxPreview) {
        return result;
    }

    // 根据工具类型进行智能格式化
    switch (toolName) {
        case 'search_code':
            return formatSearchResults(result);

        case 'read_file':
            return formatFileContent(result);

        case 'bash':
            return formatBashOutput(result);

        case 'glob':
            return formatGlobResults(result);

        default:
            return formatGeneric(result, maxPreview);
    }
}

/**
 * 格式化 search_code 结果
 */
function formatSearchResults(result: string): string {
    try {
        const parsed = JSON.parse(result);

        // 处理数组结果
        if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
                return '[no matches]';
            }
            if (parsed.length <= 3) {
                return result; // 结果少，全部返回
            }

            // 返回前3个结果 + 摘要
            const preview = parsed.slice(0, 3);
            return `[${parsed.length} matches]\n${JSON.stringify(preview, null, 2)}\n... (${parsed.length - 3} more matches)`;
        }
    } catch {
        // JSON 解析失败，使用通用格式化
    }

    return formatGeneric(result, 200);
}

/**
 * 格式化 read_file 结果
 */
function formatFileContent(result: string): string {
    const lines = result.split('\n');

    // 提取文件路径
    const headerMatch = result.match(/^--- FILE: (.+?) ---/);
    const filePath = headerMatch ? headerMatch[1] : 'unknown';

    // 小于等于15行全部返回
    if (lines.length <= 15) {
        return result;
    }

    // 返回前15行 + 摘要
    return `--- FILE: ${filePath} ---\n[total: ${lines.length} lines, showing first 15]\n${lines.slice(0, 15).join('\n')}`;
}

/**
 * 格式化 bash 输出
 */
function formatBashOutput(result: string): string {
    const lines = result.split('\n');

    // 小于等于5行全部返回
    if (lines.length <= 5) {
        return result;
    }

    // 返回前5行 + 摘要
    return `[${lines.length} lines]\n${lines.slice(0, 5).join('\n')}\n... (${lines.length - 5} more lines)`;
}

/**
 * 格式化 glob 结果
 */
function formatGlobResults(result: string): string {
    const lines = result.split('\n').filter(l => l.trim());

    // 小于等于10个文件全部返回
    if (lines.length <= 10) {
        return result;
    }

    // 返回前10个 + 摘要
    return `[${lines.length} files]\n${lines.slice(0, 10).join('\n')}\n... (${lines.length - 10} more files)`;
}

/**
 * 通用格式化
 */
function formatGeneric(result: string, maxPreview: number): string {
    return `${result.slice(0, maxPreview)}... (${result.length - maxPreview} more chars)`;
}
