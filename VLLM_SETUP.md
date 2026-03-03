# vLLM CORS 配置指南

## 问题说明

在浏览器中直接调用 vLLM API 时，需要服务器支持 CORS（跨域资源共享）。否则会遇到 "Failed to fetch" 错误。

## 解决方案

### 方案 1：启动 vLLM 时配置 CORS（推荐）

启动 vLLM 服务器时添加 CORS 参数：

```bash
python -m vllm.entrypoints.openai.api_server \
  --model your-model-name \
  --host 0.0.0.0 \
  --port 8000 \
  --allowed-origins "*"
```

或者使用环境变量：

```bash
export VLLM_ALLOW_ORIGINS="*"
python -m vllm.entrypoints.openai.api_server --model your-model-name
```

### 方案 2：使用 Nginx 反向代理

如果无法修改 vLLM 配置，可以在前面加一层 Nginx：

```nginx
server {
    listen 8080;

    location / {
        proxy_pass http://localhost:8000;

        # CORS 配置
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

### 方案 3：本地开发使用代理服务器

仅在本地开发时，可以使用项目提供的代理服务器：

```bash
# 启动代理服务器
node proxy-server.mjs

# 在另一个终端启动开发服务器
npm run dev
```

然后修改 `src/hooks/useLLM.ts` 使用代理（仅开发环境）。

## 配置应用

在应用的设置中配置 vLLM 端点：

1. 打开设置
2. 配置 API Base URL：`http://your-vllm-server:8000/v1`
3. 配置 API Key（如果需要）
4. 配置模型名称

## 安全提示

- 生产环境不要使用 `*` 作为 allowed-origins
- 建议配置具体的域名：`--allowed-origins "https://yourdomain.github.io"`
- 如果 vLLM 服务器暴露在公网，务必配置认证
