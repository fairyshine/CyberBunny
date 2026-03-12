import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';
import { MessageColumn, SideSpacer, Timestamp } from './MessageShared';
import type { ToolResultRenderMessage } from './types';

const ToolResultBubble = memo(function ToolResultBubble({ message }: { message: ToolResultRenderMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const resultBadgeClassName = message.isError
    ? 'border-destructive/20 bg-destructive/10 text-destructive'
    : 'border-primary/15 bg-primary/5 text-primary/85';
  const resultPanelClassName = message.isError
    ? 'rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-xs font-mono text-destructive/90 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto shadow-sm'
    : 'rounded-xl border border-border/60 bg-background/50 px-3 py-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto shadow-sm';

  return (
    <div className={`flex gap-3 md:gap-4 animate-fade-in ${message.appearance.align === 'right' ? 'flex-row-reverse' : ''}`}>
      <SideSpacer appearance={message.appearance} />
      <MessageColumn appearance={message.appearance}>
        <div className={`rounded-2xl border overflow-hidden shadow-elegant backdrop-blur-sm ${message.isError ? 'border-destructive/20 bg-destructive/5' : 'border-border/60 bg-muted/35'}`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${message.isError ? 'hover:bg-destructive/10' : 'hover:bg-muted/55'}`}
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''} ${message.isError ? 'text-destructive/80' : 'text-foreground/50'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border ${resultBadgeClassName}`}>
              {message.isError ? t('chat.toolResult.error') : t('chat.toolResult.result')}
            </Badge>
            {message.toolName && (
              <code className="inline-flex items-center rounded-md border border-border/60 bg-background/45 px-2 py-1 text-[11px] font-mono text-foreground/70">
                {message.toolName}
              </code>
            )}
            <span className={`text-xs truncate flex-1 text-left ${message.isError ? 'text-destructive/80' : 'text-muted-foreground'}`}>
              {message.previewText}
            </span>
            {message.isStreaming && (
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </button>
          {expanded && (
            <div className="border-t border-border/40 px-4 py-3 animate-slide-in">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Output</div>
              <pre className={resultPanelClassName}>{message.content}</pre>
              {message.imageFiles.map((file, index) => (
                <div key={`${file.mediaType}-${index}`} className="mt-3 rounded-xl border border-border/60 bg-background/45 p-2 shadow-sm">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    Image {index + 1}
                  </div>
                  <img
                    src={`data:${file.mediaType};base64,${file.data}`}
                    alt={`${message.toolName} result ${index + 1}`}
                    className="max-w-full max-h-80 rounded-lg border border-border/50 object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <Timestamp time={message.timestamp} align={message.appearance.align} />
      </MessageColumn>
    </div>
  );
});

export default ToolResultBubble;
