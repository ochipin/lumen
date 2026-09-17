#!/usr/bin/env python3
"""Build real Hugo pages and check stable shortcode bookmarks and optional CTAs."""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.parse import unquote


class Element:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []

    def text(self):
        return ''.join(child.text() if isinstance(child, Element) else child for child in self.children)

    def all(self, tag=None):
        for child in self.children:
            if isinstance(child, Element):
                if tag is None or child.tag == tag:
                    yield child
                yield from child.all(tag)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Element('document')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(element)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(element)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def verify(file, offset, home):
    html = file.read_text()
    document = Document(html).root
    elements = list(document.all())
    identifiers = [element.attrs['id'] for element in elements if element.attrs.get('id')]
    assert all(count == 1 for count in Counter(identifiers).values()), ('duplicate ids', file, Counter(identifiers))
    by_id = {element.attrs['id']: element for element in elements if element.attrs.get('id')}
    links = {element.text().strip(): element for element in document.all('a')}
    assert ' data-lumen-original-id=' not in html, ('internal metadata leaked', file)
    assert 'example-heading' not in by_id, ('fenced example received an anchor', file)
    for original in ['custom-heading', 'nested-heading', '日本語の見出し', 'setext-heading']:
        alias = by_id[original]
        assert alias.tag == 'span' and alias.parent.tag in {'h2', 'h3'}, (original, 'bookmark is outside its heading')
        assert alias.parent.attrs['id'].startswith('block-'), original
    custom = by_id['custom-heading'].parent
    assert custom.attrs['id'] == f'block-tips-{offset}-custom-heading', ('existing scoped URL changed', file)
    assert custom.attrs.get('class') == 'preserved'
    assert by_id['shared'].tag == 'h2', ('ordinary Markdown heading was replaced', file)
    assert 'repeated' not in by_id, ('ambiguous original id must not be exposed', file)
    for title in ['Outside custom', 'Outside nested', 'Outside Japanese', 'Outside setext', 'Scoped shared', 'Scoped custom', 'Nested custom', 'First repeated', 'Second repeated']:
        href = links[title].attrs['href']
        assert unquote(href[1:]) in by_id, (title, href)
    assert links['Scoped custom'].attrs['href'] == '#' + custom.attrs['id']
    assert links['First repeated'].attrs['href'] != links['Second repeated'].attrs['href']
    assert links['Scoped shared'].attrs['href'] != '#shared'
    code = next(element for element in document.all('template') if 'code-source' in element.attrs.get('class', '').split())
    assert code.text() == '{{< note >}}\n## This is an example {#example-heading}\n{{< /note >}}', ('copy source changed', file, code.text())
    assert not list(code.all('div')), ('literal shortcode executed inside code', file)
    if not home:
        toc = [element for element in document.all('a') if 'toc-link' in element.attrs.get('class', '').split()]
        assert toc
        assert all(unquote(link.attrs['href'][1:]) in by_id for link in toc), ('broken TOC', file)
    sections = [element for element in document.all('section') if 'explainer-section' in element.attrs.get('class', '').split()]
    assert len(sections) == 2
    assert not list(sections[0].all('a')), ('missing optional link creates a button', file)
    action = list(sections[1].all('a'))
    assert len(action) == 1 and action[0].attrs['href'] == '/review/destination/'
    assert action[0].text().strip() == 'Open destination'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hugo', default=os.environ.get('LUMEN_HUGO', 'hugo'))
    parser.add_argument('--keep', action='store_true', help='Retain the temporary Hugo site for browser inspection')
    args = parser.parse_args()
    theme = Path(__file__).resolve().parent.parent
    work = Path(tempfile.mkdtemp(prefix='lumen-shortcode-anchors-'))
    try:
        (work / 'content/news').mkdir(parents=True)
        (work / 'static').mkdir()
        (work / 'static/wide.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="1000"><rect width="8000" height="1000" fill="lightblue"/></svg>')
        source = (theme / 'tests/fixtures/shortcode-anchors/content.md').read_text()
        for shifted in [False, True]:
            offset = int(shifted)
            prefix = '{{< note >}}An unrelated shortcode before the content.{{< /note >}}\n\n' if shifted else ''
            (work / 'content/probe.md').write_text('---\ntitle: Bookmark probe\n---\n\n' + prefix + source)
            (work / 'content/_index.md').write_text('---\ntitle: Home probe\n---\n\n' + prefix + source)
            (work / 'content/news/_index.md').write_text('---\ntitle: News probe\n---\n\n' + prefix + source)
            for unsafe in [False, True]:
                config = {'baseURL': 'https://lumen.test/review/', 'title': 'Shortcode regression', 'locale': 'en-US', 'theme': theme.name, 'themesDir': str(theme.parent), 'markup': {'goldmark': {'renderer': {'unsafe': unsafe}}}}
                (work / 'hugo.json').write_text(json.dumps(config))
                destination = work / f'public-{offset}-{int(unsafe)}'
                subprocess.run([args.hugo, '--source', str(work), '--destination', str(destination), '--cacheDir', str(work / 'cache'), '--minify', '--panicOnWarning', '--quiet'], check=True)
                for home in [False, True]:
                    verify(destination / ('index.html' if home else 'probe/index.html'), offset, home)
                verify(destination / 'news/index.html', offset, True)
                print(f'PASS shifted={shifted} unsafe={unsafe}: article + home + news bookmarks, collisions, scoped links, nested literal/code, TOC, optional media action')
    finally:
        if args.keep:
            print(f'Fixture retained at {work}')
        else:
            shutil.rmtree(work)


if __name__ == '__main__':
    main()
