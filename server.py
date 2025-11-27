#!/usr/bin/env python3
import http.server
import socketserver
import os
from pathlib import Path

PORT = 5000
HOST = '0.0.0.0'

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        
        # Cache control - no cache for HTML, long cache for assets
        path = self.path.lower()
        if path.endswith('.html') or path == '/':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, public, max-age=0')
        else:
            self.send_header('Cache-Control', 'public, max-age=31536000')
        
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        super().end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

os.chdir(os.path.dirname(os.path.abspath(__file__)))

try:
    with socketserver.TCPServer((HOST, PORT), SecureHTTPRequestHandler) as httpd:
        print(f"Server running at http://{HOST}:{PORT}/")
        print(f"Press Ctrl+C to stop")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: {e}")
    exit(1)
