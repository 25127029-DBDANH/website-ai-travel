import os
import sys
import webbrowser
import subprocess
import socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 5173

def open_browser(url):
    chrome_paths = [
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for cp in chrome_paths:
        if os.path.exists(cp):
            try:
                subprocess.Popen([cp, url])
                return
            except Exception:
                pass
    try:
        webbrowser.open(url)
    except Exception:
        pass

class SpaHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
    }

    def translate_path(self, path):
        path_clean = path.split('?', 1)[0].split('#', 1)[0]
        base_dir = os.path.join(os.getcwd(), 'dist') if os.path.exists(os.path.join(os.getcwd(), 'dist')) else os.getcwd()

        # Tự động định tuyến các file tĩnh ngay cả khi trình duyệt gọi từ URL con như /trip/demo
        if '/assets/' in path_clean:
            sub = path_clean[path_clean.find('/assets/'):].lstrip('/')
            target = os.path.normpath(os.path.join(base_dir, sub))
            if os.path.exists(target):
                return target

        if '/images/' in path_clean:
            sub = path_clean[path_clean.find('/images/'):].lstrip('/')
            target = os.path.normpath(os.path.join(base_dir, sub))
            if os.path.exists(target):
                return target

        full_path = os.path.normpath(os.path.join(base_dir, path_clean.lstrip('/')))
        if not os.path.exists(full_path) or os.path.isdir(full_path):
            return os.path.join(base_dir, 'index.html')
        return full_path

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        # Chặn cache tuyệt đối để luôn hiển thị bản mới nhất
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_ip()
    
    ThreadingHTTPServer.allow_reuse_address = True
    try:
        server = ThreadingHTTPServer(('0.0.0.0', PORT), SpaHandler)
    except OSError:
        open_browser(f"http://localhost:{PORT}/trip/demo")
        sys.exit(0)

    print("=" * 60)
    print("  WEBSITE DU LICH AI TP.HCM - NHOM 7 (DANG CHAY)")
    print("=" * 60)
    print(f"\n  [1] TREN MAY TINH:   http://localhost:{PORT}/trip/demo")
    print(f"  [2] TREN DIEN THOAI: http://{local_ip}:{PORT}/trip/demo")
    print("\n  ==> Dang mo trinh duyet Google Chrome...")
    print("  (Vui long giu cua so nay de web hoat dong)")
    print("=" * 60)
    
    open_browser(f"http://localhost:{PORT}/trip/demo")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDa dung may chu.")
        server.server_close()
