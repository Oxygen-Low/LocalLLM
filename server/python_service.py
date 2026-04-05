"""
Python LLM inference service.

Runs a threaded HTTP server that loads HuggingFace models via the transformers
library and exposes a streaming chat completion endpoint.  No C/C++ build tools
are required – only pure-Python pip packages (torch, transformers,
huggingface_hub).

The parent Node.js server communicates with this service over HTTP on a
configurable port (default 5555).  The port is passed as the first CLI argument.
An optional second CLI argument specifies the allowed models directory; only
model directories under that path will be accepted for loading.

Endpoints
---------
POST /chat
    JSON body: { "model_dir": "<abs path to model directory>",
                 "messages": [...], "max_tokens": 2048 }
    Returns newline-delimited JSON stream of { "content": "..." } chunks,
    terminated by { "done": true, "content": "<full>" }.

POST /download
    JSON body: { "repo_id": "<HuggingFace model ID>",
                 "target_dir": "<abs path to save model>" }
    Downloads a model from the HuggingFace Hub into the target directory.
    Returns { "success": true } on success or { "error": "..." } on failure.

GET /health
    Returns { "status": "ok" }
"""

import json
import os
import signal
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Global model cache: { model_dir: (model, tokenizer) }
_model_cache = {}
_model_lock = threading.Lock()

# Maximum number of cached models (to limit memory usage)
MAX_CACHED_MODELS = 1

# Maximum allowed POST body size (1 MB should be more than enough for chat messages)
MAX_BODY_SIZE = 1 * 1024 * 1024

# Allowed models directory (set from CLI arg or defaults to None = allow all)
_allowed_models_dir = None

# Default chat template for models that don't provide one
_DEFAULT_CHAT_TEMPLATE = (
    "{% for message in messages %}"
    "{% if message['role'] == 'system' %}System: {{ message['content'] }}\n"
    "{% elif message['role'] == 'user' %}User: {{ message['content'] }}\n"
    "{% elif message['role'] == 'assistant' %}Assistant: {{ message['content'] }}\n"
    "{% endif %}"
    "{% endfor %}"
    "Assistant:"
)


def _get_model(model_dir):
    """Return a cached (model, tokenizer) tuple, loading if necessary."""
    with _model_lock:
        if model_dir in _model_cache:
            return _model_cache[model_dir]

        # Evict oldest cached models if at capacity
        while len(_model_cache) >= MAX_CACHED_MODELS:
            oldest_key = next(iter(_model_cache))
            del _model_cache[oldest_key]

    # Import here so the modules are only required when actually used
    import torch  # noqa: E402
    from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

    print(f"Loading model from {model_dir} ...", flush=True)

    tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_dir,
        torch_dtype=torch.float32,
        device_map="cpu",
        low_cpu_mem_usage=True,
        trust_remote_code=True,
    )
    model.eval()

    pair = (model, tokenizer)
    with _model_lock:
        _model_cache[model_dir] = pair
    print(f"Model loaded successfully from {model_dir}", flush=True)
    return pair


def _download_model(repo_id, target_dir):
    """Download a HuggingFace model into *target_dir*."""
    from huggingface_hub import snapshot_download  # noqa: E402

    snapshot_download(
        repo_id=repo_id,
        local_dir=target_dir,
        local_dir_use_symlinks=False,
    )


