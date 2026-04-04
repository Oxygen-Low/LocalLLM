"""
Python LLM inference service.

Runs an HTTP server (using the built-in http.server module) that loads GGUF
models via llama-cpp-python and exposes a streaming chat completion endpoint.

The parent Node.js server communicates with this service over HTTP on a
configurable port (default 5555).  The port is passed as the first CLI argument.

Endpoints
---------
POST /chat
    JSON body: { "model_path": "<abs path to .gguf>", "messages": [...], "max_tokens": 2048 }
    Returns newline-delimited JSON stream of { "content": "..." } chunks,
    terminated by { "done": true, "content": "<full>" }.

GET /health
    Returns { "status": "ok" }
"""

import json
import os
import signal
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# Global model cache: { path: model_instance }
_model_cache = {}
_model_lock = threading.Lock()

# Maximum number of cached models (to limit memory usage)
MAX_CACHED_MODELS = 2


def _get_model(model_path):
    """Return a cached Llama model instance, loading it if necessary."""
    with _model_lock:
        if model_path in _model_cache:
            return _model_cache[model_path]

        # Evict oldest cached models if at capacity
        while len(_model_cache) >= MAX_CACHED_MODELS:
            oldest_key = next(iter(_model_cache))
            del _model_cache[oldest_key]

        # Import here so the module is only required when actually used
        from llama_cpp import Llama  # noqa: E402

        model = Llama(
            model_path=model_path,
            n_ctx=4096,
            n_threads=max(1, (os.cpu_count() or 4) // 2),
            verbose=False,
        )
        _model_cache[model_path] = model
        return model


class _Handler(BaseHTTPRequestHandler):
    """HTTP request handler for the LLM service."""

    # Silence default access logging
    def log_message(self, fmt, *args):
        pass

    def _send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/chat":
            self._send_json(404, {"error": "not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length)
            data = json.loads(raw)
        except Exception:
            self._send_json(400, {"error": "invalid JSON body"})
            return

        model_path = data.get("model_path", "")
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 2048)

        if not model_path or not isinstance(model_path, str):
            self._send_json(400, {"error": "model_path is required"})
            return

        # Resolve to absolute path and validate it ends with .gguf
        model_path = os.path.realpath(model_path)
        if not model_path.lower().endswith(".gguf"):
            self._send_json(400, {"error": "Only .gguf model files are supported"})
            return

        if not os.path.isfile(model_path):
            self._send_json(400, {"error": "model_path is invalid or file does not exist"})
            return

        if not messages or not isinstance(messages, list):
            self._send_json(400, {"error": "messages must be a non-empty list"})
            return

        try:
            model = _get_model(model_path)
        except Exception as exc:
            self._send_json(500, {"error": f"Failed to load model: {exc}"})
            return

        # Prepare messages for llama-cpp-python chat API
        chat_messages = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if isinstance(content, list):
                # Flatten multimodal content parts to text only
                content = "\n".join(p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text")
            elif not isinstance(content, str):
                content = str(content) if content is not None else ""
            chat_messages.append({"role": role, "content": content})

        # Stream the response
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()

        full_content = ""
        try:
            stream = model.create_chat_completion(
                messages=chat_messages,
                max_tokens=max_tokens,
                temperature=0.7,
                top_p=0.9,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                text = delta.get("content", "")
                if text:
                    full_content += text
                    line = json.dumps({"content": text}) + "\n"
                    self._write_chunk(line.encode())

            # Final done message
            done_line = json.dumps({"done": True, "content": full_content}) + "\n"
            self._write_chunk(done_line.encode())
            self._write_chunk(b"")  # zero-length chunk to signal end
        except Exception as exc:
            err_line = json.dumps({"error": str(exc)}) + "\n"
            try:
                self._write_chunk(err_line.encode())
                self._write_chunk(b"")
            except Exception:
                pass

    def _write_chunk(self, data):
        """Write a single HTTP chunked-transfer-encoding chunk."""
        self.wfile.write(f"{len(data):x}\r\n".encode())
        self.wfile.write(data)
        self.wfile.write(b"\r\n")
        self.wfile.flush()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5555

    stop_event = threading.Event()

    def _handle_signal(signum, _frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    # Watch stdin so we stop when the parent Node process exits
    def _watch_stdin():
        try:
            for _ in sys.stdin:
                pass
        except Exception:
            pass
        stop_event.set()

    stdin_thread = threading.Thread(target=_watch_stdin, daemon=True)
    stdin_thread.start()

    server = HTTPServer(("127.0.0.1", port), _Handler)
    server.timeout = 1  # so we can check stop_event periodically

    print(f"Python LLM service listening on http://127.0.0.1:{port}", flush=True)

    while not stop_event.is_set():
        server.handle_request()

    server.server_close()
    print("Python LLM service stopped", flush=True)


if __name__ == "__main__":
    main()
