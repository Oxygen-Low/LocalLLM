"""
Python LLM inference service.

Runs a threaded HTTP server that loads HuggingFace models via the transformers
library (including GGUF models via the transformers gguf_file parameter) and
exposes a streaming chat completion endpoint.

The parent Node.js server communicates with this service over HTTP on a
configurable port (default 5555).  The port is passed as the first CLI argument.
An optional second CLI argument specifies the allowed models directory; only
model directories under that path will be accepted for loading.

Endpoints
---------
POST /chat
    JSON body: { "model_dir": "<abs path to model directory>",
                 "messages": [...], "max_tokens": 2048 }
    Loads the model using HuggingFace transformers (including GGUF files).
    Returns newline-delimited JSON stream of { "content": "..." } chunks,
    terminated by { "done": true, "content": "<full>" }.

POST /download
    JSON body: { "repo_id": "<HuggingFace model ID>",
                 "target_dir": "<abs path to save model>" }
    Starts an asynchronous download of a model from the HuggingFace Hub.
    Returns immediately with { "download_id": "<id>" } (HTTP 202).
    Poll GET /download-progress?id=<id> for status updates.

GET /download-progress?id=<download_id>
    Returns the current status of an active download:
    { "status": "starting"|"downloading"|"completed"|"failed",
      "downloaded_files": N, "total_files": M,
      "error": null|"...", "size": <bytes on completion> }

GET /health
    Returns { "status": "ok" }
"""

import json
import os
import signal
import sys
import threading
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

# Global model cache: { model_dir: (model, tokenizer) }
_model_cache = {}
_model_lock = threading.Lock()

# Active downloads tracker: { download_id: { status, downloaded_files, total_files, error, size } }
_active_downloads = {}
_downloads_lock = threading.Lock()

# Active training jobs: { job_id: { status, progress, error, output_dir, ... } }
_active_trainings = {}
_trainings_lock = threading.Lock()

# Maximum number of cached models (to limit memory usage)
MAX_CACHED_MODELS = 2

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


def _find_gguf_file(model_dir):
    """Return the filename of the first .gguf file in *model_dir*, or None."""
    if not os.path.isdir(model_dir):
        return None
    for entry in os.listdir(model_dir):
        if entry.lower().endswith(".gguf"):
            return entry
    return None


def _get_device_map():
    """Return the best device_map based on GPU availability.

    Uses ``"auto"`` when a CUDA-capable GPU is detected so the model is
    distributed across available GPUs (and CPU as overflow).  Falls back
    to ``"cpu"`` otherwise.

    The result is computed once and cached for subsequent calls.
    """
    cached = getattr(_get_device_map, "_cached", None)
    if cached is not None:
        return cached

    import torch  # noqa: E402

    if torch.cuda.is_available():
        result = "auto"
    else:
        result = "cpu"

    _get_device_map._cached = result
    return result


def _get_model(model_dir):
    """Return a cached (model, tokenizer) tuple, loading if necessary.

    If a .gguf file is found in the model directory, the model is loaded
    via the transformers ``gguf_file`` parameter (no llama-cpp-python needed).

    When a CUDA-capable GPU is available the model is automatically placed
    on the GPU; otherwise it falls back to CPU.
    """
    with _model_lock:
        if model_dir in _model_cache:
            return _model_cache[model_dir]

        # Evict oldest cached models if at capacity
        while len(_model_cache) >= MAX_CACHED_MODELS:
            oldest_key = next(iter(_model_cache))
            del _model_cache[oldest_key]

    # Import here so the modules are only required when actually used
    from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

    device_map = _get_device_map()
    gguf_filename = _find_gguf_file(model_dir)

    if gguf_filename:
        print(f"Loading GGUF model from {model_dir}/{gguf_filename} via transformers (device_map={device_map}) ...", flush=True)
        tokenizer = AutoTokenizer.from_pretrained(model_dir, gguf_file=gguf_filename)
        model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            gguf_file=gguf_filename,
            torch_dtype="auto",
            device_map=device_map,
            low_cpu_mem_usage=True,
        )
    else:
        print(f"Loading model from {model_dir} (device_map={device_map}) ...", flush=True)
        tokenizer = AutoTokenizer.from_pretrained(model_dir)
        model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            torch_dtype="auto",
            device_map=device_map,
            low_cpu_mem_usage=True,
        )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model.eval()

    pair = (model, tokenizer)
    with _model_lock:
        _model_cache[model_dir] = pair
    print(f"Model loaded successfully from {model_dir} (device_map={device_map})", flush=True)
    return pair


