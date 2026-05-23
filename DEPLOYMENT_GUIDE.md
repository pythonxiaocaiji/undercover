# 部署指南 - 快速游戏功能

## 📋 部署清单

### 第一步：在服务器上更新代码

```bash
# 1. 进入项目目录
cd /opt/undercover

# 2. 拉取最新代码
git pull

# 3. 查看最新提交
git log --oneline -3
# 应该看到：
# bfb6fab docs: 更新部署指南和任务文档
# 4e41106 fix: 添加快速游戏按钮到主界面
# 4351b0f feat: 添加快速游戏功能和房间快速匹配配置
```

### 第二步：安装依赖并构建

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 验证构建成功
ls -lh dist/assets/
# 应该看到 index-*.js 和 index-*.css 文件
```

### 第三步：验证 Nginx 配置

```bash
# 1. 检查 Nginx 配置
cat /etc/nginx/conf.d/default.conf | grep -A 10 "root /opt/undercover"

# 2. 验证 Nginx 语法
nginx -t

# 3. 重启 Nginx（如果需要）
systemctl restart nginx
```

### 第四步：在浏览器中验证

1. **清除浏览器缓存**
   - 按 `Ctrl + Shift + Delete` 打开缓存清除页面
   - 选择"所有时间"
   - 清除缓存

2. **硬刷新页面**
   - 按 `Ctrl + Shift + R` 进行硬刷新

3. **检查新功能**
   - ✅ 主界面应该显示三个按钮：
     - "创建房间"（红色）
     - "快速游戏"（紫粉渐变）← **新增**
     - "加入房间"（白色）
   
   - ✅ 创建房间时应该看到新的配置项：
     - "允许其他人自由加入"
     - "允许其他玩家邀请好友"
     - "允许快速匹配玩家加入" ← **新增**

## 🧪 功能测试

### 测试 1：快速游戏按钮显示

**步骤：**
1. 访问网站首页
2. 查看主界面

**预期结果：**
- ✅ 显示"快速游戏"按钮
- ✅ 按钮颜色为紫粉渐变
- ✅ 按钮位于"创建房间"和"加入房间"之间

### 测试 2：快速游戏功能

**步骤：**
1. 房主创建房间，保持"允许快速匹配玩家加入"开启
2. 其他玩家点击"快速游戏"按钮
3. 观察是否自动加入房主的房间

**预期结果：**
- ✅ 自动加入房主创建的房间
- ✅ 显示房间号和玩家列表
- ✅ 可以正常开始游戏

### 测试 3：禁用快速匹配

**步骤：**
1. 房主创建房间，关闭"允许快速匹配玩家加入"
2. 其他玩家点击"快速游戏"按钮
3. 观察是否提示"暂无可用房间"

**预期结果：**
- ✅ 显示"暂无可用房间，请稍后再试或创建新房间"
- ✅ 不会加入禁用快速匹配的房间

### 测试 4：房间满员

**步骤：**
1. 房主创建房间，设置最大玩家数为 4
2. 4 个玩家加入房间（房间满员）
3. 其他玩家点击"快速游戏"按钮
4. 观察是否提示"暂无可用房间"

**预期结果：**
- ✅ 显示"暂无可用房间"
- ✅ 不会加入满员的房间

## 🔍 故障排除

### 问题 1：快速游戏按钮不显示

**可能原因：**
- 浏览器缓存
- 前端文件未更新
- Nginx 配置错误

**解决方案：**
```bash
# 1. 检查 dist 文件夹是否存在
ls -la /opt/undercover/dist/

# 2. 检查 index.html 是否存在
cat /opt/undercover/dist/index.html | head -20

# 3. 检查 Nginx 日志
tail -f /var/log/nginx/error.log

# 4. 重新构建
cd /opt/undercover
npm run build

