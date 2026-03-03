import { useState } from 'react';
import { useSessionStore } from '../stores/session';

export default function ConnectionTest() {
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const { llmConfig } = useSessionStore();

  const testConnection = async () => {
    setTesting(true);
    setResult('');

    const log = (msg: string) => {
      setResult(prev => prev + msg + '\n');
    };

    try {
      log('=== 配置信息 ===');
      log(`Provider: ${llmConfig.provider}`);
      log(`Base URL: ${llmConfig.baseUrl || '(默认)'}`);
      log(`Model: ${llmConfig.model}`);
      log(`API Key: ${llmConfig.apiKey ? '已配置 (' + llmConfig.apiKey.substring(0, 10) + '...)' : '未配置'}`);
      log('');

      if (!llmConfig.apiKey) {
        log('❌ 错误: 未配置 API Key');
        return;
      }

      // 构建 URL
      let apiUrl: string;
      if (llmConfig.baseUrl) {
        const baseUrlClean = llmConfig.baseUrl.replace(/\/$/, '');
        const path = baseUrlClean.endsWith('/v1')
          ? '/chat/completions'
          : '/v1/chat/completions';
        apiUrl = `${baseUrlClean}${path}`;
      } else {
        if (import.meta.env.DEV) {
          apiUrl = '/api/openai/v1/chat/completions';
        } else {
          apiUrl = 'https://api.openai.com/v1/chat/completions';
        }
      }

      log('=== 测试连接 ===');
      log(`请求 URL: ${apiUrl}`);
      log('');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
          stream: false,
        }),
      });

      log(`响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        log('');
        log('❌ 请求失败:');
        log(errorText.substring(0, 500));
        log('');
        log('可能的原因:');
        if (llmConfig.baseUrl) {
          log('1. vLLM 服务器未运行');
          log('2. vLLM 未配置 CORS (需要 --allowed-origins "*")');
          log('3. Base URL 配置错误');
          log('4. 模型名称不正确');
        } else {
          log('1. API Key 无效');
          log('2. 网络连接问题');
        }
        return;
      }

      const data = await response.json();
      log('');
      log('✅ 连接成功!');
      log('');
      log('响应数据:');
      log(JSON.stringify(data, null, 2));

    } catch (error) {
      log('');
      log('❌ 连接失败:');
      log(error instanceof Error ? error.message : String(error));
      log('');
      log('可能的原因:');
      if (llmConfig.baseUrl) {
        log('1. vLLM 服务器未运行');
        log('2. vLLM 未配置 CORS');
        log('   启动命令: python -m vllm.entrypoints.openai.api_server \\');
        log('              --model your-model \\');
        log('              --allowed-origins "*"');
        log('3. Base URL 配置错误');
      } else {
        log('1. 网络连接问题');
        log('2. 防火墙阻止');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">连接测试</h2>

      <button
        onClick={testConnection}
        disabled={testing}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {testing ? '测试中...' : '测试连接'}
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto text-sm">
          {result}
        </pre>
      )}
    </div>
  );
}
