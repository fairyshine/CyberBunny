import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from '../../icons';
import { getToolIcon } from '../../ToolIcon';
import ReactMarkdown from '../../ReactMarkdown';
import ToolInputDisplay from './ToolInputDisplay';
import { BubbleRow, MessageColumn } from './MessageShared';
import type { ProcessRenderMessage } from './types';

const ProcessBubble = memo(function ProcessBubble({ message }: { message: ProcessRenderMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const ToolIconComponent = message.isToolCall && message.toolName ? getToolIcon(message.toolName) : Zap;

  if (!message.content && !message.toolInput) {
    return (
      <BubbleRow appearance={message.appearance}>
        <MessageColumn appearance={message.appearance}>
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-muted border-elegant">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{t('chat.processing')}</span>
          </div>
        </MessageColumn>
      </BubbleRow>
    );
  }

  return (
    <BubbleRow appearance={message.appearance}>
      <MessageColumn appearance={message.appearance}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted border-elegant hover:bg-accent transition-all duration-200"
        >
          <span className="text-xs text-foreground/60">{expanded ? '▼' : '▶'}</span>
          <span className="text-xs text-muted-foreground font-medium">
            {message.isToolCall ? t('chat.toolCall') : t('chat.processStep')}
          </span>
          {message.isToolCall && message.toolName && (
            <>
              <code className="text-xs font-mono text-foreground/50">{message.toolName}</code>
              {message.isStreaming && (
                <div className="flex gap-1 ml-1">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </>
          )}
        </button>
        {expanded && (
          <div className="mt-2 rounded-2xl bg-muted/50 border-elegant animate-slide-in overflow-hidden">
            {message.isToolCall && message.toolName && !message.isStreaming && (
              <div className="px-4 py-3 border-b border-border/30 bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ToolIconComponent className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono font-semibold text-foreground">{message.toolName}</code>
                    {message.toolDescription && (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{message.toolDescription}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="px-4 py-3">
              {message.isToolCall && message.toolInput ? (
                message.isStreaming ? (
                  <pre className="text-xs bg-background/50 rounded-md p-3 font-mono text-foreground/80 whitespace-pre-wrap break-all max-h-48 overflow-y-auto border-elegant">
                    {message.toolInput}
                    <span className="animate-pulse">|</span>
                  </pre>
                ) : (
                  <>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Parameters</div>
                    <ToolInputDisplay input={message.toolInput} toolName={message.toolName} />
                  </>
                )
              ) : message.content ? (
                <ReactMarkdown content={message.content} />
              ) : null}
            </div>
          </div>
        )}
      </MessageColumn>
    </BubbleRow>
  );
});

export default ProcessBubble;
