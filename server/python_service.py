"""
Simple Python service that runs inside a virtual environment and stays alive
until the parent Node.js server signals it to exit (via SIGTERM or stdin EOF).
"""

import signal
import sys
import threading


def main():
    stop_event = threading.Event()

    def _handle_signal(signum, _frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    print("Python service started", flush=True)

    # Block until we receive a termination signal or stdin is closed
    # (stdin closes automatically when the parent Node process exits)
    def _watch_stdin():
        try:
            for _ in sys.stdin:
                pass  # drain until EOF
        except Exception:
            pass
        stop_event.set()

    stdin_thread = threading.Thread(target=_watch_stdin, daemon=True)
    stdin_thread.start()

    stop_event.wait()
    print("Python service stopping", flush=True)


if __name__ == "__main__":
    main()
