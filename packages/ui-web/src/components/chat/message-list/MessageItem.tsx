import { memo } from 'react';
import ProcessBubble from './ProcessBubble';
import ResponseBubble from './ResponseBubble';
import SkillActivationBubble from './SkillActivationBubble';
import SkillResultBubble from './SkillResultBubble';
import ToolResultBubble from './ToolResultBubble';
import UserBubble from './UserBubble';
import type { StandardizedMessage } from './types';

const MessageItem = memo(function MessageItem({ message }: { message: StandardizedMessage }) {
  switch (message.kind) {
    case 'system':
      return (
        <div className="text-center text-xs text-muted-foreground py-2 font-medium">
          {message.content}
        </div>
      );
    case 'self':
      return <UserBubble message={message} />;
    case 'response':
      return <ResponseBubble message={message} />;
    case 'process':
      return <ProcessBubble message={message} />;
    case 'tool_result':
      return <ToolResultBubble message={message} />;
    case 'skill_activation':
      return <SkillActivationBubble message={message} />;
    case 'skill_result_error':
    case 'skill_resource_result':
    case 'skill_activation_result':
      return <SkillResultBubble message={message} />;
    default:
      return null;
  }
});

export default MessageItem;
