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
import re
import signal
import sys
import datetime
import traceback
import threading
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

_SAFE_GGUF_FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.gguf$")

# Disable tokenizers parallelism to prevent deadlocks when the Rust-based
# tokenizers library is used from a Python thread inside this multi-threaded
# HTTP server.  Must be set before any transformers / tokenizers imports.
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Disable HuggingFace Hub telemetry to avoid background network calls that
# could stall in a subprocess context.
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

# ---------------------------------------------------------------------------
# Pre-load heavy ML libraries in the main thread **before** starting the HTTP
# server.  Python's import machinery uses per-module locks that can deadlock
# when large native-extension packages (torch, tokenizers) are first imported
# concurrently across multiple threads – exactly the situation created by our
# ThreadingMixIn HTTP server spawning worker threads that lazily import them.
# By importing once here (in the single main thread) every subsequent
# `import torch` / `from transformers import ...` inside a handler or worker
# thread becomes a fast no-op (the module is already in sys.modules).
# ---------------------------------------------------------------------------
try:
    import torch  # noqa: F401
except ImportError:
    pass

try:
    from transformers import (  # noqa: F401
        AutoModelForCausalLM, AutoTokenizer, AutoConfig,
        TrainingArguments, Trainer, TrainerCallback,
        DataCollatorForLanguageModeling,
        GPT2Config, GPT2LMHeadModel, PreTrainedTokenizerFast,
        TextIteratorStreamer,
    )
except ImportError:
    pass

try:
    from tokenizers import (  # noqa: F401
        Tokenizer, models, trainers, pre_tokenizers,
    )
except ImportError:
    pass

try:
    from huggingface_hub import snapshot_download  # noqa: F401
except ImportError:
    pass

try:
    import gguf  # noqa: F401
except ImportError:
    pass

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

# Allowed training outputs directory (set from CLI arg, separate from models)
_allowed_training_outputs_dir = None

# Allowed datasets directory (set from CLI arg, for validating dataset file paths)
_allowed_datasets_dir = None

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


def _log(msg):
    """Print a timestamped log message and flush immediately so the parent
    Node.js process receives it without delay."""
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[train {ts}] {msg}", flush=True)


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


def _validate_path_within_training_outputs_dir(target_path):
    """Validate that *target_path* resolves to a path strictly inside
    ``_allowed_training_outputs_dir``.  Returns the resolved absolute path
    on success, or ``None`` if outside the allowed directory."""
    if not _allowed_training_outputs_dir:
        return None
    resolved = os.path.realpath(target_path)
    if not resolved.startswith(_allowed_training_outputs_dir + os.sep):
        return None
    return resolved


def _validate_path_within_any_allowed_dir(target_path):
    """Validate that *target_path* resolves to a path inside either the
    allowed models directory or the training-outputs directory.  Returns
    the resolved absolute path on success, or ``None``."""
    result = _validate_path_within_models_dir(target_path)
    if result is not None:
        return result
    return _validate_path_within_training_outputs_dir(target_path)


def _validate_path_within_datasets_dir(target_path):
    """Validate that *target_path* resolves to a path strictly inside
    ``_allowed_datasets_dir``.  Returns the resolved absolute path on
    success, or ``None`` if the path is outside the allowed directory."""
    if not _allowed_datasets_dir:
        return None
    resolved = os.path.realpath(target_path)
    if not resolved.startswith(_allowed_datasets_dir + os.sep):
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


# ---------------------------------------------------------------------------
# GGUF conversion for GPT-2 architecture models trained from scratch
# ---------------------------------------------------------------------------

# GPT-2 tensor name mapping: HuggingFace transformers → GGUF
_GPT2_TENSOR_MAP = {
    "transformer.wte.weight": "token_embd.weight",
    "transformer.wpe.weight": "position_embd.weight",
    "transformer.ln_f.weight": "output_norm.weight",
    "transformer.ln_f.bias": "output_norm.bias",
}

# Per-block GPT-2 tensor name patterns (use .format(i=block_index))
_GPT2_BLOCK_TENSOR_MAP = {
    "transformer.h.{i}.ln_1.weight": "blk.{i}.attn_norm.weight",
    "transformer.h.{i}.ln_1.bias": "blk.{i}.attn_norm.bias",
    "transformer.h.{i}.attn.c_proj.weight": "blk.{i}.attn_output.weight",
    "transformer.h.{i}.attn.c_proj.bias": "blk.{i}.attn_output.bias",
    "transformer.h.{i}.ln_2.weight": "blk.{i}.ffn_norm.weight",
    "transformer.h.{i}.ln_2.bias": "blk.{i}.ffn_norm.bias",
    "transformer.h.{i}.mlp.c_fc.weight": "blk.{i}.ffn_up.weight",
    "transformer.h.{i}.mlp.c_fc.bias": "blk.{i}.ffn_up.bias",
    "transformer.h.{i}.mlp.c_proj.weight": "blk.{i}.ffn_down.weight",
    "transformer.h.{i}.mlp.c_proj.bias": "blk.{i}.ffn_down.bias",
}

