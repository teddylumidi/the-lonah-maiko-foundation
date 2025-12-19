#!/usr/bin/env python3
"""
The Lonah Maiko Foundation - Secure HTTP Server
Implements security best practices and performance optimizations
"""
import http.server
import socketserver
import os
import mimetypes
from pathlib import Path
from datetime import datetime

PORT = 5000
HOST = '0.0.0.0'

# MIME type additions for modern web
mimetypes.add_type('application/manifest+json', '.json')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Enhanced HTTP handler with security headers and caching"""
    
    # Server version string (hide detailed version info)
    server_version = "LMF-Server/1.0"
    sys_version = ""
    
    def end_headers(self):
        # ===========================================
        # Security Headers
        # ===========================================
        
        # Prevent MIME type sniffing
        self.send_header('X-Content-Type-Options', 'nosniff')
        
        # Prevent clickjacking
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        
        # XSS Protection (legacy browsers)
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        # Referrer Policy
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        
        # Permissions Policy (formerly Feature Policy)
        self.send_header('Permissions-Policy', 
            'geolocation=(), microphone=(), camera=(), payment=(), usb=()')
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "frame-ancestors 'self'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        self.send_header('Content-Security-Policy', csp)
        
        # CORS headers (restrictive)
        self.send_header('Access-Control-Allow-Origin', 'self')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # ===========================================
        # Cache Control
        # ===========================================
        path = self.path.lower()
        
        # HTML files - no cache for fresh content
        if path.endswith('.html') or path == '/' or path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        
        # Static assets - long cache with versioning
        elif any(path.endswith(ext) for ext in ['.css', '.js', '.woff2', '.woff', '.ttf']):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        
        # Images - moderate cache
        elif any(path.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico']):
            self.send_header('Cache-Control', 'public, max-age=2592000')  # 30 days
        
        # Default cache
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')  # 1 hour
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Enhanced logging with timestamp"""
        timestamp = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
        print(f"[{timestamp}] {format % args}")
    
    def guess_type(self, path):
        """Enhanced MIME type detection"""
        mime_type, _ = mimetypes.guess_type(path)
        if mime_type:
            # Add charset for text types
            if mime_type.startswith('text/') or mime_type in ['application/json', 'application/javascript']:
                return f"{mime_type}; charset=utf-8"
            return mime_type
        return 'application/octet-stream'

# Change to script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Start server
try:
    with socketserver.TCPServer((HOST, PORT), SecureHTTPRequestHandler) as httpd:
        print(f"{'='*50}")
        print(f"  The Lonah Maiko Foundation - Development Server")
        print(f"{'='*50}")
        print(f"  URL: http://localhost:{PORT}/")
        print(f"  Press Ctrl+C to stop")
        print(f"{'='*50}")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: {e}")
    print(f"Port {PORT} may already be in use.")
    exit(1)
except KeyboardInterrupt:
    print("\nServer stopped.")
    exit(0)
