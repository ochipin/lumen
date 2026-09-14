# Noto Sans JP, locally served

This directory contains the complete 124-subset WOFF2 distribution returned by
the official Google Fonts CSS API for Noto Sans JP, version `v56`, normal style,
variable weight `100–900`. The original `unicode-range` declarations and their
order are retained in `assets/css/fonts.css`. Japanese, Latin, extended Latin,
Cyrillic, and Vietnamese subsets are included.

The fonts total **5,223,320 bytes (4.98 MiB)**. The Latin subset is 24,840 bytes.
Browsers download only subsets needed for text on the current page. No font is
preloaded, and no request to Google Fonts is made by the generated site.
`font-display: swap` keeps text visible while local font files are loading.

## Sources and licence

- CSS request: <https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap>
- Official specimen: <https://fonts.google.com/noto/specimen/Noto+Sans+JP>
- Official font repository: <https://github.com/google/fonts/tree/main/ofl/notosansjp>
- Licence source: <https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/OFL.txt>

The fonts are distributed under the **SIL Open Font License 1.1**, included
unchanged as `OFL.txt`. Font bytes have not been modified; filenames were renamed
locally to identify the version and subset. `manifest.json` records every exact
download URL, byte count, and SHA-256 digest, plus the source stylesheet digest.
It is the pinned source record for reproducing this distribution.

The CSS API was requested with a modern Chromium user agent so it supplied
variable WOFF2 subsets, without a `text=` restriction. Restricting the download
to today's article text would omit characters needed by future articles.

## Hugo integration

The site head calls:

```go-html-template
{{ partialCached "fonts.html" . site.BaseURL }}
```

The partial processes `assets/css/fonts.css` with `resources.ExecuteAsTemplate`.
Each font uses its Hugo resource's fingerprinted `.RelPermalink`, so the same
theme works at a domain root or under a subdirectory. The generated stylesheet
is minified and fingerprinted as well. Accessing the licence resource from the
stylesheet comment also publishes `OFL.txt` alongside the fonts.

Font-family selection remains in the site's normal CSS. This package supplies
Noto Sans JP only; it does not redistribute Consolas or other system fonts.
