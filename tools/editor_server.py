#!/usr/bin/env python3
"""Local-only editor server for the TanXG static website."""

from __future__ import annotations

import json
import os
import re
import shutil
import threading
import webbrowser
from datetime import datetime
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
START_PORT = 8765
MAX_BODY_BYTES = 2_000_000
MAX_COURSES = 500
ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "assets" / "data" / "courses-data.js"
BACKUP_DIR = ROOT / "backups"
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,100}$")
STRING_FIELDS = ("title", "stage", "field", "nature", "hours", "content")
LIST_FIELDS = ("prerequisites", "followups")


def clean_string(value: object, field: str, limit: int = 20_000) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError(f"{field} 必须是文字")
    if len(value) > limit:
        raise ValueError(f"{field} 内容过长")
    return value.strip()


def clean_string_list(value: object, field: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field} 必须是列表")
    if len(value) > 200:
        raise ValueError(f"{field} 条目过多")
    cleaned: list[str] = []
    for item in value:
        text = clean_string(item, field, 2_000)
        if text:
            cleaned.append(text)
    return cleaned


def validate_courses(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        raise ValueError("课程资料格式不正确")
    if len(value) > MAX_COURSES:
        raise ValueError("课程数量超过上限")

    seen_ids: set[str] = set()
    courses: list[dict[str, object]] = []
    for index, raw in enumerate(value, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"第 {index} 门课程格式不正确")

        course_id = clean_string(raw.get("id"), "课程编号", 100)
        if not ID_PATTERN.fullmatch(course_id):
            raise ValueError(f"第 {index} 门课程编号不正确")
        if course_id in seen_ids:
            raise ValueError("课程编号不能重复")
        seen_ids.add(course_id)

        course: dict[str, object] = {"id": course_id}
        for field in STRING_FIELDS:
            course[field] = clean_string(raw.get(field), field)
        if not course["title"]:
            raise ValueError(f"第 {index} 门课程还没有名称")

        for field in LIST_FIELDS:
            course[field] = clean_string_list(raw.get(field), field)

        books = raw.get("textbooks") or []
        if not isinstance(books, list) or len(books) > 200:
            raise ValueError("推荐教材格式不正确")
        clean_books: list[dict[str, str]] = []
        for book in books:
            if not isinstance(book, dict):
                raise ValueError("推荐教材格式不正确")
            title = clean_string(book.get("title"), "教材名称", 2_000)
            author = clean_string(book.get("author"), "教材作者", 2_000)
            if title or author:
                clean_books.append({"title": title, "author": author})
        course["textbooks"] = clean_books
        courses.append(course)

    return courses


def render_data_file(courses: list[dict[str, object]]) -> str:
    payload = json.dumps(courses, ensure_ascii=False, indent=2)
    payload = payload.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return f"window.TANXG_COURSES = {payload};\n"


def save_courses(courses: list[dict[str, object]]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    if DATA_FILE.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        shutil.copy2(DATA_FILE, BACKUP_DIR / f"courses-{stamp}.js")

    temporary = DATA_FILE.with_suffix(".js.tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_data_file(courses))
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, DATA_FILE)

    backups = sorted(BACKUP_DIR.glob("courses-*.js"), reverse=True)
    for old_backup in backups[20:]:
        old_backup.unlink(missing_ok=True)


class EditorRequestHandler(SimpleHTTPRequestHandler):
    server_version = "TanXGEditor/1.0"

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def log_message(self, format_string: str, *args: object) -> None:
        message = format_string % args
        print(f"[{self.log_date_time_string()}] {message}")

    def send_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def request_is_local(self) -> bool:
        host = self.headers.get("Host", "").split(":", 1)[0].strip("[]").lower()
        if host not in {"127.0.0.1", "localhost"}:
            return False
        origin = self.headers.get("Origin")
        if not origin:
            return True
        return origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:")

    def do_POST(self) -> None:  # noqa: N802 - inherited HTTP method name
        if self.path != "/api/courses":
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "接口不存在"})
            return
        if not self.request_is_local():
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "只允许本机编辑"})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"ok": False, "message": "请求格式不正确"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                raise ValueError("保存内容大小不正确")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            courses = validate_courses(payload.get("courses") if isinstance(payload, dict) else None)
            save_courses(courses)
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
            return
        except OSError:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "message": "无法写入课程资料文件"})
            return

        self.send_json(HTTPStatus.OK, {"ok": True, "count": len(courses)})


def make_server() -> tuple[ThreadingHTTPServer, int]:
    handler = partial(EditorRequestHandler, directory=str(ROOT))
    for port in range(START_PORT, START_PORT + 20):
        try:
            return ThreadingHTTPServer((HOST, port), handler), port
        except OSError:
            continue
    raise RuntimeError("无法找到可用的本地端口")


def main() -> None:
    server, port = make_server()
    url = f"http://{HOST}:{port}/editor/"
    print("\n探星阁课程简介编辑器已经启动。")
    print(f"如果浏览器没有自动打开，请访问：{url}")
    print("编辑完成后可关闭这个终端窗口。\n")
    if os.environ.get("TANXG_EDITOR_NO_BROWSER") != "1":
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
