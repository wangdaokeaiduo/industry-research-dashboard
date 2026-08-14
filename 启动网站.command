#!/bin/zsh

set -e

PROJECT_DIR="${0:A:h}"
SITE_URL="http://localhost:4173/"
API_URL="http://localhost:4173/api/reports"

cd "$PROJECT_DIR"

echo "========================================"
echo "  行业与个股深度研究系统"
echo "========================================"
echo "项目目录：$PROJECT_DIR"

if curl -fsS "$API_URL" >/dev/null 2>&1; then
  echo "网站已在运行，正在打开浏览器……"
  open "$SITE_URL"
  exit 0
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo ""
  echo "启动失败：未找到 Node.js 或 npm。"
  echo "请先安装 Node.js：https://nodejs.org/"
  echo ""
  read "? 按回车键关闭窗口……"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "首次运行，正在安装项目依赖……"
  npm install
fi

echo "正在构建最新网站……"
npm run build

echo "网站即将启动：$SITE_URL"
echo "请保持此窗口开启；关闭窗口即停止网站。"

(sleep 2; open "$SITE_URL") &
exec npm start
