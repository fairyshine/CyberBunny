import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Code } from './icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, isLoading, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled && !isLoading) {
      onSend(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertCodeBlock = () => {
    setInput((prev) => prev + '\n```python\n\n```\n');
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-2">
          {/* 工具按钮 */}
          <button
            onClick={insertCodeBlock}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors flex-shrink-0"
            title="插入 Python 代码块"
          >
            <Code className="w-5 h-5" />
          </button>

          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (disabled ? '处理中...' : '输入消息...')}
            disabled={disabled}
            className="flex-1 bg-transparent border-none resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] py-2 min-h-[24px] max-h-[200px]"
            rows={1}
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled || isLoading}
            className={`p-2 rounded-xl flex-shrink-0 transition-all ${
              input.trim() && !disabled && !isLoading
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 提示文字 */}
        <div className="text-center text-xs text-[var(--text-secondary)] mt-2">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  );
}
