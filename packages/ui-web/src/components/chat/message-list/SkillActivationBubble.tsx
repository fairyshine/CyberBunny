import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';
import { BubbleRow, MessageColumn } from './MessageShared';
import type { SkillActivationRenderMessage } from './types';

const SkillActivationBubble = memo(function SkillActivationBubble({ message }: { message: SkillActivationRenderMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isResource = Boolean(message.resourcePath);
  const label = isResource ? t('chat.skill.readingResource') : t('chat.skill.activating');

  return (
    <BubbleRow appearance={message.appearance}>
      <MessageColumn appearance={message.appearance}>
        <div className="rounded-2xl bg-muted/50 border border-border overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/70 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform text-foreground/50 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {message.skillName && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 font-mono border-border text-foreground/60">
                {message.skillName}
              </Badge>
            )}
            {isResource && message.resourcePath && (
              <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{message.resourcePath}</code>
            )}
            {message.isStreaming && (
              <div className="flex gap-1 ml-1">
                <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </button>
          {expanded && message.skillDescription && (
            <div className="px-4 py-3 border-t border-border/30 animate-slide-in">
              <p className="text-xs text-muted-foreground leading-relaxed">{message.skillDescription}</p>
            </div>
          )}
        </div>
      </MessageColumn>
    </BubbleRow>
  );
});

export default SkillActivationBubble;
