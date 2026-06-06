# WebSocket 连接失败 - 立即修复步骤

## 问题确认

从浏览器控制台看到：
```
❌ WebSocket connection to 'wss://whospy.top/ws/notify/...' failed
❌ WebSocket connection to 'wss://whospy.top/ws/rooms/...' failed
```

## 原因

服务器配置的 `CORS_ORIGINS` 只包含IP地址，**没有包含域名** `whospy.top`

## 立即修复（5分钟）

### 步骤1：SSH登录服务器

```bash
ssh root@159.75.214.60
```

### 步骤2：备份当前配置

```bash
cd /opt/undercover/backend
cp .env .env.backup
```

### 步骤3：更新配置文件

```bash
# 编辑配置文件
nano .env
```

**将以下行：**
```bash
CORS_ORIGINS=http://159.75.214.60,https://159.75.214.60
```

**修改为：**
```bash
CORS_ORIGINS=http://159.75.214.60,https://159.75.214.60,https://whospy.top,http://whospy.top
```

**添加或修改CORS_ORIGIN_REGEX：**
```bash
CORS_ORIGIN_REGEX=^https?://(whospy\.top|.*\.whospy\.top|159\.75\.214\.60)(:\d+)?$
```

**完整的正确配置应该是：**
```bash
APP_ENV=prod
APP_NAME=undercover-backend

# CORS配置 - 关键修复！
CORS_ORIGINS=http://159.75.214.60,https://159.75.214.60,https://whospy.top,http://whospy.top
CORS_ORIGIN_REGEX=^https?://(whospy\.top|.*\.whospy\.top|159\.75\.214\.60)(:\d+)?$

# 公开访问URL
APP_PUBLIC_URL=https://whospy.top

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=pELDZ1Fe8w2U
MYSQL_DB=undercover

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

LOG_LEVEL=INFO
JWT_SECRET=49e1eb0d-875d-4cce-82ce-df36f76f8825
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=10080
ADMIN_PHONES=13646331349
```

保存文件：按 `Ctrl+X`，然后按 `Y`，再按 `Enter`

### 步骤4：检查Nginx配置

```bash
# 查看Nginx配置
cat /etc/nginx/sites-available/default
# 或者
cat /etc/nginx/conf.d/default.conf
```

**确保有WebSocket配置：**
```nginx
# WebSocket代理配置
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
```

**如果没有WebSocket配置，需要添加：**
```bash
# 编辑Nginx配置
nano /etc/nginx/sites-available/default
# 或者
nano /etc/nginx/conf.d/default.conf
```

在server块中添加上面的WebSocket配置。

### 步骤5：测试并重启服务

```bash
# 测试Nginx配置
nginx -t

# 如果配置正确，重启服务
systemctl restart nginx

# 重启后端服务
systemctl restart undercover-backend

# 或者如果用的是其他方式运行后端
ps aux | grep uvicorn
kill <进程ID>
cd /opt/undercover/backend
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/undercover-backend.log 2>&1 &
```

### 步骤6：验证服务状态

```bash
# 检查Nginx状态
systemctl status nginx

# 检查后端是否在运行
ps aux | grep uvicorn
netstat -tlnp | grep 8000

# 查看后端日志
tail -f /var/log/undercover-backend.log
# 或者
journalctl -u undercover-backend -f
```

### 步骤7：浏览器测试

1. **清除浏览器缓存**
   - 按 `Ctrl + Shift + Delete`
   - 选择"所有时间"
   - 清除缓存和Cookie

2. **硬刷新页面**
   - 按 `Ctrl + Shift + R` 

3. **打开开发者工具检查**
   - 按 `F12`
   - 切换到 **Network** 标签
   - 过滤 **WS** (WebSocket)
   - 刷新页面
   - 应该看到WebSocket连接成功，状态码 `101 Switching Protocols`

4. **查看Console**
   - 不应该再有WebSocket连接失败的错误

## 完整的Nginx配置示例

如果你的Nginx配置不完整，这是一个完整的示例：

```nginx
# /etc/nginx/sites-available/default 或 /etc/nginx/conf.d/default.conf

server {
    listen 80;
    server_name whospy.top 159.75.214.60;
    
    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whospy.top 159.75.214.60;

    # SSL证书配置（根据你的实际证书路径修改）
    ssl_certificate /etc/nginx/ssl/whospy.top.crt;
    ssl_certificate_key /etc/nginx/ssl/whospy.top.key;
    
    # SSL优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 前端静态文件
    location / {
        root /opt/undercover/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # WebSocket代理 - 最重要的配置！
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        
        # WebSocket必需的头
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 其他必要的头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（24小时）
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # 后端API代理
    location ~ ^/(auth|users|friends|rooms|words|health|captcha|invites|categories|requests) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS预检请求
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Max-Age' 1728000;
            return 204;
        }
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 客户端上传大小限制
    client_max_body_size 10M;
}
```

## 快速验证命令

在服务器上运行这些命令来快速验证：

```bash
# 1. 检查配置文件
echo "=== 检查后端配置 ==="
grep "CORS_ORIGINS" /opt/undercover/backend/.env

# 2. 检查Nginx配置
echo "=== 检查Nginx WebSocket配置 ==="
nginx -T 2>/dev/null | grep -A 10 "location /ws"

# 3. 检查服务状态
echo "=== 检查服务状态 ==="
systemctl status nginx --no-pager | head -5
ps aux | grep uvicorn | grep -v grep

# 4. 检查端口监听
echo "=== 检查端口 ==="
netstat -tlnp | grep -E ':(80|443|8000)'
```

## 故障排查

### 问题1：后端没有运行

```bash
# 手动启动后端
cd /opt/undercover/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 问题2：Nginx配置错误

```bash
# 测试配置
nginx -t

# 查看详细错误
journalctl -xe
```

### 问题3：SSL证书问题

```bash
# 检查证书
ls -la /etc/nginx/ssl/
openssl x509 -in /etc/nginx/ssl/whospy.top.crt -text -noout
```

### 问题4：防火墙阻止

```bash
# 检查防火墙
ufw status

# 如果需要，开放端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
```

## 预期结果

修复成功后，你应该看到：

1. ✅ 浏览器控制台**没有**WebSocket错误
2. ✅ Network标签显示WebSocket连接状态 `101`
3. ✅ 可以正常创建房间和加入游戏
4. ✅ 实时消息正常工作
5. ✅ 好友通知正常接收

## 时间估计

- 修改配置文件：2分钟
- 重启服务：1分钟
- 测试验证：2分钟
- **总计：5分钟**

---

**如果按照以上步骤操作后还有问题，请提供：**
1. 浏览器控制台的完整错误信息
2. 服务器后端日志：`tail -100 /var/log/undercover-backend.log`
3. Nginx错误日志：`tail -100 /var/log/nginx/error.log`