# 5. 重启 Nginx
systemctl restart nginx
```

### 问题 2：快速游戏功能不工作

**可能原因：**
- 后端接口未更新
- 后端服务未重启
- 数据库字段未添加

**解决方案：**
```bash
# 1. 检查后端是否运行
ps aux | grep uvicorn

# 2. 查看后端日志
tail -f /var/log/undercover/backend.log

# 3. 重启后端服务
systemctl restart undercover-backend

# 4. 检查数据库
# 连接到数据库，验证 allow_quick_match 字段是否存在
```

### 问题 3：浏览器显示旧版本

**解决方案：**
```bash
# 1. 完全清除浏览器缓存
# Chrome: Ctrl + Shift + Delete
# Firefox: Ctrl + Shift + Delete
# Safari: Cmd + Shift + Delete

# 2. 使用无痕模式测试
# Chrome: Ctrl + Shift + N
# Firefox: Ctrl + Shift + P
# Safari: Cmd + Shift + N

# 3. 检查 HTTP 缓存头
curl -I https://159.75.214.60/
# 查看 Cache-Control 和 ETag 头

# 4. 清除 Nginx 缓存（如果配置了）
# 编辑 /etc/nginx/conf.d/default.conf
# 添加或修改：
# add_header Cache-Control "no-cache, no-store, must-revalidate";
```

## 📊 验证清单

部署完成后，请检查以下项目：

- [ ] 代码已从 Git 拉取
- [ ] 依赖已安装（npm install）
- [ ] 前端已构建（npm run build）
- [ ] dist 文件夹存在且包含最新文件
- [ ] Nginx 配置正确
- [ ] Nginx 已重启
- [ ] 浏览器缓存已清除
- [ ] 主界面显示"快速游戏"按钮
- [ ] 创建房间界面显示新配置项
- [ ] 快速游戏功能可以正常使用
- [ ] 禁用快速匹配时不会加入房间
- [ ] 房间满员时不会加入房间

## 🚀 快速部署脚本

如果你想自动化部署过程，可以使用以下脚本：

```bash
#!/bin/bash

# 保存为 /opt/undercover/deploy.sh
# 执行权限：chmod +x /opt/undercover/deploy.sh
# 运行：./deploy.sh

set -e

echo "========== 开始部署 =========="

# 进入项目目录
cd /opt/undercover

# 拉取最新代码
echo "1. 拉取最新代码..."
git pull

# 安装依赖
echo "2. 安装依赖..."
npm install

# 构建前端
echo "3. 构建前端..."
npm run build

# 验证构建
echo "4. 验证构建..."
if [ -d "dist" ]; then
    echo "✓ dist 目录存在"
    echo "✓ 文件列表:"
    ls -lh dist/assets/ | head -5
else
    echo "✗ dist 目录不存在，构建失败"
    exit 1
fi

# 重启 Nginx
echo "5. 重启 Nginx..."
systemctl restart nginx

echo ""
echo "========== 部署完成 =========="
echo "前端文件已更新到: /opt/undercover/dist"
echo ""
echo "请在浏览器中："
echo "1. 按 Ctrl + Shift + R 硬刷新"
echo "2. 检查主界面是否显示'快速游戏'按钮"
echo "3. 测试快速游戏功能"
```

## 📞 需要帮助？

如果遇到问题，请：

1. 查看浏览器控制台的错误信息（F12）
2. 查看 Nginx 错误日志：`tail -f /var/log/nginx/error.log`
3. 查看后端日志（如果有）
4. 检查 `QUICK_START.md` 中的故障排除部分
5. 参考 `TASKS.md` 了解功能详情

## ✅ 部署完成标志

当你看到以下情况时，说明部署成功：

1. ✅ 主界面显示"快速游戏"按钮
2. ✅ 创建房间时显示"允许快速匹配玩家加入"开关
3. ✅ 快速游戏功能可以正常使用
4. ✅ 浏览器控制台没有错误信息
5. ✅ 所有功能测试通过

祝部署顺利！🎉
