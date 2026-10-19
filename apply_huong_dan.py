#!/usr/bin/env python3
"""
Vá các trang hiện có để dùng trang Hướng dẫn mới:
  1. Thêm mục "Hướng dẫn" vào thanh điều hướng (sau "Phương pháp", trước ô tìm kiếm).
  2. Xóa nút "?" và hộp thoại "Cách đọc trang này".
  3. Sửa app.js: bỏ code của nút "?" và lưu màu/tên nhóm để trang Hướng dẫn dùng lại.

Cách chạy (trong thư mục gốc của repo):   python apply_huong_dan.py
Có thể chạy nhiều lần, không bị nhân đôi.
"""
import re
import sys
from pathlib import Path

WEB = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("web")
if not (WEB / "app.js").exists():
    sys.exit(f"Không thấy {WEB}/app.js. Hãy chạy lệnh ở thư mục gốc của repo (nơi có thư mục web/).")

NAV_LINK = '<a href="huong-dan.html">Hướng dẫn</a>'
report = []


def read(p):
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)


# ---------- 1) Các trang HTML ----------
for page in sorted(WEB.glob("*.html")):
    if page.name == "huong-dan.html":
        continue
    s = read(page)
    o = s
    if "huong-dan.html" not in s:
        s = re.sub(r'(<a[^>]*href="phuong-phap\.html"[^>]*>Phương pháp</a>)', r"\1" + NAV_LINK, s, count=1)
    s = re.sub(r'<button[^>]*id="helpBtn"[^>]*>.*?</button>[ \t]*(\r?\n)?', "", s, flags=re.S)
    s = re.sub(
        r'<div class="modal" id="help">\s*<div class="box">.*?id="helpClose">[^<]*</button>\s*</div>\s*</div>[ \t]*(\r?\n)?',
        "", s, flags=re.S)
    if s != o:
        write(page, s)
        report.append(f"đã sửa {page.name}")

# ---------- 2) app.js ----------
js = WEB / "app.js"
s = read(js)
o = s

# bỏ các dòng liên quan nút "?" / hộp thoại
lines = s.splitlines(keepends=True)
keep = []
for ln in lines:
    if re.search(r'\$\("#helpBtn"\)|\$\("#helpClose"\)|\$\("#help"\)', ln):
        continue
    keep.append(ln)
s = "".join(keep)

# lưu màu + tên nhóm để trang Hướng dẫn đồng bộ giao diện
marker = "dbi-theme"
if marker not in s:
    anchor = "Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));"
    if anchor in s:
        add = anchor + "\n    try { sessionStorage.setItem('dbi-theme', JSON.stringify({vars, team: TEAM_LABEL})); } catch (_) {}"
        s = s.replace(anchor, add, 1)
    else:
        report.append("CẢNH BÁO: không tìm thấy dòng Object.entries(vars)... trong app.js, bỏ qua bước lưu màu (trang Hướng dẫn vẫn chạy, chỉ dùng màu mặc định).")

if s != o:
    write(js, s)
    report.append("đã sửa app.js")

print("\n".join(report) or "Không có gì cần sửa (đã vá trước đó).")