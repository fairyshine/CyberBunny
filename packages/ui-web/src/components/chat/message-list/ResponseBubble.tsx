import { memo } from 'react';
import ReactMarkdown from '../../ReactMarkdown';
import { Card } from '../../ui/card';
import { BubbleRow, MessageColumn, Timestamp } from './MessageShared';
import type { ResponseRenderMessage } from './types';

const ResponseBubble = memo(function ResponseBubble({ message }: { message: ResponseRenderMessage }) {
  if (!message.content) return null;

  return (
    <BubbleRow appearance={message.appearance}>
      <MessageColumn appearance={message.appearance}>
        <Card className="rounded-2xl px-4 py-3 shadow-elegant border-elegant hover-lift">
          <ReactMarkdown content={message.content} />
          {message.plots.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.plots.map((plot, index) => (
                <img
                  key={index}
                  src={`data:image/png;base64,${plot}`}
                  alt={`Plot ${index + 1}`}
                  className="max-w-full rounded-md border-elegant shadow-elegant"
                />
              ))}
            </div>
          )}
        </Card>
        <Timestamp time={message.timestamp} align={message.appearance.align} />
      </MessageColumn>
    </BubbleRow>
  );
});

export default ResponseBubble;
