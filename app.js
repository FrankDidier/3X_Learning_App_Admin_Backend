const express = require('express');
const cors = require('cors');
const app = express();

// CORS配置
const corsOptions = {
  origin: ['http://localhost:8081', 'http://localhost:3000'], // 允许的前端域名
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的HTTP方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 允许的请求头
  credentials: true, // 允许发送cookies
  maxAge: 86400 // 预检请求的缓存时间（秒）
};

app.use(cors(corsOptions));

// ... 其他中间件和路由配置 