def _download_model(repo_id, target_dir, hf_token=None):
    """Download a HuggingFace model into *target_dir*."""
    from huggingface_hub import snapshot_download  # noqa: E402

    try:
        kwargs = {
            "repo_id": repo_id,
            "local_dir": target_dir,
            "local_dir_use_symlinks": False,
        }
        if hf_token:
            kwargs["token"] = hf_token
        snapshot_download(**kwargs)
    except Exception as exc:
        error_msg = str(exc)
        if "404" in error_msg or "not found" in error_msg.lower():
            raise ValueError(f"Model '{repo_id}' not found on HuggingFace Hub") from exc
        if "401" in error_msg or "403" in error_msg:
            raise ValueError(f"Access denied for model '{repo_id}'. It may be private or gated.") from exc
        raise


def _count_files_in_dir(directory):
    """Count the number of files in *directory* recursively."""
    count = 0
    try:
        for _, _, filenames in os.walk(directory):
            count += len(filenames)
    except OSError:
        pass
    return count


def _dir_total_size(directory):
    """Return the total size in bytes of all files under *directory*."""
    total = 0
    try:
        for dirpath, _, filenames in os.walk(directory):
            for f in filenames:
                total += os.path.getsize(os.path.join(dirpath, f))
    except OSError:
        pass
    return total


def _download_worker(download_id, repo_id, target_dir, hf_token=None):
    """Background thread that downloads a model and tracks progress."""
    try:
        with _downloads_lock:
            _active_downloads[download_id] = {
                "status": "starting",
                "downloaded_files": 0,
                "total_files": 0,
                "error": None,
                "size": 0,
            }

        # Try to get the expected file count for progress tracking
        total_files = 0
        try:
            from huggingface_hub import list_repo_tree  # noqa: E402
            kwargs = {"repo_id": repo_id, "recursive": True}
            if hf_token:
                kwargs["token"] = hf_token
            total_files = sum(1 for entry in list_repo_tree(**kwargs)
                             if hasattr(entry, 'size'))
        except Exception:
            pass  # If we can't get file count, progress will be indeterminate

        with _downloads_lock:
            _active_downloads[download_id]["total_files"] = total_files
            _active_downloads[download_id]["status"] = "downloading"

        # Start a progress monitoring thread that counts files periodically
        progress_stop = threading.Event()

        def _monitor_progress():
            while not progress_stop.is_set():
                count = _count_files_in_dir(target_dir)
                with _downloads_lock:
                    dl = _active_downloads.get(download_id)
                    if dl:
                        dl["downloaded_files"] = count
                progress_stop.wait(2)  # Check every 2 seconds

        monitor = threading.Thread(target=_monitor_progress, daemon=True)
        monitor.start()

        # Perform the actual download
        os.makedirs(target_dir, exist_ok=True)
        _download_model(repo_id, target_dir, hf_token=hf_token)

        progress_stop.set()
        monitor.join(timeout=5)

        total_size = _dir_total_size(target_dir)
        final_file_count = _count_files_in_dir(target_dir)

        with _downloads_lock:
            _active_downloads[download_id].update({
                "status": "completed",
                "downloaded_files": final_file_count,
                "size": total_size,
            })
    except Exception as exc:
        with _downloads_lock:
            dl = _active_downloads.get(download_id)
            if dl:
                dl.update({
                    "status": "failed",
                    "error": str(exc),
                })


