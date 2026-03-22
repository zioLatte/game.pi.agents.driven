#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./serve.sh [--https] [--host HOST] [--port PORT]

Defaults:
  HOST=127.0.0.1
  PORT=8080

HTTPS:
  Requires TLS_CERT and TLS_KEY env vars (paths to certificate and private key).
  Example:
    TLS_CERT=/path/to/dev-cert.pem TLS_KEY=/path/to/dev-key.pem ./serve.sh --https
EOF
}

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8082}"
MODE="http"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --https)
      MODE="https"
      shift
      ;;
    --host)
      HOST="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 or run: python3 -m http.server 8080" >&2
  exit 1
fi

export PI_SERVE_HOST="$HOST"
export PI_SERVE_PORT="$PORT"
export PI_SERVE_MODE="$MODE"

python3 - <<'PY'
import http.server
import os
import ssl

host = os.environ.get("PI_SERVE_HOST", "127.0.0.1")
port = int(os.environ.get("PI_SERVE_PORT", "8080"))
mode = os.environ.get("PI_SERVE_MODE", "http")

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    self.send_header("Pragma", "no-cache")
    self.send_header("Expires", "0")
    super().end_headers()

server = http.server.ThreadingHTTPServer((host, port), NoCacheHandler)

if mode == "https":
  cert = os.environ.get("TLS_CERT", "")
  key = os.environ.get("TLS_KEY", "")
  if not cert or not key:
    raise SystemExit("HTTPS mode requires TLS_CERT and TLS_KEY env vars.")
  if not os.path.isfile(cert):
    raise SystemExit(f"TLS_CERT not found: {cert}")
  if not os.path.isfile(key):
    raise SystemExit(f"TLS_KEY not found: {key}")

  ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
  ctx.load_cert_chain(certfile=cert, keyfile=key)
  server.socket = ctx.wrap_socket(server.socket, server_side=True)
  scheme = "https"
else:
  scheme = "http"

print(f"Serving {scheme}://{host}:{port} (Ctrl+C to stop)")
server.serve_forever()
PY

