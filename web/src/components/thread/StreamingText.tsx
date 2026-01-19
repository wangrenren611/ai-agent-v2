'use client';

import { useTextStream } from '../ui/response-stream';
import { Markdown } from '../ui/markdown';
import { cn } from '../../lib/utils';

export interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  speed?: number;
  mode?: 'typewriter' | 'fade';
  className?: string;
}

/**
 * Streaming text component that displays markdown content with typewriter effect
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
  content,
  isStreaming = false,
  speed = 20,
  mode = 'typewriter',
  className,
}) => {
  if (!content) {
    return null;
  }

  // When streaming, use typewriter effect
  if (isStreaming) {
    return <StreamingTextView content={content} speed={speed} mode={mode} className={className} />;
  }

  // When not streaming, just display the markdown
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <Markdown>{content}</Markdown>
    </div>
  );
};

function StreamingTextView({
  content,
  speed = 20,
  mode = 'typewriter',
  className,
}: {
  content: string;
  speed?: number;
  mode?: 'typewriter' | 'fade';
  className?: string;
}) {
  const { displayedText } = useTextStream({
    textStream: content,
    speed,
    mode,
  });

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <Markdown>{displayedText}</Markdown>
      <span className="typewriter-cursor text-muted-foreground" />
    </div>
  );
}
