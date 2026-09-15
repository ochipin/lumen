# Field Notes — Lumen example site

Field Notes is a fictional publication with English and Japanese editions. All example text is original demo content; no real institution, person, event, or research result is represented. Fonts are bundled with the theme. The example needs no images, external font service, migration data, or site-specific scripts.

日本語版は `/ja/`、英語版は `/` で表示します。ヘッダーの言語切り替えで、同じページの日本語版・英語版を行き来できます。日本語の記事は `content/` 配下の `*.ja.md` にあります。

The example's `hugo.yaml` contains site choices, not theme defaults. Lumen supplies optional defaults from its own `hugo.toml`; the project overrides only the values it needs. The site title also supplies the header brand, and the search page is discovered automatically.

## Run the example as its own site

From the Lumen theme directory, copy the example and the theme into a separate project:

```sh
mkdir -p ../field-notes/themes
cp -R exampleSite/. ../field-notes/
cp -R . ../field-notes/themes/lumen
cd ../field-notes
hugo server
```

Open the address printed by Hugo for English, or append `ja/` to open Japanese (normally `http://localhost:1313/ja/`). To create the public files, run:

```sh
hugo
```

Hugo alone builds every page and the local font files. Node.js is not required for the site build. Use the Hugo version required by the theme; this example was checked with Hugo 0.166.0.

## Change the accent color

The example currently uses a navy seed in `hugo.yaml`:

```yaml
params:
  BaseColor: '#07143D'
```

Change that value to `'#F8BBD0'` for light pink, or `'#245CF2'` for brighter blue, and rebuild. The theme derives the colors used for navigation, headings, links, controls, and background surfaces. Informational callouts and syntax highlighting keep their semantic colors.

## Languages

The example uses Hugo's standard language configuration:

```yaml
defaultContentLanguage: en
defaultContentLanguageInSubdir: false
languages:
  en:
    label: English
    locale: en-US
    weight: 10
  ja:
    label: 日本語
    locale: ja-JP
    weight: 20
```

English pages are published at the root, without an `/en/` prefix; Japanese pages are published under `/ja/`. Every example content page has a Japanese counterpart. Hugo pairs them by filename, so the language control links to the corresponding translated page rather than returning to its homepage:

```text
content/
  _index.md                  # English home
  _index.ja.md               # Japanese home
  about.md                   # /about/
  about.ja.md                # /ja/about/
  guides/
    _index.md                # English section
    _index.ja.md             # Japanese section
```

Files without a language suffix belong to the default language, English in this example. `*.ja.md` files contain the Japanese titles, descriptions, navigation labels, and bodies. Literal internal links in those files use `/ja/` too; shortcode page references such as `page="/guides"` resolve within the current language. The site's description, subtitle, organization, and copyright are localized in `hugo.yaml`. The theme itself does not define site languages.

To make Japanese the default later, first give the existing unsuffixed English files an `.en.md` suffix, then change `defaultContentLanguage` to `ja` and update literal links to match Japanese at `/` and English at `/en/`.

To add another language, add an entry under `languages` and matching translated files. Localize custom site values under `languages.<language>.params`; no English-specific URL or organization parameters are needed. Shared interface strings live in the theme's `i18n` dictionaries. Add further translations in the project's `i18n/` directory. See the [theme documentation](../README.md#言語) for a Japanese, English, and French example.

## What to edit

- `content/_index.md` contains the hero, homepage blocks, and footer group labels.
- `content/guides/_index.md` opts the Guides section into the main navigation. Its child directories become menu groups, and their pages become links.
- `content/guides/writing/readable-pages.md` demonstrates the five callouts, two columns, and an automatically generated table of contents.
- `content/guides/writing/code-examples.md` demonstrates code filenames, line numbers, a highlighted line, and copying code.
- `content/journal/` holds ordinary articles. The homepage cards read from this section.
- `content/news/` holds announcements with dates and categories. The Updates page provides keyword and category filtering.

The adjacent `.ja.md` files provide Japanese versions of all the content above, including the five callouts, code examples, news categories, and search page.

The root Guides section uses `params.navigation.main`; the Journal and Updates sections use `expand: false` to keep their articles out of the header menu. Footer placement belongs to each page's `params.navigation.footer` metadata. The configuration file contains no menu URL lists.

## Optional full-site search

The search page is included, but its index is a separate build step. First build with Hugo, then generate the Pagefind index:

```sh
hugo
npx --yes pagefind@1.5.2 --site public
```

This optional indexing command requires Node.js and downloads Pagefind the first time it runs. Publish the complete `public/` directory, including `public/pagefind/`. Search then runs from those static files in the browser.

For a local search preview after indexing, serve the generated output with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory public
```

Without an index, the search page explains that search is unavailable; the rest of the site remains usable. The regular Hugo development server does not automatically create a Pagefind index. If you do not want search, remove `content/search.md` and `content/search.ja.md`; each language's header will omit its search link.