# Conv1D layers in GPT-2 that need transposition (stored as in_feat x out_feat)
_GPT2_CONV1D_NAMES = {
    "attn.c_attn.weight",
    "attn.c_proj.weight",
    "mlp.c_fc.weight",
    "mlp.c_proj.weight",
}


def _convert_model_to_gguf(model_dir, output_path, model_name="model"):
    """Convert a HuggingFace GPT-2 model directory to GGUF format.

    Uses the ``gguf`` Python package to write a single F32 GGUF file that can
    be loaded by llama.cpp or any other GGUF-compatible runtime.

    Parameters
    ----------
    model_dir : str
        Path to the directory containing a HuggingFace model (config.json,
        pytorch_model.bin / model.safetensors, tokenizer.json, etc.).
    output_path : str
        Destination file path for the resulting ``.gguf`` file.
    model_name : str, optional
        Human-readable model name embedded in the GGUF metadata.
    """
    # Defense-in-depth: validate paths are within allowed directories
    validated_model_dir = _validate_path_within_any_allowed_dir(model_dir)
    if validated_model_dir is None:
        raise ValueError("model_dir is outside the allowed directory")
    validated_output_parent = _validate_path_within_any_allowed_dir(os.path.dirname(output_path))
    if validated_output_parent is None:
        raise ValueError("output_path is outside the allowed directory")
    # Reconstruct output path from validated parent and sanitized basename
    output_basename = os.path.basename(output_path)
    if (
        not output_basename
        or output_basename in ('.', '..')
        or not _SAFE_GGUF_FILENAME_RE.fullmatch(output_basename)
    ):
        raise ValueError("output_path must be a safe filename ending in .gguf")
    validated_output_path = os.path.join(validated_output_parent, output_basename)

    # Canonicalize and enforce allowlist at point-of-use so this function stays
    # safe even if called from another code path.
    canonical_output_path = os.path.realpath(validated_output_path)
    allowed_roots = [d for d in (_allowed_models_dir, _allowed_training_outputs_dir) if d]
    if not allowed_roots:
        raise ValueError("No allowed output directory configured")
    if not any(os.path.commonpath([canonical_output_path, root]) == root for root in allowed_roots):
        raise ValueError("output_path resolves outside the allowed directory")
    validated_output_path = canonical_output_path

    import numpy as np
    from gguf import GGUFWriter, GGUFValueType  # noqa: E402

    _log(f"GGUF conversion: loading model from {validated_model_dir}")

    config = AutoConfig.from_pretrained(validated_model_dir)
    model = AutoModelForCausalLM.from_pretrained(
        validated_model_dir, torch_dtype=torch.float32, device_map=None,
    )
    model.eval()
    tokenizer = AutoTokenizer.from_pretrained(validated_model_dir)

    n_embd = config.n_embd
    n_head = config.n_head
    n_layer = config.n_layer
    n_positions = getattr(config, "n_positions", 512)
    vocab_size = config.vocab_size
    n_inner = getattr(config, "n_inner", None) or 4 * n_embd

    _log(f"GGUF conversion: arch=gpt2 layers={n_layer} embd={n_embd} heads={n_head} vocab={vocab_size}")

    writer = GGUFWriter(validated_output_path, arch="gpt2")

    # ---- Model metadata -------------------------------------------------- #
    writer.add_name(model_name)
    writer.add_context_length(n_positions)
    writer.add_embedding_length(n_embd)
    writer.add_block_count(n_layer)
    writer.add_head_count(n_head)
    writer.add_feed_forward_length(n_inner)

    # ---- Tokenizer metadata ---------------------------------------------- #
    writer.add_tokenizer_model("gpt2")

    # Extract vocabulary tokens and merges from the fast tokenizer
    tokens = []
    scores = []
    token_types = []
    special_ids = set()
    if tokenizer.all_special_ids:
        special_ids = set(tokenizer.all_special_ids)

    vocab = tokenizer.get_vocab()
    # Sort by token id to ensure consistent ordering
    sorted_vocab = sorted(vocab.items(), key=lambda x: x[1])
    for tok_str, tok_id in sorted_vocab:
        tokens.append(tok_str.encode("utf-8", errors="replace"))
        scores.append(float(-tok_id))  # Use negative id as score (common convention)
        token_types.append(3 if tok_id in special_ids else 1)  # 3=control, 1=normal

    writer.add_token_list(tokens)
    writer.add_token_scores(scores)
    writer.add_token_types(token_types)

    # Add BOS/EOS token ids
    if tokenizer.bos_token_id is not None:
        writer.add_bos_token_id(tokenizer.bos_token_id)
    if tokenizer.eos_token_id is not None:
        writer.add_eos_token_id(tokenizer.eos_token_id)
    if tokenizer.pad_token_id is not None:
        writer.add_pad_token_id(tokenizer.pad_token_id)

    # BPE merges (from the fast tokenizer's internal model)
    try:
        tok_json_path = os.path.join(validated_model_dir, "tokenizer.json")
        if os.path.isfile(tok_json_path):
            with open(tok_json_path, "r", encoding="utf-8") as f:
                tok_data = json.load(f)
            merges_raw = tok_data.get("model", {}).get("merges", [])
            if merges_raw:
                writer.add_token_merges([m.encode("utf-8") for m in merges_raw])
    except Exception as e:
        _log(f"GGUF conversion: warning – could not extract BPE merges: {e}")

    # ---- Tensors --------------------------------------------------------- #
    state_dict = model.state_dict()

    for hf_name, tensor in state_dict.items():
        data = tensor.cpu().numpy().astype(np.float32)

        # Skip lm_head.weight if it's tied to wte (same data)
        if hf_name == "lm_head.weight":
            wte = state_dict.get("transformer.wte.weight")
            if wte is not None and tensor.data_ptr() == wte.data_ptr():
                continue  # Tied weights – skip duplicate
            gguf_name = "output.weight"
            writer.add_tensor(gguf_name, data)
            continue

        # Check global (non-block) tensors
        if hf_name in _GPT2_TENSOR_MAP:
            gguf_name = _GPT2_TENSOR_MAP[hf_name]
            writer.add_tensor(gguf_name, data)
            continue

        # Check per-block tensors
        matched = False
        for block_idx in range(n_layer):
            # c_attn needs special handling: split Q/K/V
            c_attn_w = f"transformer.h.{block_idx}.attn.c_attn.weight"
            c_attn_b = f"transformer.h.{block_idx}.attn.c_attn.bias"

            if hf_name == c_attn_w:
                # Conv1D weight shape: (n_embd, 3*n_embd) → transpose → (3*n_embd, n_embd)
                data_t = data.T  # Now (3*n_embd, n_embd)
                q, k, v = np.split(data_t, 3, axis=0)
                writer.add_tensor(f"blk.{block_idx}.attn_q.weight", q)
                writer.add_tensor(f"blk.{block_idx}.attn_k.weight", k)
                writer.add_tensor(f"blk.{block_idx}.attn_v.weight", v)
                matched = True
                break

            if hf_name == c_attn_b:
                q, k, v = np.split(data, 3)
                writer.add_tensor(f"blk.{block_idx}.attn_q.bias", q)
                writer.add_tensor(f"blk.{block_idx}.attn_k.bias", k)
                writer.add_tensor(f"blk.{block_idx}.attn_v.bias", v)
                matched = True
                break

            for hf_pat, gguf_pat in _GPT2_BLOCK_TENSOR_MAP.items():
                hf_key = hf_pat.format(i=block_idx)
                if hf_name == hf_key:
                    gguf_name = gguf_pat.format(i=block_idx)
                    # Transpose Conv1D weights
                    suffix = hf_name.split(f"transformer.h.{block_idx}.")[-1]
                    if suffix in _GPT2_CONV1D_NAMES:
                        data = data.T
                    writer.add_tensor(gguf_name, data)
                    matched = True
                    break

            if matched:
                break

        if not matched:
            _log(f"GGUF conversion: skipping unmapped tensor '{hf_name}'")

    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file()
    writer.close()

    # Re-validate validated_output_path before os.path.getsize for CodeQL.
    # Pattern: abspath + startswith is a known sanitizer for many static analyzers.
    abs_path = os.path.abspath(validated_output_path)
    allowed_roots = [os.path.abspath(d) for d in (_allowed_models_dir, _allowed_training_outputs_dir) if d]
    is_safe = False
    for root in allowed_roots:
        if abs_path == root or abs_path.startswith(root + os.sep):
            is_safe = True
            break
    if not is_safe:
        raise ValueError("output_path resolves outside the allowed directory")

    # Use the validated path directly in the sink
    file_size = os.path.getsize(abs_path)
    _log(f"GGUF conversion: completed – {abs_path} ({file_size / (1024*1024):.1f} MB)")
    return abs_path


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
        tokenizer = AutoTokenizer.from_pretrained(model_dir, gguf_file=gguf_filename, trust_remote_code=False)
        model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            gguf_file=gguf_filename,
            torch_dtype="auto",
            device_map=device_map,
            low_cpu_mem_usage=True,
            ignore_mismatched_sizes=True,
            trust_remote_code=False,
        )
    else:
        print(f"Loading model from {model_dir} (device_map={device_map}) ...", flush=True)
        tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=False)
        model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            torch_dtype="auto",
            device_map=device_map,
            low_cpu_mem_usage=True,
            trust_remote_code=False,
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
                  training_mode="fine-tune", epochs=3, learning_rate=2e-5, batch_size=4,
                  dataset_paths=None, post_dataset_paths=None):
    """Background thread that trains a model on a dataset and tracks progress.

    Supports both the legacy single-path parameters (``dataset_path`` /
    ``post_dataset_path``) and the newer list parameters (``dataset_paths`` /
    ``post_dataset_paths``).  When lists are provided they take precedence.
    """
    _log(f"Job {job_id[:8]}... worker thread started (mode: {training_mode})")

    # Normalize to lists for uniform handling
    if dataset_paths:
        _dataset_paths = list(dataset_paths)
    else:
        _dataset_paths = [dataset_path] if dataset_path else []

    if post_dataset_paths:
        _post_dataset_paths = list(post_dataset_paths)
    else:
        _post_dataset_paths = [post_dataset_path] if post_dataset_path else []

    # Filter out None / empty entries
    _dataset_paths = [p for p in _dataset_paths if p]
    _post_dataset_paths = [p for p in _post_dataset_paths if p]
    try:
        from transformers import (  # noqa: E402
            AutoModelForCausalLM,
            AutoTokenizer,
            AutoConfig,
            TrainingArguments,
            Trainer,
            TrainerCallback,
            DataCollatorForLanguageModeling,
        )
        import torch  # noqa: E402

        class _ProgressCallback(TrainerCallback):
            """Update training progress in the shared dict and log to console."""

            def __init__(self, job_id, phase="training"):
                self._job_id = job_id
                self._phase = phase
                self._last_logged_pct = -1

            def on_step_end(self, args, state, control, **kwargs):
                if state.max_steps > 0:
                    pct = int((state.global_step / state.max_steps) * 100)
                else:
                    pct = 0
                cancelled = False
                with _trainings_lock:
                    job = _active_trainings.get(self._job_id)
                    if job:
                        job["progress"] = pct
                        job["current_epoch"] = int(state.epoch) if state.epoch else 0
                        job["phase"] = self._phase
                        if job.get("status") == "cancelled":
                            cancelled = True

                # Log progress every 10% or on first step
                if pct >= self._last_logged_pct + 10 or self._last_logged_pct == -1:
                    epoch_str = int(state.epoch) if state.epoch else 0
                    _log(f"Job {self._job_id[:8]}... {self._phase} — step {state.global_step}/{state.max_steps} ({pct}%), epoch {epoch_str}/{args.num_train_epochs}")
                    self._last_logged_pct = pct

                # Stop training if the job was cancelled
                if cancelled:
                    _log(f"Job {self._job_id[:8]}... cancelled by user, stopping training")
                    control.should_training_stop = True

            def on_epoch_end(self, args, state, control, **kwargs):
                epoch_num = int(state.epoch) if state.epoch else 0
                with _trainings_lock:
                    job = _active_trainings.get(self._job_id)
                    if job:
                        job["current_epoch"] = epoch_num
                _log(f"Job {self._job_id[:8]}... {self._phase} — epoch {epoch_num}/{args.num_train_epochs} completed")

        with _trainings_lock:
            _active_trainings[job_id]["status"] = "loading_model"

        _log(f"Job {job_id[:8]}... loading model (mode: {training_mode})")

        if training_mode == "from-scratch":
            # Train completely from scratch: build a tokenizer from the
            # training data and initialise a model with random weights.
            # No pretrained models or tokenizers are downloaded.
            from transformers import GPT2Config, GPT2LMHeadModel, PreTrainedTokenizerFast  # noqa: E402
            from tokenizers import Tokenizer as HFTokenizer, models as tok_models, trainers as tok_trainers, pre_tokenizers as tok_pre  # noqa: E402

            with _trainings_lock:
                _active_trainings[job_id]["status"] = "loading_dataset"

            # Read dataset text to train the tokenizer on (all training datasets)
            raw_lines: list[str] = []
            for _ds_path in _dataset_paths:
                with open(_ds_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            row = json.loads(line)
                            parts = []
                            for key in ("instruction", "input", "output"):
                                if row.get(key):
                                    parts.append(str(row[key]))
                            if parts:
                                raw_lines.append(" ".join(parts))

            if not raw_lines:
                raise ValueError("Dataset is empty – cannot build tokenizer")

            _log(f"Job {job_id[:8]}... building BPE tokenizer from {len(raw_lines)} text samples")

            # Train a BPE tokenizer from the dataset text
            bpe_tokenizer = HFTokenizer(tok_models.BPE(unk_token="<unk>"))
            bpe_tokenizer.pre_tokenizer = tok_pre.ByteLevel(add_prefix_space=False)

            special_tokens = ["<pad>", "<unk>", "<bos>", "<eos>"]
            trainer = tok_trainers.BpeTrainer(
                vocab_size=8000,
                special_tokens=special_tokens,
                min_frequency=2,
            )
            bpe_tokenizer.train_from_iterator(raw_lines, trainer=trainer)

            # Wrap into a PreTrainedTokenizerFast for HuggingFace compatibility
            tokenizer = PreTrainedTokenizerFast(
                tokenizer_object=bpe_tokenizer,
                bos_token="<bos>",
                eos_token="<eos>",
                unk_token="<unk>",
                pad_token="<pad>",
            )

            actual_vocab_size = len(tokenizer)

            with _trainings_lock:
                _active_trainings[job_id]["status"] = "loading_model"

            config = GPT2Config(
                vocab_size=actual_vocab_size,
                n_positions=512,
                n_embd=768,
                n_layer=6,
                n_head=12,
                bos_token_id=tokenizer.bos_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
            model = GPT2LMHeadModel(config)
            _log(f"Job {job_id[:8]}... from-scratch model initialized (vocab_size={actual_vocab_size})")
        else:
            # Fine-tune: load existing model and tokenizer
            gguf_filename = _find_gguf_file(model_dir)
            _log(f"Job {job_id[:8]}... loading model from {model_dir}" + (f" (GGUF: {gguf_filename})" if gguf_filename else ""))

            load_kwargs = {
                "torch_dtype": torch.float32,
                "low_cpu_mem_usage": True,
                # Training requires a single device; disable device_map to avoid
                # issues with model parallelism during backpropagation.
                "device_map": None,
            }

            if gguf_filename:
                tokenizer = AutoTokenizer.from_pretrained(model_dir, gguf_file=gguf_filename, trust_remote_code=False)
                model = AutoModelForCausalLM.from_pretrained(
                    model_dir, gguf_file=gguf_filename, ignore_mismatched_sizes=True, trust_remote_code=False, **load_kwargs
                )
            else:
                tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=False)
                model = AutoModelForCausalLM.from_pretrained(model_dir, trust_remote_code=False, **load_kwargs)

            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

        if torch.cuda.is_available():
            model = model.cuda()
            _log(f"Job {job_id[:8]}... model moved to CUDA")

        model.train()
        _log(f"Job {job_id[:8]}... model loaded successfully")

        with _trainings_lock:
            _active_trainings[job_id]["status"] = "loading_dataset"

        _log(f"Job {job_id[:8]}... loading dataset ({len(_dataset_paths)} file(s))")

        # Load dataset file (parquet or JSONL)
        def _load_dataset_file(fpath):
            if fpath.endswith('.parquet'):
                import pyarrow.parquet as pq
                table = pq.read_table(fpath)
                return table.to_pylist()
            # JSONL fallback
            rows = []
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        rows.append(json.loads(line))
            return rows

        # Load rows from all training datasets
        raw_rows = []
        for _ds_path in _dataset_paths:
            raw_rows.extend(_load_dataset_file(_ds_path))
        if not raw_rows:
            raise ValueError("Dataset is empty")

        # Format rows into text for causal LM training
        def _format_row(row):
            parts = []
            # Post-training format (prompt/chosen/rejected) — mutually exclusive with standard format
            if row.get("prompt") or row.get("chosen") or row.get("rejected"):
                if row.get("prompt"):
                    parts.append(f"### Prompt:\n{row['prompt']}")
                if row.get("chosen"):
                    parts.append(f"### Chosen Response:\n{row['chosen']}")
                if row.get("rejected"):
                    parts.append(f"### Rejected Response:\n{row['rejected']}")
            else:
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

        _log(f"Job {job_id[:8]}... tokenizing {len(texts)} samples (max_length={max_length})")

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

        _log(f"Job {job_id[:8]}... starting training (epochs={epochs}, lr={learning_rate}, batch_size={batch_size}, samples={len(train_dataset)})")

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
            disable_tqdm=True,
            dataloader_num_workers=0,
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
            callbacks=[_ProgressCallback(job_id, "training")],
        )

        trainer.train()

        _log(f"Job {job_id[:8]}... main training phase completed")

        # Post-training phase (if any post-training datasets provided)
        _valid_post_paths = [p for p in _post_dataset_paths if os.path.isfile(p)]
        if _valid_post_paths:
            with _trainings_lock:
                job = _active_trainings.get(job_id)
                if job:
                    job["status"] = "post_training"
                    job["phase"] = "post_training"
                    job["progress"] = 0

            _log(f"Job {job_id[:8]}... starting post-training phase ({len(_valid_post_paths)} dataset(s))")

            post_rows = []
            for _pp in _valid_post_paths:
                post_rows.extend(_load_dataset_file(_pp))
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
                        disable_tqdm=True,
                        dataloader_num_workers=0,
                    )

                    post_trainer = Trainer(
                        model=model,
                        args=post_args,
                        train_dataset=post_dataset,
                        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
                        callbacks=[_ProgressCallback(job_id, "post_training")],
                    )

                    post_trainer.train()

                    _log(f"Job {job_id[:8]}... post-training phase completed")

        # Save the final model
        with _trainings_lock:
            job = _active_trainings.get(job_id)
            if job:
                job["status"] = "saving"
                job["progress"] = 95

        _log(f"Job {job_id[:8]}... saving model to {output_dir}")

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

        _log(f"Job {job_id[:8]}... completed successfully (size: {total_size / (1024*1024):.1f} MB)")

        # Evict from model cache so re-load picks up trained weights
        with _model_lock:
            _model_cache.pop(model_dir, None)
            _model_cache.pop(output_dir, None)

    except BaseException as exc:
        # Use BaseException to catch SystemExit, KeyboardInterrupt, etc.
        # that would otherwise kill the thread silently.
        try:
            _log(f"Job {job_id[:8]}... FAILED: {exc}")
        except Exception:
            pass
        try:
            traceback.print_exc()
            sys.stderr.flush()
        except Exception:
            pass
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
        elif self.path == "/convert-to-gguf":
            self._handle_convert_to_gguf()
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
        training_mode = data.get("training_mode", "fine-tune")
        epochs = data.get("epochs", 3)
        learning_rate = data.get("learning_rate", 2e-5)
        batch_size = data.get("batch_size", 4)

        # Support multiple dataset paths (new) alongside the legacy single
        # path fields for backward compatibility.
        dataset_paths = data.get("dataset_paths", None)
        post_dataset_paths = data.get("post_dataset_paths", None)

        # Normalize into lists
        if isinstance(dataset_paths, list) and dataset_paths:
            all_dataset_paths = list(dataset_paths)
        elif dataset_path:
            all_dataset_paths = [dataset_path]
        else:
            all_dataset_paths = []

        if isinstance(post_dataset_paths, list) and post_dataset_paths:
            all_post_dataset_paths = list(post_dataset_paths)
        elif post_dataset_path:
            all_post_dataset_paths = [post_dataset_path]
        else:
            all_post_dataset_paths = []

        if training_mode not in ("fine-tune", "from-scratch"):
            training_mode = "fine-tune"

        if training_mode == "fine-tune" and (not model_dir or not isinstance(model_dir, str)):
            self._send_json(400, {"error": "model_dir is required for fine-tuning"})
            return
        if not all_dataset_paths:
            self._send_json(400, {"error": "dataset_path is required"})
            return
        if not output_dir or not isinstance(output_dir, str):
            self._send_json(400, {"error": "output_dir is required"})
            return

        # Validate numeric training parameters
        import math as _math
        try:
            lr_val = float(learning_rate)
            if _math.isnan(lr_val) or _math.isinf(lr_val) or lr_val <= 0 or lr_val > 1.0:
                self._send_json(400, {"error": "learning_rate must be a finite positive number <= 1.0"})
                return
        except (TypeError, ValueError):
            self._send_json(400, {"error": "learning_rate must be a number"})
            return
        if not isinstance(epochs, int) or epochs < 1 or epochs > 100:
            self._send_json(400, {"error": "epochs must be an integer between 1 and 100"})
            return
        if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 128:
            self._send_json(400, {"error": "batch_size must be an integer between 1 and 128"})
            return

        # Validate model_dir is within allowed directory (required for fine-tune)
        resolved_model_dir = None
        if model_dir:
            resolved_model_dir = _validate_path_within_models_dir(model_dir)
            if resolved_model_dir is None:
                if not _allowed_models_dir:
                    self._send_json(500, {"error": "No allowed models directory configured"})
                else:
                    self._send_json(403, {"error": "model_dir is outside the allowed models directory"})
                return
            if training_mode == "fine-tune" and not os.path.isdir(resolved_model_dir):
                self._send_json(400, {"error": "model_dir does not exist"})
                return
        elif training_mode == "fine-tune":
            self._send_json(400, {"error": "model_dir is required for fine-tuning"})
            return

        # Validate output_dir is within allowed models or training-outputs directory
        resolved_output_dir = _validate_path_within_any_allowed_dir(output_dir)
        if resolved_output_dir is None:
            if not _allowed_models_dir and not _allowed_training_outputs_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "output_dir is outside the allowed directory"})
            return

        # Validate dataset paths – they must be absolute and must not contain
        # path traversal sequences.  The Node.js server already validates them
        # via ensureWithinDir, but we re-check here as defence-in-depth.
        all_paths_to_validate: list[tuple[str, str]] = []
        for i, dp in enumerate(all_dataset_paths):
            all_paths_to_validate.append((f"dataset_paths[{i}]", dp))
        for i, dp in enumerate(all_post_dataset_paths):
            all_paths_to_validate.append((f"post_dataset_paths[{i}]", dp))

        for label, dp in all_paths_to_validate:
            if not isinstance(dp, str) or not dp:
                self._send_json(400, {"error": f"{label} must be a non-empty string"})
                return
            normed = os.path.normpath(dp)
            if normed != dp or os.path.isabs(dp) is False:
                self._send_json(400, {"error": f"{label} contains invalid path components"})
                return

        # Use resolved (realpath) dataset paths to prevent symlink attacks
        resolved_dataset_paths = []
        for i, p in enumerate(all_dataset_paths):
            validated = _validate_path_within_datasets_dir(p)
            if validated is None:
                if not _allowed_datasets_dir:
                    self._send_json(500, {"error": "No allowed datasets directory configured"})
                else:
                    self._send_json(403, {"error": f"dataset_paths[{i}] is outside the allowed datasets directory"})
                return
            if not os.path.isfile(validated):
                self._send_json(400, {"error": f"dataset_paths[{i}] does not exist"})
                return
            resolved_dataset_paths.append(validated)

        resolved_post_dataset_paths = []
        for i, p in enumerate(all_post_dataset_paths):
            validated = _validate_path_within_datasets_dir(p)
            if validated is None:
                if not _allowed_datasets_dir:
                    self._send_json(500, {"error": "No allowed datasets directory configured"})
                else:
                    self._send_json(403, {"error": f"post_dataset_paths[{i}] is outside the allowed datasets directory"})
                return
            if not os.path.isfile(validated):
                self._send_json(400, {"error": f"post_dataset_paths[{i}] does not exist"})
                return
            resolved_post_dataset_paths.append(validated)

        if not isinstance(epochs, int) or epochs < 1 or epochs > 100:
            self._send_json(400, {"error": "epochs must be between 1 and 100"})
            return
        if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 64:
            self._send_json(400, {"error": "batch_size must be between 1 and 64"})
            return

        job_id = str(uuid.uuid4())

        _log(f"Job {job_id[:8]}... received training request (mode: {training_mode}, epochs: {epochs}, lr: {learning_rate}, batch_size: {batch_size})")

        # Register job BEFORE starting the thread so /train-progress
        # never returns 404 for a valid job_id.
        with _trainings_lock:
            _active_trainings[job_id] = {
                "status": "starting",
                "progress": 0,
                "current_epoch": 0,
                "total_epochs": epochs,
                "phase": "training",
                "error": None,
            }

        thread = threading.Thread(
            target=_train_worker,
            args=(job_id, resolved_model_dir, resolved_dataset_paths[0] if resolved_dataset_paths else "", resolved_output_dir),
            kwargs={
                "dataset_paths": resolved_dataset_paths,
                "post_dataset_paths": resolved_post_dataset_paths,
                "training_mode": training_mode,
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
    # POST /convert-to-gguf  (synchronous – converts model and returns path)
    # --------------------------------------------------------------------- #
    def _handle_convert_to_gguf(self):
        data, err = self._read_json_body()
        if err:
            return

        model_dir = data.get("model_dir", "")
        output_path = data.get("output_path", "")
        model_name = data.get("model_name", "model")

        if not model_dir or not isinstance(model_dir, str):
            self._send_json(400, {"error": "model_dir is required"})
            return
        if not output_path or not isinstance(output_path, str):
            self._send_json(400, {"error": "output_path is required"})
            return

        # Validate model_dir is within allowed directory (models or training-outputs)
        resolved_model_dir = _validate_path_within_any_allowed_dir(model_dir)
        if resolved_model_dir is None:
            if not _allowed_models_dir and not _allowed_training_outputs_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "model_dir is outside the allowed directory"})
            return

        if not os.path.isdir(resolved_model_dir):
            self._send_json(400, {"error": "model_dir does not exist"})
            return

        # Validate output_path is within allowed directory (models or training-outputs)
        resolved_output_parent = _validate_path_within_any_allowed_dir(os.path.dirname(output_path))
        if resolved_output_parent is None:
            if not _allowed_models_dir and not _allowed_training_outputs_dir:
                self._send_json(500, {"error": "No allowed models directory configured"})
            else:
                self._send_json(403, {"error": "output_path is outside the allowed directory"})
            return
        # Reconstruct from validated parent + sanitized basename
        output_basename = os.path.basename(output_path)
        if (
            not output_basename
            or output_basename in ('.', '..')
            or not _SAFE_GGUF_FILENAME_RE.fullmatch(output_basename)
        ):
            self._send_json(400, {"error": "output_path must be a safe filename ending in .gguf"})
            return
        resolved_output_path = os.path.join(resolved_output_parent, output_basename)
        # Security: ensure resolved_output_path is within resolved_output_parent for CodeQL
        if not os.path.abspath(resolved_output_path).startswith(os.path.abspath(resolved_output_parent) + os.sep):
            self._send_json(400, {"error": "Invalid output path"})
            return

        # Final canonical path validation (defense in depth): ensure the exact
        # output path still resolves inside an allowed root and is not a symlink.
        canonical_output_path = os.path.realpath(resolved_output_path)
        allowed_roots = [d for d in (_allowed_models_dir, _allowed_training_outputs_dir) if d]
        if not any(os.path.commonpath([canonical_output_path, root]) == root for root in allowed_roots):
            self._send_json(403, {"error": "output_path resolves outside the allowed directory"})
            return
        if os.path.islink(resolved_output_path):
            self._send_json(400, {"error": "output_path cannot be a symlink"})
            return

        # Validate model_name is safe
        if not isinstance(model_name, str) or len(model_name) > 200:
            self._send_json(400, {"error": "model_name must be a string (max 200 chars)"})
            return

        try:
            _convert_model_to_gguf(resolved_model_dir, canonical_output_path, model_name=model_name)
            # Re-verify canonical_output_path before getsize for CodeQL
            abs_recheck = os.path.abspath(canonical_output_path)
            allowed_roots_recheck = [os.path.abspath(d) for d in (_allowed_models_dir, _allowed_training_outputs_dir) if d]
            is_safe = False
            for root in allowed_roots_recheck:
                if abs_recheck == root or abs_recheck.startswith(root + os.sep):
                    is_safe = True
                    break
            if not is_safe:
                raise ValueError("output_path resolves outside the allowed directory")

            # Use the validated path directly in the sink
            file_size = os.path.getsize(abs_recheck)
            self._send_json(200, {
                "success": True,
                "path": abs_recheck,
                "size": file_size,
            })
        except Exception as exc:
            _log(f"GGUF conversion failed: {exc}")
            import traceback
            traceback.print_exc()
            self._send_json(500, {"error": "GGUF conversion failed"})

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
        if not isinstance(max_rows, int) or max_rows < 1 or max_rows > 50000:
            self._send_json(400, {"error": "max_rows must be a positive integer (max 50000)"})
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
                "streaming": True,
            }
            if hf_token:
                kwargs["token"] = hf_token

            ds = load_dataset(**kwargs)

            # Collect up to max_rows items from the streaming dataset
            columns = None
            raw_items = []
            for item in ds:
                if columns is None:
                    columns = list(item.keys())
                raw_items.append(item)
                if len(raw_items) >= max_rows:
                    break

            if columns is None:
                columns = []

            # Convert to instruction/input/output format
            # Try to detect common column patterns
            rows = []

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

            for item in raw_items:
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

            self._send_json(200, {"rows": rows, "columns": columns, "rows_fetched": len(raw_items)})

        except Exception as exc:
            error_msg = str(exc)
            if "404" in error_msg or "not found" in error_msg.lower() or "doesn't exist" in error_msg.lower():
                self._send_json(404, {"error": f"Dataset '{dataset_id}' not found on HuggingFace Hub"})
            elif "401" in error_msg or "403" in error_msg:
                self._send_json(403, {"error": f"Access denied for dataset '{dataset_id}'. It may be private or gated. Try adding a HuggingFace token."})
            else:
                _log(f"Failed to load dataset: {error_msg}")
                self._send_json(500, {"error": "Failed to load dataset"})

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

        if not isinstance(max_tokens, int) or max_tokens < 1 or max_tokens > 16384:
            self._send_json(400, {"error": "max_tokens must be an integer between 1 and 16384"})
            return

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
            _log(f"Failed to load model: {exc}")
            self._send_json(500, {"error": "Failed to load model"})
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
    global _allowed_models_dir, _allowed_training_outputs_dir, _allowed_datasets_dir

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5555

    # Optional: restrict model loading to a specific directory
    if len(sys.argv) > 2:
        _allowed_models_dir = os.path.realpath(sys.argv[2])
        print(f"Restricting model loading to: {_allowed_models_dir}", flush=True)

    # Optional: training outputs directory (for from-scratch trained models)
    if len(sys.argv) > 3:
        _allowed_training_outputs_dir = os.path.realpath(sys.argv[3])
        print(f"Training outputs directory: {_allowed_training_outputs_dir}", flush=True)

    # Optional: datasets directory (for validating dataset file paths)
    if len(sys.argv) > 4:
        _allowed_datasets_dir = os.path.realpath(sys.argv[4])
        print(f"Datasets directory: {_allowed_datasets_dir}", flush=True)

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
