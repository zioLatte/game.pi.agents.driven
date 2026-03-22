#!/usr/bin/env python3
import http.server
import ssl

PORT = 8442
server_address = ('0.0.0.0', PORT)

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

handler = NoCacheHandler
httpd = http.server.HTTPServer(server_address, handler)

# Crea un contesto SSL moderno
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="cert.pem")

httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"Server HTTPS avviato su https://localhost:{PORT}")
httpd.serve_forever()
