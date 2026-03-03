// 统一代理服务器 - 处理所有 API 请求，支持动态目标
import http from 'http';
import https from 'https';
import { URL } from 'url';

const PROXY_PORT = 3456;

// 创建代理服务器
const server = http.createServer(async (req, res) => {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 /proxy 路径
  if (!req.url.startsWith('/proxy')) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use /proxy?target=<url>' }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetParam = url.searchParams.get('target');
    
    if (!targetParam) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing target parameter' }));
      return;
    }

    const target = decodeURIComponent(targetParam);
    const targetUrl = new URL(target);
    
    console.log(`[Proxy] ${req.method} ${targetUrl.pathname} -> ${targetUrl.hostname}`);

    // 读取请求体
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // 准备转发选项
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const forwardOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    };

    // 删除 hop-by-hop headers
    delete forwardOptions.headers['connection'];
    delete forwardOptions.headers['keep-alive'];
    delete forwardOptions.headers['proxy-authenticate'];
    delete forwardOptions.headers['proxy-authorization'];
    delete forwardOptions.headers['te'];
    delete forwardOptions.headers['trailers'];
    delete forwardOptions.headers['transfer-encoding'];
    delete forwardOptions.headers['upgrade'];
    delete forwardOptions.headers['origin'];
    delete forwardOptions.headers['referer'];

    // 发送转发请求
    const forwardReq = client.request(forwardOptions, (forwardRes) => {
      // 复制响应头
      const headers = { ...forwardRes.headers };
      delete headers['content-length']; // 让 Node.js 自行处理 chunked 编码
      
      res.writeHead(forwardRes.statusCode || 200, headers);
      forwardRes.pipe(res);
    });

    forwardReq.on('error', (err) => {
      console.error('[Proxy] Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      }
    });

    if (body.length > 0) {
      forwardReq.write(body);
    }
    
    forwardReq.end();

  } catch (err) {
    console.error('[Proxy] Error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`🦞 Proxy server running at http://localhost:${PROXY_PORT}`);
  console.log(`Usage: http://localhost:${PROXY_PORT}/proxy?target=<encoded-url>`);
});

// 错误处理
server.on('error', (err) => {
  console.error('Server error:', err);
});
