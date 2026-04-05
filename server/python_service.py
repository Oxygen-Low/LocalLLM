"""
Python LLM inference service.

Runs a threaded HTTP server that loads HuggingFace models via the transformers
library (or GGUF models via llama-cpp-python) and exposes a streaming chat
completion endpoint.

The parent Node.js server communicates with this service over HTTP on a
configurable port (default 5555).  The port is passed as the first CLI argument.
An optional second CLI argument specifies the allowed models directory; only
model directories under that path will be accepted for loading.

Endpoints
---------
POST /chat
    JSON body: { "model_dir": "<abs path to model directory>",
                 "messages": [...], "max_tokens": 2048 }
    If a .gguf file is found in the model directory, uses llama-cpp-python
    for inference; otherwise falls back to HuggingFace transformers.
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

# Global model cache: { model_dir: (model, tokenizer) } for transformers,
# or { model_dir: llama_instance } for GGUF
_model_cache = {}
_model_lock = threading.Lock()

# Maximum number of cached models (to limit memory usage)
MAX_CACHED_MODELS = 2

# GGUF model cache: { gguf_path: Llama instance }
_gguf_cache = {}
_gguf_lock = threading.Lock()

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


def _validate_path_within_models_dir(target_path):
    """Validate that *target_path* resolves to a path strictly inside
    ``_allowed_models_dir``.  Returns the resolved absolute path on
    success, or ``None`` if the path is outside the allowed directory."""
    if not _allowed_models_dir:
        return None
    resolved = os.path.realpath(target_path)
    # Must start with the allowed directory followed by the OS separator
    if not resolved.startswith(_allowed_models_dir + os.sep):
        return None
    return resolved


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
    from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

    print(f"Loading model from {model_dir} ...", flush=True)

    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_dir,
        torch_dtype="auto",
        device_map="cpu",
        low_cpu_mem_usage=True,
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

    try:
        snapshot_download(
            repo_id=repo_id,
            local_dir=target_dir,
            local_dir_use_symlinks=False,
        )
    except Exception as exc:
        error_msg = str(exc)
        if "404" in error_msg or "not found" in error_msg.lower():
            raise ValueError(f"Model '{repo_id}' not found on HuggingFace Hub") from exc
        if "401" in error_msg or "403" in error_msg:
            raise ValueError(f"Access denied for model '{repo_id}'. It may be private or gated.") from exc
        raise


def _find_gguf_file(model_dir):
    """Return the path to the first .gguf file in *model_dir*, or None."""
    if not os.path.isdir(model_dir):
        return None
    for entry in os.listdir(model_dir):
        if entry.lower().endswith(".gguf"):
            return os.path.join(model_dir, entry)
    return None


def _get_gguf_model(gguf_path):
    """Return a cached Llama instance for the given GGUF file, loading if necessary."""
    with _gguf_lock:
        if gguf_path in _gguf_cache:
            return _gguf_cache[gguf_path]

        # Evict oldest cached GGUF models if at capacity
        while len(_gguf_cache) >= MAX_CACHED_MODELS:
            oldest_key = next(iter(_gguf_cache))
            del _gguf_cache[oldest_key]

    from llama_cpp import Llama  # noqa: E402

    print(f"Loading GGUF model from {gguf_path} ...", flush=True)

    llm = Llama(
        model_path=gguf_path,
        n_ctx=4096,
        n_threads=os.cpu_count() or 4,
        verbose=False,
    )

    with _gguf_lock:
        _gguf_cache[gguf_path] = llm
    print(f"GGUF model loaded successfully from {gguf_path}", flush=True)
    return llm


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

        resolved_target = _validate_path_within_models_dir(target_dir)
        if resolved_target is None:
            if not _allowed_models_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "target_dir is outside the allowed models directory"})
            return

        try:
            os.makedirs(resolved_target, exist_ok=True)
            _download_model(repo_id, resolved_target)
            # Calculate total size
            total_size = 0
            for dirpath, _dirnames, filenames in os.walk(resolved_target):
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

        # Resolve to absolute path and validate it is inside the allowed directory
        resolved_model_dir = _validate_path_within_models_dir(model_dir)
        if resolved_model_dir is None:
            if not _allowed_models_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "model_dir is outside the allowed models directory"})
            return

        if not os.path.isdir(resolved_model_dir):
            self._send_json(400, {"error": "model_dir is invalid or directory does not exist"})
            return

        if not messages or not isinstance(messages, list):
            self._send_json(400, {"error": "messages must be a non-empty list"})
            return

        # Check if this is a GGUF model directory
        gguf_path = _find_gguf_file(resolved_model_dir)
        if gguf_path:
            self._handle_chat_gguf(gguf_path, messages, max_tokens)
        else:
            self._handle_chat_transformers(resolved_model_dir, messages, max_tokens)

    def _handle_chat_gguf(self, gguf_path, messages, max_tokens):
        """Handle chat using a GGUF model via llama-cpp-python."""
        try:
            llm = _get_gguf_model(gguf_path)
        except Exception as exc:
            self._send_json(500, {"error": f"Failed to load GGUF model: {exc}"})
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

        # Stream the response
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.send_header("Transfer-Encoding", "chunked")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        full_content = ""
        try:
            stream = llm.create_chat_completion(
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

    def _handle_chat_transformers(self, resolved_model_dir, messages, max_tokens):
        """Handle chat using a HuggingFace transformers model."""

        try:
            model, tokenizer = _get_model(resolved_model_dir)
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
