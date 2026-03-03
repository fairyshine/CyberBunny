import { useState } from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [, setStep] = useState(0);

  const features = [
    {
      icon: '🐍',
      title: 'Python 代码执行',
      description: '基于 Pyodide 的浏览器内 Python 运行时，支持 NumPy、Pandas、Matplotlib',
      example: '/python print("Hello, World!")',
    },
    {
      icon: '🔍',
      title: '网页搜索',
      description: '内置 DuckDuckGo 搜索，快速获取网络信息',
      example: '/search 最新 AI 进展',
    },
    {
      icon: '🧮',
      title: '智能计算',
      description: '执行数学计算和数据分析',
      example: '/calc sqrt(2) * 100',
    },
    {
      icon: '🔌',
      title: 'MCP 扩展',
      description: '连接 MCP 服务器，扩展 Agent 能力',
      example: '配置 MCP 服务器 → 使用扩展工具',
    },
  ];

  const handleStart = () => {
    setStep(1);
    onStart();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐰</div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            CyberBunny
          </h1>
          <p className="text-[var(--text-secondary)]">
            浏览器端 AI Agent · 支持 Python · MCP · 技能系统
          </p>
        </div>

        {/* 功能特性 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-blue-500/50 transition-colors"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                {feature.description}
              </p>
              <code className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                {feature.example}
              </code>
            </div>
          ))}
        </div>

        {/* 开始使用按钮 */}
        <div className="text-center">
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25"
          >
            开始对话
          </button>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            在设置中配置 API Key 后可以使用 LLM 功能
          </p>
        </div>

        {/* 快捷提示 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
            💡 试试这些命令
          </p>
          <div className="flex flex-wrap gap-2">
            <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
              /python import numpy as np
            </code>
            <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
              /calc 2**10
            </code>
            <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
              /search Python教程
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
