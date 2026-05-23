#!/bin/bash

# 部署脚本 - 在服务器上执行

set -e

echo "========== 开始部署前端 =========="

# 进入项目目录
cd /opt/undercover

echo "1. 拉取最新代码..."
git pull

echo "2. 安装依赖..."
npm install

echo "3. 构建前端..."
npm run build

echo "4. 验证构建..."
if [ -d "dist" ]; then
    echo "✓ dist 目录存在"
    echo "✓ 文件列表:"
    ls -lh dist/assets/ | head -5
else
    echo "✗ dist 目录不存在，构建失败"
    exit 1
fi

echo ""
echo "========== 部署完成 =========="
echo "前端文件已更新到: /opt/undercover/dist"
echo "Nginx 将自动提供最新文件"
echo ""
echo "如果浏览器仍未显示新功能，请:"
echo "1. 按 Ctrl + Shift + R 硬刷新浏览器"
echo "2. 清除浏览器缓存"
echo "3. 检查 Nginx 日志: tail -f /var/log/nginx/error.log"
