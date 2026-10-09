"""Run nginx and the KCQ market connectors in one Machine.

Each child restarts independently with capped backoff, so one connector
crashing never takes the public proxy or the other connectors down. Output is
forwarded line by line with a `[name]` prefix, which keeps `flyctl logs`
attributable. Nginx is the Machine's reason to exist: if it cannot stay up
(repeated rapid exits) the supervisor exits non-zero and Fly replaces the
Machine. SIGTERM is forwarded to every child.
"""
import os
import signal
import subprocess
import sys
import threading
import time

CONNECTOR_USER = "connector"
PORTS = {"tdx": "8081", "binance": "8082", "python": "8083"}
STABLE_AFTER = 60  # seconds of uptime that reset the backoff
MAX_BACKOFF = 30
NGINX_RAPID_EXITS = 5

SERVICES = {
    "nginx": {
        "argv": ["nginx", "-g", "daemon off;"],
        "env": {},
        "user": None,
        "cwd": "/",
    },
    "tdx": {
        "argv": ["kcq-tdx"],
        # GOTDX interprets upstream timestamps in Shanghai time.
        "env": {
            "PORT": PORTS["tdx"],
            "GIN_MODE": "release",
            "TZ": "Asia/Shanghai",
            "SYMBOL_DB_PATH": "/var/lib/kcq/tdx/tdx-symbols.db",
        },
        "user": CONNECTOR_USER,
        "cwd": "/var/lib/kcq/tdx",
    },
    "binance": {
        "argv": ["kcq-binance"],
        # Upstream defaults HTTP_PROXY to a nonexistent localhost proxy: use direct egress.
        "env": {
            "PORT": PORTS["binance"],
            "GIN_MODE": "release",
            "SYMBOLS": "btcusdt,ethusdt",
            "NO_PROXY": "api.binance.com,stream.binance.com",
        },
        "user": CONNECTOR_USER,
        "cwd": "/var/lib/kcq",
    },
    "python": {
        "argv": ["python", "nebutra-entrypoint.py"],
        "env": {
            "PORT": PORTS["python"],
            "STOCK_DIRECTORY_DB_PATH": "/var/lib/kcq/python/stock-directory.db",
        },
        "user": CONNECTOR_USER,
        "cwd": "/opt/kcq-python",
    },
}

stopping = threading.Event()
children: dict[str, subprocess.Popen] = {}
fatal = threading.Event()


def log(name: str, message: str) -> None:
    sys.stdout.write(f"[{name}] {message}\n")
    sys.stdout.flush()


def pump(name: str, stream) -> None:
    for raw in iter(stream.readline, b""):
        log(name, raw.decode(errors="replace").rstrip("\n"))


def run(name: str, spec: dict) -> None:
    backoff = 1
    rapid = 0
    while not stopping.is_set():
        env = {**os.environ, **spec["env"]}
        started = time.monotonic()
        try:
            proc = subprocess.Popen(
                spec["argv"],
                env=env,
                cwd=spec["cwd"],
                user=spec["user"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
        except OSError as error:
            log("supervisor", f"{name} failed to start: {error}")
            proc = None
        if proc is not None:
            children[name] = proc
            log("supervisor", f"{name} started pid={proc.pid}")
            pump(name, proc.stdout)
            code = proc.wait()
            log("supervisor", f"{name} exited code={code}")
        if stopping.is_set():
            return
        uptime = time.monotonic() - started
        if uptime >= STABLE_AFTER:
            backoff, rapid = 1, 0
        else:
            rapid += 1
        if name == "nginx" and rapid >= NGINX_RAPID_EXITS:
            log("supervisor", "nginx cannot stay up; exiting so Fly replaces the Machine")
            fatal.set()
            stopping.set()
            return
        log("supervisor", f"restarting {name} in {backoff}s")
        stopping.wait(backoff)
        backoff = min(backoff * 2, MAX_BACKOFF)


def terminate(*_) -> None:
    stopping.set()


def main() -> int:
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGINT, terminate)
    threads = [
        threading.Thread(target=run, args=(name, spec), name=name, daemon=True)
        for name, spec in SERVICES.items()
    ]
    for thread in threads:
        thread.start()
    stopping.wait()
    for name, proc in list(children.items()):
        if proc.poll() is None:
            proc.send_signal(signal.SIGTERM)
    deadline = time.monotonic() + 10
    for proc in children.values():
        try:
            proc.wait(timeout=max(0.1, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            proc.kill()
    return 1 if fatal.is_set() else 0


if __name__ == "__main__":
    sys.exit(main())
