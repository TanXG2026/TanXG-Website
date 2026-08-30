#!/bin/zsh

EDITOR_ROOT="${0:A:h}"
cd "$EDITOR_ROOT" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
	osascript -e 'display alert "无法启动内容编辑器" message "这台电脑没有找到 Python 3。" as critical'
	exit 1
fi

python3 tools/editor_server.py
STATUS_CODE=$?

if [ "$STATUS_CODE" -ne 0 ]; then
	echo ""
	echo "编辑器启动失败。按任意键关闭窗口。"
	read -k 1
fi

exit "$STATUS_CODE"
