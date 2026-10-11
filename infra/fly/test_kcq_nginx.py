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
        self.assertIn("try_files $uri.html =404;", blocks["~ ^/(zh/)?(home|benchmark|investors)$"])
        self.assertIn("return 302 /app$is_args$args;", blocks["= /"])
        self.assertRegex(self.conf, r"\n\s*absolute_redirect off;")

    def test_unknown_paths_get_a_real_404_page_per_locale(self):
        self.assertIn("error_page 404 $kcq_not_found;", self.conf)
        self.assertRegex(
            self.conf,
            r"map \$uri \$kcq_not_found \{\s*~\^/zh/docs\(/\|\$\) /zh/docs/404\.html;\s*"
            r"~\^/docs\(/\|\$\) /docs/404\.html;\s*~\^/zh/ /zh/404\.html;\s*default /404\.html;",
        )
        body = dict(locations(self.conf))["~ ^/(zh/)?(docs/)?404\\.html$"]
        self.assertIn("internal;", body)

    def test_docs_are_extensionless_pages_with_one_url_each(self):
        blocks = locations(self.conf)
        matchers = [matcher for matcher, _ in blocks]
        pages = dict(blocks)["~ ^/(zh/)?docs(/[^.]*)?$"]
        self.assertIn("try_files $uri.html =404;", pages)
        self.assertIn('add_header Cache-Control "no-cache" always;', pages)
        # Trailing slash and .html both redirect to the bare path; the internal 404 must be matched
        # first, since error_page re-enters location matching with /docs/404.html.
        internal = matchers.index("~ ^/(zh/)?(docs/)?404\\.html$")
        html = matchers.index("~ ^/((?:zh/)?docs(?:/[^.]*)?)\\.html$")
        self.assertLess(internal, html)
        self.assertIn("return 301 /$1$is_args$args;", dict(blocks)["~ ^/((?:zh/)?docs(?:/[^.]*?)?)/$"])
        # OG images are matched before the immutable asset rule.
        self.assertLess(matchers.index("~ ^/docs/og/.+\\.png$"), matchers.index("~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp)$"))


    def test_only_prerendered_public_files_are_edge_cacheable(self):
        snippet = (HERE / "kcq.security-headers.conf").read_text()
        self.assertIn("add_header Cloudflare-CDN-Cache-Control $kcq_edge_cache always;", snippet)
        body = re.search(r"map \$uri \$kcq_edge_cache \{(.*?)\n\}", self.conf, re.S).group(1)
        rules = [(pattern.lstrip("~"), value.strip('"')) for pattern, value in re.findall(r"^\s*(\S+)\s+(\"[^\"]*\");", body, re.M)]
        self.assertEqual(rules[0], ("default", ""))

        def edge(uri):
            # nginx regex maps: first match in order wins.
            return next((value for pattern, value in rules[1:] if re.search(pattern, uri)), "")

        # try_files has already rewritten /home to /home.html when headers are sent.
        for uri in ("/home.html", "/zh/home.html", "/benchmark.html", "/investors.html", "/zh/investors.html",
                    "/llms.txt", "/robots.txt", "/sitemap.xml", "/docs/guides/themes.html", "/zh/docs.html"):
            self.assertRegex(edge(uri), r"^max-age=\d+, stale-while-revalidate=\d+, stale-if-error=\d+$", uri)
        for uri in ("/index.html", "/404.html", "/zh/404.html", "/docs/404.html", "/app", "/settings/profile",
                    "/market/byok/connections", "/market/tdx/api/v1/market-data/sources/gotdx/stream",
                    "/assets/index-abc123.js", "/docs/_next/static/chunk.js", "/og/home.png", "/health"):
            self.assertEqual(edge(uri), "", uri)

        blocks = dict(locations(self.conf))
        browser = 'add_header Cache-Control "public, max-age=0, must-revalidate" always;'
        self.assertIn(browser, blocks["~ ^/(zh/)?(home|benchmark|investors)$"])
        self.assertIn(browser, blocks["/"])
        for matcher in ("~ ^/app(/.*)?$", "~ ^/settings/profile/?$"):
            self.assertIn('add_header Cache-Control "no-cache" always;', blocks[matcher])
        for matcher, block in blocks.items():
            if matcher.startswith(("~ ^/market", "/market/")) and "proxy_pass" in block:
                self.assertRegex(block, r'Cache-Control "(private, )?no-store"', matcher)
            self.assertNotIn("Set-Cookie", block, matcher)

if __name__ == "__main__":
    unittest.main()
