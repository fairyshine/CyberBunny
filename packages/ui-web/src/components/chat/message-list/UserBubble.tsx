import { memo } from 'react';
import ReactMarkdown from '../../ReactMarkdown';
import { BubbleRow, MessageColumn, Timestamp } from './MessageShared';
import type { SelfRenderMessage } from './types';

const UserBubble = memo(function UserBubble({ message }: { message: SelfRenderMessage }) {
  return (
    <BubbleRow appearance={message.appearance}>
      <MessageColumn appearance={message.appearance} maxWidthClassName="max-w-[85%] md:max-w-[75%]">
        <div className="inline-block text-left rounded-2xl px-4 py-3 bg-foreground text-background shadow-elegant border-elegant selection:bg-background/30 selection:text-background">
          <ReactMarkdown content={message.content} />
        </div>
        <Timestamp time={message.timestamp} align={message.appearance.align} />
      </MessageColumn>
    </BubbleRow>
  );
});

export default UserBubble;
