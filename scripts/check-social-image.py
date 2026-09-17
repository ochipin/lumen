#!/usr/bin/env python3
"""Build isolated sites and check social-image URLs. Run with Python 3 + Hugo.

Uses only the standard library. The theme and its example site are not modified.
"""

import argparse
import base64
import json
import shutil
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit


PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="
)


class Metadata(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.images = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("property") == "og:image":
            self.images.append(attrs.get("content"))


def write_page(directory, image, files):
    directory.mkdir(parents=True, exist_ok=True)
    frontmatter = {"title": directory.name}
    if image is not None:
        frontmatter["params"] = {"image": image}
    (directory / "index.md").write_text(
        json.dumps(frontmatter, ensure_ascii=False) + "\n\n## Heading\n\nText.\n",
        encoding="utf-8",
    )
    for filename in files:
        target = directory / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(PNG)


def check_site(work, theme, hugo, mode):
    prefix = "/" if mode == "root" else "/review/"
    languages = ["ja"] if mode in ("root", "no-default") else ["ja", "en"]
    config = {
        "baseURL": "https://example.org" + prefix,
        "title": "Social image regression",
        "theme": theme.name,
        "themesDir": str(theme.parent),
        "defaultContentLanguage": "ja",
        "languages": {},
        "params": {"socialImage": "global.png" if mode != "no-default" else ""},
    }
    for lang in languages:
        language = {"contentDir": "content/" + lang, "locale": lang, "label": lang}
        if mode == "multihost":
            language["baseURL"] = "https://" + lang + ".example.org" + prefix
        config["languages"][lang] = language
    (work / "hugo.json").write_text(json.dumps(config), encoding="utf-8")
    (work / "static").mkdir()
    for filename in ("global.png", "fallback.png", "absolute.png"):
        (work / "static" / filename).write_bytes(PNG)

    expected = []
    for lang in languages:
        origin = "https://" + (lang + "." if mode == "multihost" else "") + "example.org"
        lang_path = "en/" if lang == "en" and mode != "multihost" else ""
        site_url = origin + prefix
        page_url = site_url + lang_path
        resource = "cover-" + lang + ".png"
        cases = [
            ("bundle", resource, [resource], page_url + "bundle/" + resource),
            ("dot-relative", "./" + resource, [resource], page_url + "dot-relative/" + resource),
            ("suffix", resource + "?v=2&size=large#crop%20one", [resource],
             page_url + "suffix/" + resource + "?v=2&size=large#crop%20one"),
            ("nested", "images/" + resource, ["images/" + resource],
             page_url + "nested/images/" + resource),
            ("glob-name", "cover[ab].png", ["cover[ab].png", "covera.png"],
             page_url + "glob-name/cover[ab].png"),
            ("encoded-name", "cover%20%E6%97%A5%E6%9C%AC%E8%AA%9E.png", ["cover 日本語.png"],
             page_url + "encoded-name/" + quote("cover 日本語.png")),
            ("missing-bundle", "fallback.png", [], site_url + "fallback.png"),
            ("root-path", "/absolute.png", ["absolute.png"], site_url + "absolute.png"),
            ("prefixed-path", prefix + "absolute.png", [], site_url + "absolute.png"),
            ("external", "https://cdn.example.net/image.png?v=1#x", [],
             "https://cdn.example.net/image.png?v=1#x"),
            ("protocol-relative", "//cdn.example.net/image.png", [],
             "//cdn.example.net/image.png"),
            ("site-default", None, ["global.png"],
             site_url + "global.png" if mode != "no-default" else None),
            ("empty-page", "", ["global.png"],
             site_url + "global.png" if mode != "no-default" else None),
        ]
        content = work / "content" / lang
        content.mkdir(parents=True)
        (content / "_index.md").write_text("---\ntitle: Home\n---\n", encoding="utf-8")
        for name, image, files, url in cases:
            write_page(content / name, image, files)
            output = work / "public"
            if mode == "multihost":
                output /= lang
            expected.append((output, lang_path + name + "/index.html", url))

    result = subprocess.run(
        [hugo, "--source", str(work), "--destination", str(work / "public"), "--panicOnWarning"],
        text=True, capture_output=True,
    )
    if result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    for output, filename, url in expected:
        actual = Metadata(output / filename).images
        assert actual == ([url] if url else []), (mode, filename, actual, url)
        if url and urlsplit(url).netloc in ("example.org", "ja.example.org", "en.example.org"):
            asset = unquote(urlsplit(url).path.removeprefix(prefix))
            assert (output / asset).is_file(), (mode, filename, "unpublished image", asset)
    return len(expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hugo", default="hugo", help="Hugo executable (0.166.0 or newer)")
    args = parser.parse_args()
    hugo = shutil.which(args.hugo)
    if not hugo:
        parser.error("Hugo executable not found: " + args.hugo)
    theme = Path(__file__).resolve().parents[1]
    total = 0
    with tempfile.TemporaryDirectory(prefix="lumen-social-image-") as temporary:
        for mode in ("root", "subpath", "multihost", "no-default"):
            work = Path(temporary) / mode
            work.mkdir()
            total += check_site(work, theme, hugo, mode)
    print(f"PASS: {total} social-image cases across four site configurations")


if __name__ == "__main__":
    main()