def _train_worker(job_id, model_dir, dataset_path, output_dir, post_dataset_path=None,
                  epochs=3, learning_rate=2e-5, batch_size=4):
    """Background thread that fine-tunes a model on a dataset and tracks progress."""
    try:
        with _trainings_lock:
            _active_trainings[job_id] = {
                "status": "starting",
                "progress": 0,
                "current_epoch": 0,
                "total_epochs": epochs,
                "phase": "training",
                "error": None,
            }

        from transformers import (  # noqa: E402
            AutoModelForCausalLM,
            AutoTokenizer,
            TrainingArguments,
            Trainer,
            TrainerCallback,
            DataCollatorForLanguageModeling,
        )
        import torch  # noqa: E402

        class _ProgressCallback(TrainerCallback):
            """Update training progress in the shared dict."""

            def __init__(self, job_id, phase="training"):
                self._job_id = job_id
                self._phase = phase

            def on_step_end(self, args, state, control, **kwargs):
                if state.max_steps > 0:
                    pct = int((state.global_step / state.max_steps) * 100)
                else:
                    pct = 0
                with _trainings_lock:
                    job = _active_trainings.get(self._job_id)
                    if job:
                        job["progress"] = pct
                        job["current_epoch"] = int(state.epoch) if state.epoch else 0
                        job["phase"] = self._phase

            def on_epoch_end(self, args, state, control, **kwargs):
                with _trainings_lock:
                    job = _active_trainings.get(self._job_id)
                    if job:
                        job["current_epoch"] = int(state.epoch) if state.epoch else 0

        with _trainings_lock:
            _active_trainings[job_id]["status"] = "loading_model"

        # Load model and tokenizer
        gguf_filename = _find_gguf_file(model_dir)

        load_kwargs = {
            "torch_dtype": torch.float32,
            "low_cpu_mem_usage": True,
            # Training requires a single device; disable device_map to avoid
            # issues with model parallelism during backpropagation.
            "device_map": None,
        }

        if gguf_filename:
            tokenizer = AutoTokenizer.from_pretrained(model_dir, gguf_file=gguf_filename)
            model = AutoModelForCausalLM.from_pretrained(
                model_dir, gguf_file=gguf_filename, **load_kwargs
            )
        else:
            tokenizer = AutoTokenizer.from_pretrained(model_dir)
            model = AutoModelForCausalLM.from_pretrained(model_dir, **load_kwargs)

        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        if torch.cuda.is_available():
            model = model.cuda()

        model.train()

        with _trainings_lock:
            _active_trainings[job_id]["status"] = "loading_dataset"

        # Load JSONL dataset
        def _load_jsonl(fpath):
            rows = []
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        rows.append(json.loads(line))
            return rows

        raw_rows = _load_jsonl(dataset_path)
        if not raw_rows:
            raise ValueError("Dataset is empty")

        # Format rows into text for causal LM training
        def _format_row(row):
            parts = []
            if row.get("instruction"):
                parts.append(f"### Instruction:\n{row['instruction']}")
            if row.get("input"):
                parts.append(f"### Input:\n{row['input']}")
            if row.get("output"):
                parts.append(f"### Response:\n{row['output']}")
            return "\n\n".join(parts) if parts else ""

        texts = [_format_row(r) for r in raw_rows]
        texts = [t for t in texts if t.strip()]

        if not texts:
            raise ValueError("No valid training samples after formatting")

        # Tokenize
        max_length = 512
        encodings = tokenizer(
            texts,
            truncation=True,
            max_length=max_length,
            padding="max_length",
            return_tensors="pt",
        )

        # Create a simple torch dataset
        class _TextDataset(torch.utils.data.Dataset):
            def __init__(self, enc):
                self.input_ids = enc["input_ids"]
                self.attention_mask = enc["attention_mask"]

            def __len__(self):
                return len(self.input_ids)

            def __getitem__(self, idx):
                return {
                    "input_ids": self.input_ids[idx],
                    "attention_mask": self.attention_mask[idx],
                    "labels": self.input_ids[idx].clone(),
                }

        train_dataset = _TextDataset(encodings)

        os.makedirs(output_dir, exist_ok=True)

        with _trainings_lock:
            _active_trainings[job_id]["status"] = "training"

        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=learning_rate,
            save_strategy="no",
            logging_steps=1,
            report_to="none",
            fp16=torch.cuda.is_available(),
            gradient_accumulation_steps=max(1, 8 // batch_size),
            warmup_ratio=0.1,
            weight_decay=0.01,
            max_grad_norm=1.0,
            dataloader_pin_memory=False,
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
            callbacks=[_ProgressCallback(job_id, "training")],
        )

        trainer.train()

        # Post-training phase (if post-dataset provided)
        if post_dataset_path and os.path.isfile(post_dataset_path):
            with _trainings_lock:
                job = _active_trainings.get(job_id)
                if job:
                    job["status"] = "post_training"
                    job["phase"] = "post_training"
                    job["progress"] = 0

            post_rows = _load_jsonl(post_dataset_path)
            if post_rows:
                post_texts = [_format_row(r) for r in post_rows]
                post_texts = [t for t in post_texts if t.strip()]

                if post_texts:
                    post_encodings = tokenizer(
                        post_texts,
                        truncation=True,
                        max_length=max_length,
                        padding="max_length",
                        return_tensors="pt",
                    )
                    post_dataset = _TextDataset(post_encodings)

                    post_args = TrainingArguments(
                        output_dir=output_dir,
                        # Use fewer epochs for post-training (half of main
                        # training, min 1) to refine without overfitting.
                        num_train_epochs=max(1, epochs // 2),
                        per_device_train_batch_size=batch_size,
                        # Lower learning rate for post-training to make
                        # smaller, more careful adjustments.
                        learning_rate=learning_rate / 2,
                        save_strategy="no",
                        logging_steps=1,
                        report_to="none",
                        fp16=torch.cuda.is_available(),
                        gradient_accumulation_steps=max(1, 8 // batch_size),
                        warmup_ratio=0.05,
                        weight_decay=0.01,
                        max_grad_norm=1.0,
                        dataloader_pin_memory=False,
                    )

                    post_trainer = Trainer(
                        model=model,
                        args=post_args,
                        train_dataset=post_dataset,
                        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
                        callbacks=[_ProgressCallback(job_id, "post_training")],
                    )

                    post_trainer.train()

        # Save the final model
        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if job:
                job["status"] = "saving"
                job["progress"] = 95

        model.save_pretrained(output_dir)
        tokenizer.save_pretrained(output_dir)

        total_size = _dir_total_size(output_dir)

        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if job:
                job.update({
                    "status": "completed",
                    "progress": 100,
                    "phase": "done",
                    "size": total_size,
                })

        # Evict from model cache so re-load picks up trained weights
        with _model_lock:
            _model_cache.pop(model_dir, None)
            _model_cache.pop(output_dir, None)

    except Exception as exc:
        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if job:
                job.update({
                    "status": "failed",
                    "error": str(exc),
                })


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
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json(200, {"status": "ok"})
        elif parsed.path == "/download-progress":
            self._handle_download_progress(parsed)
        elif parsed.path == "/train-progress":
            self._handle_train_progress(parsed)
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/chat":
            self._handle_chat()
        elif self.path == "/download":
            self._handle_download()
        elif self.path == "/download-dataset":
            self._handle_download_dataset()
        elif self.path == "/train":
            self._handle_train()
        elif self.path == "/train-cancel":
            self._handle_train_cancel()
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
    # POST /download  (async – returns download_id immediately)
    # --------------------------------------------------------------------- #
    def _handle_download(self):
        data, err = self._read_json_body()
        if err:
            return

        repo_id = data.get("repo_id", "")
        target_dir = data.get("target_dir", "")
        hf_token = data.get("hf_token", None)

        if not repo_id or not isinstance(repo_id, str):
            self._send_json(400, {"error": "repo_id is required"})
            return
        if not target_dir or not isinstance(target_dir, str):
            self._send_json(400, {"error": "target_dir is required"})
            return
        if hf_token is not None and not isinstance(hf_token, str):
            self._send_json(400, {"error": "hf_token must be a string"})
            return

        resolved_target = _validate_path_within_models_dir(target_dir)
        if resolved_target is None:
            if not _allowed_models_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "target_dir is outside the allowed models directory"})
            return

        download_id = str(uuid.uuid4())
        thread = threading.Thread(
            target=_download_worker,
            args=(download_id, repo_id, resolved_target),
            kwargs={"hf_token": hf_token if hf_token else None},
            daemon=True,
        )
        thread.start()

        self._send_json(202, {"download_id": download_id})

    # --------------------------------------------------------------------- #
    # GET /download-progress?id=<download_id>
    # --------------------------------------------------------------------- #
    def _handle_download_progress(self, parsed):
        params = parse_qs(parsed.query)
        download_id = (params.get("id") or [None])[0]
        if not download_id:
            self._send_json(400, {"error": "id query parameter is required"})
            return

        with _downloads_lock:
            dl = _active_downloads.get(download_id)
            if not dl:
                self._send_json(404, {"error": "Unknown download id"})
                return
            # Return a snapshot of the current state
            result = dict(dl)

        self._send_json(200, result)

    # --------------------------------------------------------------------- #
    # POST /train  (async – returns job_id immediately)
    # --------------------------------------------------------------------- #
    def _handle_train(self):
        data, err = self._read_json_body()
        if err:
            return

        model_dir = data.get("model_dir", "")
        dataset_path = data.get("dataset_path", "")
        output_dir = data.get("output_dir", "")
        post_dataset_path = data.get("post_dataset_path", None)
        epochs = data.get("epochs", 3)
        learning_rate = data.get("learning_rate", 2e-5)
        batch_size = data.get("batch_size", 4)

        if not model_dir or not isinstance(model_dir, str):
            self._send_json(400, {"error": "model_dir is required"})
            return
        if not dataset_path or not isinstance(dataset_path, str):
            self._send_json(400, {"error": "dataset_path is required"})
            return
        if not output_dir or not isinstance(output_dir, str):
            self._send_json(400, {"error": "output_dir is required"})
            return

        # Validate model_dir is within allowed directory
        resolved_model_dir = _validate_path_within_models_dir(model_dir)
        if resolved_model_dir is None:
            if not _allowed_models_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "model_dir is outside the allowed models directory"})
            return

        # Validate output_dir is within allowed models directory
        resolved_output_dir = _validate_path_within_models_dir(output_dir)
        if resolved_output_dir is None:
            if not _allowed_models_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "output_dir is outside the allowed models directory"})
            return

        if not os.path.isdir(resolved_model_dir):
            self._send_json(400, {"error": "model_dir does not exist"})
            return

        # Validate dataset paths – they must be absolute and must not contain
        # path traversal sequences.  The Node.js server already validates them
        # via ensureWithinDir, but we re-check here as defence-in-depth.
        for label, dp in [("dataset_path", dataset_path),
                          ("post_dataset_path", post_dataset_path)]:
            if dp is None:
                continue
            real = os.path.realpath(dp)
            if ".." in dp.split(os.sep):
                self._send_json(400, {"error": f"{label} contains invalid path components"})
                return
            if not os.path.isfile(real):
                self._send_json(400, {"error": f"{label} does not exist"})
                return

        # Use resolved (realpath) dataset paths to prevent symlink attacks
        resolved_dataset_path = os.path.realpath(dataset_path)
        resolved_post_dataset_path = (os.path.realpath(post_dataset_path)
                                      if post_dataset_path else None)

        if not isinstance(epochs, int) or epochs < 1 or epochs > 100:
            self._send_json(400, {"error": "epochs must be between 1 and 100"})
            return
        if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 64:
            self._send_json(400, {"error": "batch_size must be between 1 and 64"})
            return

        job_id = str(uuid.uuid4())
        thread = threading.Thread(
            target=_train_worker,
            args=(job_id, resolved_model_dir, resolved_dataset_path, resolved_output_dir),
            kwargs={
                "post_dataset_path": resolved_post_dataset_path,
                "epochs": epochs,
                "learning_rate": float(learning_rate),
                "batch_size": batch_size,
            },
            daemon=True,
        )
        thread.start()

        self._send_json(202, {"job_id": job_id})

    # --------------------------------------------------------------------- #
    # GET /train-progress?id=<job_id>
    # --------------------------------------------------------------------- #
    def _handle_train_progress(self, parsed):
        params = parse_qs(parsed.query)
        job_id = (params.get("id") or [None])[0]
        if not job_id:
            self._send_json(400, {"error": "id query parameter is required"})
            return

        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if not job:
                self._send_json(404, {"error": "Unknown training job id"})
                return
            result = dict(job)

        self._send_json(200, result)

    # --------------------------------------------------------------------- #
    # POST /train-cancel
    # --------------------------------------------------------------------- #
    def _handle_train_cancel(self):
        data, err = self._read_json_body()
        if err:
            return

        job_id = data.get("job_id", "")
        if not job_id:
            self._send_json(400, {"error": "job_id is required"})
            return

        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if not job:
                self._send_json(404, {"error": "Unknown training job id"})
                return
            if job["status"] in ("completed", "failed", "cancelled"):
                self._send_json(400, {"error": f"Job already {job['status']}"})
                return
            job["status"] = "cancelled"
            job["error"] = "Cancelled by user"

        self._send_json(200, {"success": True})

    # --------------------------------------------------------------------- #
    # POST /download-dataset  (synchronous – returns rows)
    # --------------------------------------------------------------------- #
    def _handle_download_dataset(self):
        data, err = self._read_json_body()
        if err:
            return

        dataset_id = data.get("dataset_id", "")
        split = data.get("split", "train")
        max_rows = data.get("max_rows", 1000)
        hf_token = data.get("hf_token", None)

        if not dataset_id or not isinstance(dataset_id, str):
            self._send_json(400, {"error": "dataset_id is required"})
            return
        if not isinstance(split, str) or not split.strip():
            self._send_json(400, {"error": "split must be a non-empty string"})
            return
        if not isinstance(max_rows, int) or max_rows < 1:
            self._send_json(400, {"error": "max_rows must be a positive integer"})
            return
        if hf_token is not None and not isinstance(hf_token, str):
            self._send_json(400, {"error": "hf_token must be a string"})
            return

        try:
            from datasets import load_dataset  # noqa: E402

            kwargs = {
                "path": dataset_id,
                "split": split.strip(),
                "trust_remote_code": False,
            }
            if hf_token:
                kwargs["token"] = hf_token

            ds = load_dataset(**kwargs)

            # Limit the number of rows
            if len(ds) > max_rows:
                ds = ds.select(range(max_rows))

            # Convert to instruction/input/output format
            # Try to detect common column patterns
            columns = ds.column_names
            rows = []

            # Common dataset formats
            has_instruction = "instruction" in columns
            has_input = "input" in columns
            has_output = "output" in columns
            has_text = "text" in columns
            has_question = "question" in columns
            has_answer = "answer" in columns
            has_context = "context" in columns
            has_prompt = "prompt" in columns
            has_response = "response" in columns
            has_completion = "completion" in columns
            has_chosen = "chosen" in columns

            for item in ds:
                row = {"instruction": "", "input": "", "output": ""}

                if has_instruction and has_output:
                    # Standard Alpaca-style format
                    row["instruction"] = str(item.get("instruction", ""))
                    row["input"] = str(item.get("input", "")) if has_input else ""
                    row["output"] = str(item.get("output", ""))
                elif has_prompt and (has_response or has_completion or has_chosen):
                    # Prompt/response format
                    row["instruction"] = str(item.get("prompt", ""))
                    out_key = "response" if has_response else ("completion" if has_completion else "chosen")
                    row["output"] = str(item.get(out_key, ""))
                elif has_question and has_answer:
                    # Q&A format
                    row["instruction"] = str(item.get("question", ""))
                    row["input"] = str(item.get("context", "")) if has_context else ""
                    answer = item.get("answer", "")
                    if isinstance(answer, dict):
                        row["output"] = str(answer.get("text", str(answer)))
                    elif isinstance(answer, list):
                        row["output"] = str(answer[0]) if answer else ""
                    else:
                        row["output"] = str(answer)
                elif has_text:
                    # Single text column
                    row["instruction"] = str(item.get("text", ""))
                    row["output"] = str(item.get("text", ""))
                else:
                    # Generic fallback: map up to the first 3 columns to
                    # instruction / output / input respectively.
                    vals = [str(item.get(c, "")) for c in columns[:3]]
                    row["instruction"] = vals[0] if vals else ""
                    row["output"] = vals[1] if len(vals) > 1 else vals[0] if vals else ""
                    row["input"] = vals[2] if len(vals) > 2 else ""

                # Skip rows where both instruction and output are empty
                if row["instruction"].strip() or row["output"].strip():
                    rows.append(row)

            self._send_json(200, {"rows": rows, "columns": columns, "total_available": len(ds)})

        except Exception as exc:
            error_msg = str(exc)
            if "404" in error_msg or "not found" in error_msg.lower() or "doesn't exist" in error_msg.lower():
                self._send_json(404, {"error": f"Dataset '{dataset_id}' not found on HuggingFace Hub"})
            elif "401" in error_msg or "403" in error_msg:
                self._send_json(403, {"error": f"Access denied for dataset '{dataset_id}'. It may be private or gated. Try adding a HuggingFace token."})
            else:
                self._send_json(500, {"error": f"Failed to load dataset: {error_msg}"})

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

        self._handle_chat_transformers(resolved_model_dir, messages, max_tokens)

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