class _ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server so /health stays responsive during long /chat requests."""
    daemon_threads = True


class _Handler(BaseHTTPRequestHandler):
    """HTTP request handler for the LLM service."""

    # Use HTTP/1.1 to support chunked transfer encoding
    protocol_version = "HTTP/1.1"

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
        if self.path == "/chat":
            self._handle_chat()
        elif self.path == "/download":
            self._handle_download()
        else:
            self._send_json(404, {"error": "not found"})

    def _read_json_body(self):
        """Read and parse the JSON request body.  Returns (data, None) on
        success or (None, True) if an error response has already been sent."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > MAX_BODY_SIZE:
                self._send_json(413, {"error": f"Request body too large (max {MAX_BODY_SIZE} bytes)"})
                return None, True
            raw = self.rfile.read(content_length)
            return json.loads(raw), None
        except Exception:
            self._send_json(400, {"error": "invalid JSON body"})
            return None, True

    # --------------------------------------------------------------------- #
    # POST /download
    # --------------------------------------------------------------------- #
    def _handle_download(self):
        data, err = self._read_json_body()
        if err:
            return

        repo_id = data.get("repo_id", "")
        target_dir = data.get("target_dir", "")

        if not repo_id or not isinstance(repo_id, str):
            self._send_json(400, {"error": "repo_id is required"})
            return
        if not target_dir or not isinstance(target_dir, str):
            self._send_json(400, {"error": "target_dir is required"})
            return

        target_dir = os.path.realpath(target_dir)

        # Validate target_dir is inside the allowed models directory
        if not _allowed_models_dir:
            self._send_json(500, {"error": "No allowed models directory configured"})
            return
        if not target_dir.startswith(_allowed_models_dir + os.sep) and target_dir != _allowed_models_dir:
            self._send_json(403, {"error": "target_dir is outside the allowed models directory"})
            return

        try:
            os.makedirs(target_dir, exist_ok=True)
            _download_model(repo_id, target_dir)
            # Calculate total size
            total_size = 0
            for dirpath, _dirnames, filenames in os.walk(target_dir):
                for f in filenames:
                    total_size += os.path.getsize(os.path.join(dirpath, f))
            self._send_json(200, {"success": True, "size": total_size})
        except Exception as exc:
            self._send_json(500, {"error": f"Download failed: {exc}"})

    # --------------------------------------------------------------------- #
    # POST /chat
    # --------------------------------------------------------------------- #
    def _handle_chat(self):
        data, err = self._read_json_body()
        if err:
            return

        model_dir = data.get("model_dir", "")
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 2048)

        if not model_dir or not isinstance(model_dir, str):
            self._send_json(400, {"error": "model_dir is required"})
            return

        # Resolve to absolute path and validate it is a directory
        model_dir = os.path.realpath(model_dir)

        # Validate model_dir is inside the allowed models directory
        if not _allowed_models_dir:
            self._send_json(500, {"error": "No allowed models directory configured"})
            return
        if not model_dir.startswith(_allowed_models_dir + os.sep) and model_dir != _allowed_models_dir:
            self._send_json(403, {"error": "model_dir is outside the allowed models directory"})
            return

        if not os.path.isdir(model_dir):
            self._send_json(400, {"error": "model_dir is invalid or directory does not exist"})
            return

        if not messages or not isinstance(messages, list):
            self._send_json(400, {"error": "messages must be a non-empty list"})
            return

        try:
            model, tokenizer = _get_model(model_dir)
        except Exception as exc:
            self._send_json(500, {"error": f"Failed to load model: {exc}"})
            return

        # Prepare messages
        chat_messages = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if isinstance(content, list):
                content = "\n".join(
                    p.get("text", "") for p in content
                    if isinstance(p, dict) and p.get("type") == "text"
                )
            elif not isinstance(content, str):
                content = str(content) if content is not None else ""
            chat_messages.append({"role": role, "content": content})

        # Build the prompt using the model's chat template (or fallback)
        try:
            prompt = tokenizer.apply_chat_template(
                chat_messages, tokenize=False, add_generation_prompt=True
            )
        except Exception:
            # Fallback: use the default template
            try:
                prompt = tokenizer.apply_chat_template(
                    chat_messages,
                    tokenize=False,
                    add_generation_prompt=True,
                    chat_template=_DEFAULT_CHAT_TEMPLATE,
                )
            except Exception:
                # Last resort: manual formatting
                parts = []
                for m in chat_messages:
                    parts.append(f"{m['role'].capitalize()}: {m['content']}")
                parts.append("Assistant:")
                prompt = "\n".join(parts)

        import torch  # noqa: E402
        from transformers import TextIteratorStreamer  # noqa: E402

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        streamer = TextIteratorStreamer(
            tokenizer, skip_prompt=True, skip_special_tokens=True
        )

        generation_kwargs = {
            **inputs,
            "max_new_tokens": max_tokens,
            "temperature": 0.7,
            "top_p": 0.9,
            "do_sample": True,
            "streamer": streamer,
        }

        gen_thread = threading.Thread(
            target=lambda: model.generate(**generation_kwargs), daemon=True
        )

        # Stream the response
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.send_header("Transfer-Encoding", "chunked")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        full_content = ""
        try:
            gen_thread.start()
            for text in streamer:
                if text:
                    full_content += text
                    line = json.dumps({"content": text}) + "\n"
                    self._write_chunk(line.encode())

            gen_thread.join()

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
    global _allowed_models_dir

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5555

    # Optional: restrict model loading to a specific directory
    if len(sys.argv) > 2:
        _allowed_models_dir = os.path.realpath(sys.argv[2])
        print(f"Restricting model loading to: {_allowed_models_dir}", flush=True)

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

    server = _ThreadingHTTPServer(("127.0.0.1", port), _Handler)
    server.timeout = 1  # so we can check stop_event periodically

    print(f"Python LLM service listening on http://127.0.0.1:{port}", flush=True)

    while not stop_event.is_set():
        server.handle_request()

    server.server_close()
    print("Python LLM service stopped", flush=True)


if __name__ == "__main__":
    main()
