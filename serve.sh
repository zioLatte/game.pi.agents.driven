#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./serve.sh [--http|--https] [--host HOST] [--port PORT]

Defaults:
  HOST=0.0.0.0
  MODE=https
  PORT=8443

HTTPS:
  Uses TLS_CERT and TLS_KEY env vars when provided.
  Otherwise uses ./dev-cert.pem and ./dev-key.pem, generating them when missing.
  Default HTTPS port is 8443 unless PORT or --port is set.
  Use --http for explicit HTTP mode on port 8080.
  Example:
    ./serve.sh
EOF
}

PORT_WAS_SET="${PORT+x}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"
MODE="https"
PORT_SET="$PORT_WAS_SET"

get_lan_ips() {
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null \
      | awk '{ for (i = 1; i <= NF; i += 1) if ($i == "src") print $(i + 1) }'
  fi
}

cert_is_localhost_ready() {
  local cert="$1"
  local san
  san="$(openssl x509 -in "$cert" -noout -ext subjectAltName 2>/dev/null || true)"

  [[ -f "$cert" ]] || return 1
  grep -q "DNS:localhost" <<<"$san" || return 1
  grep -q "IP Address:127.0.0.1" <<<"$san" || return 1

  while IFS= read -r ip; do
    [[ -z "$ip" ]] && continue;
    grep -q "IP Address:$ip" <<<"$san" || return 1
  done < <(get_lan_ips | sort -u)
}

generate_local_cert() {
  local cert="$1"
  local key="$2"
  local san="DNS:localhost,IP:127.0.0.1,IP:::1"

  if [[ -f "$key" ]] && cert_is_localhost_ready "$cert"; then
    return
  fi

  if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl not found. Provide TLS_CERT and TLS_KEY, or install OpenSSL." >&2
    exit 1
  fi

  while IFS= read -r ip; do
    [[ -z "$ip" ]] && continue;
    san="$san,IP:$ip"
  done < <(get_lan_ips | sort -u)

  echo "Generating local self-signed TLS certificate: $cert"
  openssl req \
    -x509 \
    -newkey rsa:2048 \
    -nodes \
    -sha256 \
    -days 365 \
    -keyout "$key" \
    -out "$cert" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=$san" >/dev/null 2>&1
  chmod 600 "$key"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http)
      MODE="http"
      shift
      ;;
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
      PORT_SET="arg"
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

if [[ -z "$PORT_SET" ]]; then
  if [[ "$MODE" == "https" ]]; then
    PORT="8443"
  else
    PORT="8080"
  fi
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 or run: python3 -m http.server 8080" >&2
  exit 1
fi

if [[ "$MODE" == "https" ]]; then
  if [[ -n "${TLS_CERT+x}" || -n "${TLS_KEY+x}" ]]; then
    if [[ -z "${TLS_CERT:-}" || -z "${TLS_KEY:-}" ]]; then
      echo "HTTPS mode requires both TLS_CERT and TLS_KEY, or neither for local defaults." >&2
      exit 1
    fi
    if [[ ! -f "$TLS_CERT" ]]; then
      echo "TLS_CERT not found: $TLS_CERT" >&2
      exit 1
    fi
    if [[ ! -f "$TLS_KEY" ]]; then
      echo "TLS_KEY not found: $TLS_KEY" >&2
      exit 1
    fi
  else
    TLS_CERT="$PWD/dev-cert.pem"
    TLS_KEY="$PWD/dev-key.pem"
    generate_local_cert "$TLS_CERT" "$TLS_KEY"
  fi
  export TLS_CERT TLS_KEY
fi

export PI_SERVE_HOST="$HOST"
export PI_SERVE_PORT="$PORT"
export PI_SERVE_MODE="$MODE"
PI_SERVE_LAN_IPS="$(get_lan_ips | sort -u | tr '\n' ' ')"
export PI_SERVE_LAN_IPS

python3 - <<'PY'
import http.server
import os
import ssl

host = os.environ.get("PI_SERVE_HOST", "127.0.0.1")
port = int(os.environ.get("PI_SERVE_PORT", "8080"))
mode = os.environ.get("PI_SERVE_MODE", "http")
lan_ips = [ip for ip in os.environ.get("PI_SERVE_LAN_IPS", "").split() if ip]

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

bind_all = host in ("0.0.0.0", "::", "")
open_host = "localhost" if bind_all else host
url = f"{scheme}://{open_host}:{port}"
bind_label = host if host else "0.0.0.0"
print(f"Serving {scheme} on {bind_label}:{port} (Ctrl+C to stop)", flush=True)
print(f"Open: {url}", flush=True)
if bind_all:
  for ip in lan_ips:
    print(f"LAN:  {scheme}://{ip}:{port}", flush=True)
server.serve_forever()
PY
