import { Message } from '../types';
import ReactMarkdown from './ReactMarkdown';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {messages.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <div className="text-4xl mb-4">🐰</div>
          <p className="text-lg font-medium mb-2">你好，我是 CyberBunny</p>
          <p className="text-sm">我可以帮你执行 Python 代码、搜索网页、进行计算等。</p>
          <div className="mt-6 space-y-2 text-xs">
            <p className="text-[var(--text-secondary)]">试试以下命令：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <code className="px-2 py-1 bg-[var(--bg-tertiary)] rounded">/python print("Hello")</code>
              <code className="px-2 py-1 bg-[var(--bg-tertiary)] rounded">/calc 123 * 456</code>
              <code className="px-2 py-1 bg-[var(--bg-tertiary)] rounded">/search Python教程</code>
            </div>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))
      )}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.role === 'system') {
    return (
      <div className="text-center text-xs text-[var(--text-secondary)] py-2">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
      }`}>
        {isUser ? '你' : '🐰'}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-left rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]'
        }`}>
          <ReactMarkdown content={message.content} />
          
          {/* 显示图表 */}
          {message.metadata?.plots && Array.isArray(message.metadata.plots) && (
            <div className="mt-3 space-y-2">
              {(message.metadata.plots as string[]).map((plot: string, index: number) => (
                <img
                  key={index}
                  src={`data:image/png;base64,${plot}`}
                  alt={`Plot ${index + 1}`}
                  className="max-w-full rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
        
        {/* 时间戳 */}
        <div className={`text-xs text-[var(--text-secondary)] mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
