#!/usr/bin/env python3
"""
The Lonah Maiko Foundation - Secure HTTP Server
Implements security best practices and performance optimizations
"""
import http.server
import socketserver
import os
import mimetypes
import json
import smtplib
from email.message import EmailMessage
from pathlib import Path
from datetime import datetime

PORT = 5000
HOST = '0.0.0.0'

# MIME type additions for modern web
mimetypes.add_type('application/manifest+json', '.json')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')

SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
EMAIL_RECIPIENT = 'lonahmaikofoundation@gmail.com'

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
        
        # Prevent clickjacking (allow iframe embedding in dev proxy)
        # self.send_header('X-Frame-Options', 'SAMEORIGIN')
        
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
            "script-src 'self' 'unsafe-inline' https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://formspree.io; "
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
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path != '/contact':
            self.send_json_response(404, {'success': False, 'error': 'Not found'})
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self.send_json_response(400, {'success': False, 'error': 'Invalid JSON payload'})
            return

        name = payload.get('name', '').strip() or 'Website visitor'
        email = payload.get('email', '').strip()
        message = payload.get('message', '').strip()

        if not email or not message:
            self.send_json_response(400, {'success': False, 'error': 'Email and message are required'})
            return

        smtp_user = os.environ.get('SMTP_USER')
        smtp_pass = os.environ.get('SMTP_PASS')

        if not smtp_user or not smtp_pass:
            self.send_json_response(500, {'success': False, 'error': 'SMTP credentials not configured'})
            return

        email_message = EmailMessage()
        email_message['Subject'] = f'Contact request from {name}'
        email_message['From'] = smtp_user
        email_message['To'] = EMAIL_RECIPIENT
        email_message['Reply-To'] = email
        email_message.set_content(
            f'Name: {name}\nEmail: {email}\n\nMessage:\n{message}\n'
        )

        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.login(smtp_user, smtp_pass)
                smtp.send_message(email_message)

            self.send_json_response(200, {'success': True})
        except Exception as err:
            print(f'Email send failed: {err}')
            self.send_json_response(500, {'success': False, 'error': 'Email delivery failed'})
    
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
