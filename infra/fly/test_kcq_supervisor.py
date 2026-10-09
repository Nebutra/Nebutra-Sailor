"""Contract tests for the consolidated KCQ Machine (run: python3 -m unittest discover -s infra/fly -p 'test_kcq_*.py')."""
import importlib.util
import pathlib
import re
import subprocess
import sys
import threading
import time
import unittest

HERE = pathlib.Path(__file__).parent


def load_supervisor():
    spec = importlib.util.spec_from_file_location("kcq_supervisor", HERE / "kcq-supervisor.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SupervisorTest(unittest.TestCase):
    def test_crashing_child_restarts_without_affecting_siblings(self):
        sup = load_supervisor()
        crash = {
            "argv": [sys.executable, "-c", "print('boom'); raise SystemExit(3)"],
            "env": {}, "user": None, "cwd": "/",
        }
        steady = {
            "argv": [sys.executable, "-c", "import time; print('up', flush=True); time.sleep(30)"],
            "env": {}, "user": None, "cwd": "/",
        }
        starts = []
        original = subprocess.Popen

        def counting(*args, **kwargs):
            proc = original(*args, **kwargs)
            starts.append(args[0][-1][:12])
            return proc

        subprocess.Popen = counting
        try:
            threads = [
                threading.Thread(target=sup.run, args=("crashy", crash), daemon=True),
                threading.Thread(target=sup.run, args=("steady", steady), daemon=True),
            ]
            for t in threads:
                t.start()
            deadline = time.time() + 8
            while time.time() < deadline and starts.count("print('boom'") < 2:
                time.sleep(0.1)
        finally:
            subprocess.Popen = original
            sup.stopping.set()
            for proc in sup.children.values():
                if proc.poll() is None:
                    proc.kill()
        self.assertGreaterEqual(starts.count("print('boom'"), 2, "crashing child must be restarted")
        self.assertEqual(starts.count("import time;"), 1, "healthy sibling must not restart")

    def test_nginx_routes_to_supervised_ports(self):
        sup = load_supervisor()
        conf = (HERE / "kcq.nginx.conf").read_text()
        self.assertNotIn(".internal", conf.replace("nebutra-gateway.fly.dev", ""))
        for name in ("tdx", "python"):
            self.assertRegex(conf, rf"{name} {sup.PORTS[name]};")
        self.assertIn(f"127.0.0.1:{sup.PORTS['binance']}", conf)

    def test_ports_are_distinct_and_match_fly_checks(self):
        sup = load_supervisor()
        self.assertEqual(len(set(sup.PORTS.values())), 3)
        toml = (HERE / "kcq.toml").read_text()
        self.assertIn(f"port = {sup.PORTS['tdx']}", toml)
        self.assertIn(f"port = {sup.PORTS['python']}", toml)
        for name, spec in sup.SERVICES.items():
            if name != "nginx":
                self.assertEqual(spec["env"]["PORT"], sup.PORTS[name])


if __name__ == "__main__":
    unittest.main()
