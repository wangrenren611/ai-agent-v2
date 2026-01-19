'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CircleDashed } from 'lucide-react';
import { ToolCall } from './types';

interface ShowToolStreamProps {
  content: string;
  messageId?: string | null;
  onToolClick?: (messageId: string | null, toolName: string, toolCallId?: string) => void;
  showExpanded?: boolean;
  startTime?: number;
  toolCall?: ToolCall;
}

// Tools that show streaming content preview
const FILE_OPERATION_TOOLS = new Set([
  'Creating File',
  'Rewriting File',
  'AI File Edit',
  'Editing File',
]);

// Get user-friendly tool name
function getUserFriendlyToolName(rawToolName: string): string {
  if (!rawToolName) return 'Unknown Tool';

  // Convert snake_case to Title Case
  const name = rawToolName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name;
}

// Extract primary parameter for display
function extractPrimaryParam(toolName: string, content: string): string | null {
  try {
    const parsed = JSON.parse(content);

    // For file operations, extract file path
    if (FILE_OPERATION_TOOLS.has(toolName)) {
      if (parsed.arguments?.file_path) return parsed.arguments.file_path;
      if (parsed.arguments?.path) return parsed.arguments.path;
      if (parsed.file_path) return parsed.file_path;
    }

    // For command operations, extract command
    if (toolName === 'Executing Command' || toolName === 'Checking Command Output') {
      if (parsed.arguments?.command) return parsed.arguments.command;
      if (parsed.command) return parsed.command;
    }

    // For search operations, extract query
    if (toolName === 'Search' || toolName === 'Web Search') {
      if (parsed.arguments?.query) return parsed.arguments.query;
      if (parsed.query) return parsed.query;
    }

    return null;
  } catch {
    return null;
  }
}

// Get tool icon based on tool name
function getToolIcon(toolName: string) {
  const iconMap: Record<string, string> = {
    'Creating File': '📄',
    'Rewriting File': '📝',
    'AI File Edit': '✏️',
    'Editing File': '✏️',
    'Executing Command': '⚡',
    'Checking Command Output': '📤',
    'Search': '🔍',
    'Web Search': '🌐',
    'Read File': '📖',
    'Write File': '📝',
    'Delete File': '🗑️',
    'List Files': '📁',
    'Browse': '🌐',
  };

  return iconMap[toolName] || '🔧';
}

/**
 * Component for displaying streaming tool calls
 */
