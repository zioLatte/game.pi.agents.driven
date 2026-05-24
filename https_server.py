#!/usr/bin/env python3
import http.server
import os
import ssl
import subprocess
import sys

HOST = os.environ.get("HOST", "localhost")
PORT = int(os.environ.get("PORT", "8443"))
TLS_CERT_ENV = os.environ.get("TLS_CERT")
TLS_KEY_ENV = os.environ.get("TLS_KEY")

if (TLS_CERT_ENV is None) != (TLS_KEY_ENV is None):
    raise SystemExit("Set both TLS_CERT and TLS_KEY, or neither for local defaults.")

AUTO_GENERATE_CERT = TLS_CERT_ENV is None
TLS_CERT = TLS_CERT_ENV or os.path.join(os.getcwd(), "dev-cert.pem")
TLS_KEY = TLS_KEY_ENV or os.path.join(os.getcwd(), "dev-key.pem")


def cert_is_localhost_ready(cert):
    if not os.path.isfile(cert):
        return False

    try:
        result = subprocess.run(
            ["openssl", "x509", "-in", cert, "-noout", "-ext", "subjectAltName"],
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        return False

    return "DNS:localhost" in result.stdout and "IP Address:127.0.0.1" in result.stdout


def ensure_local_cert(cert, key):
    if os.path.isfile(key) and cert_is_localhost_ready(cert):
        return

    try:
        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey", "rsa:2048",
                "-nodes",
                "-sha256",
                "-days", "365",
                "-keyout", key,
                "-out", cert,
                "-subj", "/CN=localhost",
                "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        os.chmod(key, 0o600)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise SystemExit(
            "Cannot create local TLS certificate. Install OpenSSL or provide "
            "TLS_CERT and TLS_KEY."
        ) from exc

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if AUTO_GENERATE_CERT:
    ensure_local_cert(TLS_CERT, TLS_KEY)
elif not os.path.isfile(TLS_CERT):
    raise SystemExit(f"TLS_CERT not found: {TLS_CERT}")
elif not os.path.isfile(TLS_KEY):
    raise SystemExit(f"TLS_KEY not found: {TLS_KEY}")

handler = NoCacheHandler
httpd = http.server.ThreadingHTTPServer((HOST, PORT), handler)

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=TLS_CERT, keyfile=TLS_KEY)

httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"Server HTTPS avviato su https://{HOST}:{PORT}")
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    sys.exit(0)
