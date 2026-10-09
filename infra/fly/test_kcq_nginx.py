"""Contract tests for the KCQ nginx routing (run: python3 -m unittest discover -s infra/fly -p 'test_kcq_*.py')."""
import pathlib
import re
import unittest

HERE = pathlib.Path(__file__).parent
SNIPPET = "include /etc/nginx/snippets/kcq-security-headers.conf;"


def locations(conf):
    """(matcher, body) for every top-level location block in the server block."""
    blocks = []
    for match in re.finditer(r"^\s*location\s+([^{]+)\{", conf, re.M):
        depth, start = 1, match.end()
        index = start
        while depth:
            depth += {"{": 1, "}": -1}.get(conf[index], 0)
            index += 1
        blocks.append((match.group(1).strip(), conf[start : index - 1]))
    return blocks


class NginxRoutesTest(unittest.TestCase):
    conf = (HERE / "kcq.nginx.conf").read_text()

    def test_every_location_that_sets_headers_keeps_the_security_snippet(self):
        # nginx drops inherited add_header directives once a location declares its own.
        blocks = locations(self.conf)
        self.assertGreater(len(blocks), 8)
        for matcher, body in blocks:
            if "add_header" in body:
                self.assertIn(SNIPPET, body, f"location {matcher} loses the security headers")
        self.assertIn(SNIPPET, self.conf.split("location", 1)[0], "server-level snippet")

    def test_spa_shell_only_serves_app_paths(self):
        shell = {matcher for matcher, body in locations(self.conf) if "/index.html" in body}
        self.assertEqual(shell, {"~ ^/app(/.*)?$", "~ ^/settings/profile/?$"})
        root = dict(locations(self.conf))["/"]
        self.assertIn("try_files $uri =404;", root)

    def test_public_pages_and_root_redirect(self):
        blocks = dict(locations(self.conf))
        self.assertIn("try_files $uri.html =404;", blocks["~ ^/(zh/)?(home|benchmark)$"])
        self.assertIn("return 302 /app$is_args$args;", blocks["= /"])
        self.assertRegex(self.conf, r"\n\s*absolute_redirect off;")


if __name__ == "__main__":
    unittest.main()
