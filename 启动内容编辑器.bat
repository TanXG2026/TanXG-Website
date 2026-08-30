@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

py -3 -c "import sys" >nul 2>nul
if not errorlevel 1 goto run_py

python -c "import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)" >nul 2>nul
if not errorlevel 1 goto run_python

python3 -c "import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)" >nul 2>nul
if not errorlevel 1 goto run_python3

echo.
echo 无法启动内容编辑器：这台电脑没有找到 Python 3。
echo 请从 https://www.python.org/downloads/ 安装 Python 3 后重试。
echo.
pause
endlocal & exit /b 1

:run_py
py -3 tools\editor_server.py
goto handle_exit

:run_python
python tools\editor_server.py
goto handle_exit

:run_python3
python3 tools\editor_server.py
goto handle_exit

:handle_exit
set "STATUS_CODE=%ERRORLEVEL%"
if "%STATUS_CODE%"=="0" goto done
echo.
echo 编辑器启动失败。按任意键关闭窗口。
pause >nul

:done
endlocal & exit /b %STATUS_CODE%

