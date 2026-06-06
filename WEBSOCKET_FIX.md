# WebSocket 连接失败修复指南

## 问题诊断

从浏览器控制台看到的错误：
```
WebSocket connection to 'wss://whospy.top/ws/notify/...' failed
WebSocket connection to 'wss://whospy.top/ws/rooms/...' failed
```

## 原因分析

1. 前端使用HTTPS (`https://whospy.top`)
2. WebSocket自动转换为WSS协议 (`wss://whospy.top`)
3. **Nginx没有正确配置WebSocket代理**

## 解决方案

### 1. 检查并更新Nginx配置

SSH登录到服务器，编辑Nginx配置：

```bash
sudo nano /etc/nginx/conf.d/default.conf
```

### 2. 确保包含WebSocket支持配置

在server块中，确保有以下配置：

```nginx
server {
    listen 443 ssl;
    server_name whospy.top;

    # SSL证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    # 前端静态文件
    location / {
        root /opt/undercover/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket代理 - 关键配置！
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
    }
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name whospy.top;
    return 301 https://$server_name$request_uri;
}
```

### 3. 关键配置说明

WebSocket需要以下特殊配置：

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8000/ws/;
    
    # 使用HTTP/1.1（WebSocket要求）
    proxy_http_version 1.1;
    
    # 升级协议头（关键！）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 其他必要的头
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 超时设置（24小时，防止长连接断开）
    proxy_read_timeout 86400;
}
```

### 4. 后端CORS配置更新

确保后端的 `.env` 文件包含生产域名：

```bash
# 编辑后端配置
sudo nano /opt/undercover/backend/.env

# 确保有以下配置：
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://whospy.top
CORS_ORIGIN_REGEX=^https?://(192\.168\.31\.\d{1,3}|.*\.whospy\.top|whospy\.top)(:\d+)?$
```

### 5. 重启服务

```bash
# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 重启后端服务
sudo systemctl restart undercover-backend
```

### 6. 验证配置

#### 6.1 检查Nginx配置

```bash
# 查看Nginx配置
sudo nginx -T | grep -A 10 "location /ws"

# 应该看到正确的WebSocket配置
```

#### 6.2 检查后端服务

```bash
# 检查后端是否运行
sudo systemctl status undercover-backend

# 查看后端日志
sudo tail -f /var/log/undercover/backend.log
```

#### 6.3 浏览器测试

1. 清除浏览器缓存 (`Ctrl + Shift + Delete`)
2. 硬刷新页面 (`Ctrl + Shift + R`)
3. 打开开发者工具 (`F12`)
4. 查看Network标签的WS连接
5. 应该看到WebSocket连接成功（状态101 Switching Protocols）

## 常见问题

### 问题1：Still getting connection refused

**解决方案：**
```bash
# 检查防火墙是否阻止了连接
sudo ufw status

# 如果需要，开放端口
sudo ufw allow 8000/tcp
```

### 问题2：502 Bad Gateway

**解决方案：**
```bash
# 检查后端是否真的在运行
sudo netstat -tlnp | grep 8000

# 如果没有，启动后端
cd /opt/undercover/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 问题3：连接建立后立即断开

**解决方案：**
```nginx
# 增加超时时间
location /ws/ {
    proxy_read_timeout 86400;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
}
```

## 完整部署脚本

创建部署脚本 `/opt/undercover/deploy-with-ws-fix.sh`：

```bash
#!/bin/bash
set -e

echo "========== 修复WebSocket配置 =========="

# 1. 更新后端CORS配置
cd /opt/undercover/backend
if ! grep -q "whospy.top" .env; then
    echo "更新后端CORS配置..."
    sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://whospy.top|' .env
    sed -i 's|CORS_ORIGIN_REGEX=.*|CORS_ORIGIN_REGEX=^https?://(192\\\\.168\\\\.31\\\\.\\\\d{1,3}\|.*\\\\.whospy\\\\.top\|whospy\\\\.top)(:\\\\d+)?$|' .env
fi

# 2. 测试Nginx配置
echo "测试Nginx配置..."
sudo nginx -t

# 3. 重启服务
echo "重启服务..."
sudo systemctl restart nginx
sudo systemctl restart undercover-backend

# 4. 验证
echo "验证服务状态..."
sleep 2
sudo systemctl status nginx --no-pager
sudo systemctl status undercover-backend --no-pager

echo ""
echo "========== 修复完成 =========="
echo "请在浏览器中测试："
echo "1. 清除浏览器缓存"
echo "2. 硬刷新页面 (Ctrl+Shift+R)"
echo "3. 打开开发者工具查看WebSocket连接"
```

## 测试清单

- [ ] Nginx包含 `/ws/` location配置
- [ ] Nginx有 `proxy_set_header Upgrade $http_upgrade` 配置
- [ ] Nginx有 `proxy_set_header Connection "upgrade"` 配置
- [ ] 后端 `.env` 包含 `whospy.top` 在CORS配置中
- [ ] Nginx配置测试通过 (`nginx -t`)
- [ ] Nginx已重启
- [ ] 后端服务已重启
- [ ] 浏览器缓存已清除
- [ ] WebSocket连接成功（开发者工具显示状态101）

---

**参考资料：**
- [Nginx WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
- [FastAPI WebSocket Documentation](https://fastapi.tiangolo.com/advanced/websockets/)