export const ShowToolStream: React.FC<ShowToolStreamProps> = ({
  content,
  messageId,
  onToolClick,
  showExpanded = false,
  toolCall
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldShowContent, setShouldShowContent] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Parse tool call
  const { rawToolName, parsedToolCall } = useMemo(() => {
    let rawName: string | null = null;
    let parsed: any = null;

    try {
      parsed = JSON.parse(content);
      if (parsed.function?.name) {
        rawName = parsed.function.name;
      } else if (parsed.tool_name) {
        rawName = parsed.tool_name;
      } else if (parsed.function_name) {
        rawName = parsed.function_name;
      }
    } catch (e) {
      const match = content.match(/(?:function|tool)[_\\-]?name["']?\\s*[:=]\\s*["']?([^"'\\s]+)/i);
      if (match) {
        rawName = match[1];
      }
    }

    return { rawToolName: rawName, parsedToolCall: parsed };
  }, [content]);

  const toolName = getUserFriendlyToolName(rawToolName || '');
  const effectiveToolCall = toolCall || parsedToolCall;

  // Check if tool is completed
  const isCompleted = effectiveToolCall?.completed === true ||
    (effectiveToolCall?.tool_result !== undefined &&
      effectiveToolCall?.tool_result !== null);

  // Extract streaming content
  const streamingContent = useMemo(() => {
    if (!content) return '';

    try {
      const parsed = JSON.parse(content);

      // For file operations
      if (FILE_OPERATION_TOOLS.has(toolName)) {
        if (parsed.arguments?.file_contents) {
          return parsed.arguments.file_contents;
        }
        if (parsed.arguments?.code_edit) {
          return parsed.arguments.code_edit;
        }
        if (parsed.arguments?.command) {
          return `$ ${parsed.arguments.command}`;
        }
      }

      // Check content field
      if (parsed.content) return parsed.content;
      if (parsed.text) return parsed.text;
      if (parsed.message) return parsed.message;
    } catch {
      // Partial JSON - return empty for now
    }

    return '';
  }, [content, toolName]);

  // Show streaming content for file operations
  useEffect(() => {
    if (showExpanded && FILE_OPERATION_TOOLS.has(toolName)) {
      setShouldShowContent(true);
    } else {
      setShouldShowContent(false);
    }
  }, [showExpanded, toolName]);

  // Auto-scroll for expanded content
  useEffect(() => {
    if (containerRef.current && shouldShowContent && shouldAutoScroll) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamingContent, shouldShowContent, shouldAutoScroll]);

  // Handle scroll events to disable auto-scroll when user scrolls up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
      setShouldAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [shouldShowContent]);

  if (!toolName) return null;

  // Check if this is a file operation tool
  const isFileOperationTool = FILE_OPERATION_TOOLS.has(toolName);

  const toolIcon = getToolIcon(toolName);
  const paramDisplay = extractPrimaryParam(toolName, content);

  // Always show tool button, conditionally show content below for file operations only
  if (showExpanded && isFileOperationTool) {
    return (
      <div className="my-1">
        {shouldShowContent ? (
          // Expanded view with content
          <div className="border border-neutral-200 dark:border-neutral-700/50 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out bg-zinc-100 dark:bg-neutral-900">
            {/* Tool name header */}
            <button
              onClick={() => onToolClick?.(messageId ?? null, toolName, effectiveToolCall?.tool_call_id)}
              className="w-full flex items-center gap-1.5 py-1 px-2 text-xs text-muted-foreground hover:bg-muted/80 transition-all duration-500 ease-in-out cursor-pointer bg-muted"
            >
              <div className="flex items-center justify-center p-1 rounded-sm">
                {!isCompleted ? (
                  <CircleDashed className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 animate-spin animation-duration-2000" />
                ) : (
                  <span className="text-xs">{toolIcon}</span>
                )}
              </div>
              <span className="font-mono text-xs text-foreground">{toolName}</span>
              {paramDisplay && <span className="ml-1 text-muted-foreground truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
            </button>

            {/* Streaming content below - only for file operations */}
            <div className="relative border-t border-neutral-200 dark:border-neutral-700/50">
              <div
                ref={containerRef}
                className="max-h-[300px] overflow-y-auto scrollbar-none text-xs font-mono whitespace-pre-wrap p-3 text-foreground transition-all duration-500 ease-in-out"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)'
                }}
              >
                {streamingContent || content}
              </div>
              {/* Top gradient */}
              <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none transition-all duration-500 ease-in-out bg-gradient-to-b from-zinc-100 dark:from-neutral-900 via-zinc-100/80 dark:via-neutral-900/80 to-transparent" />
              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none transition-all duration-500 ease-in-out bg-gradient-to-t from-zinc-100 dark:from-neutral-900 via-zinc-100/80 dark:via-neutral-900/80 to-transparent" />
            </div>
          </div>
        ) : (
          // Just tool button with shimmer (first 1500ms)
          <button
            onClick={() => onToolClick?.(messageId ?? null, toolName, effectiveToolCall?.tool_call_id)}
            className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-1 pr-1.5 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
          >
            <div className="border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600">
              <CircleDashed className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 animate-spin animation-duration-2000" />
            </div>
            <span className="font-mono text-xs text-foreground">{toolName}</span>
            {paramDisplay && <span className="ml-1 text-muted-foreground truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
          </button>
        )}
      </div>
    );
  }

  // Show normal tool button (non-file-operation tools or non-expanded case)
  return (
    <div className="my-1">
      <button
        onClick={() => onToolClick?.(messageId ?? null, toolName, effectiveToolCall?.tool_call_id)}
        className="animate-shimmer inline-flex items-center gap-1.5 py-1 px-1 pr-1.5 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
      >
        <div className="border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600">
          {!isCompleted ? (
            <CircleDashed className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 animate-spin animation-duration-2000" />
          ) : (
            <span className="text-xs">{toolIcon}</span>
          )}
        </div>
        <span className="font-mono text-xs text-foreground">{toolName}</span>
        {paramDisplay && <span className="ml-1 text-muted-foreground truncate max-w-[200px]" title={paramDisplay}>{paramDisplay}</span>}
      </button>
    </div>
  );
};
