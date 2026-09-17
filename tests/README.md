# 回帰テスト

テーマの通常利用にテスト環境は不要です。以下は開発時の確認用です。
すべて一時ディレクトリにサイトを生成し、テーマや `exampleSite` の内容を変更しません。

必要な環境は Hugo 0.166.0 以上と Python 3 です。ブラウザーテストには
Node.js、Playwright と Chromium、検索テストには Pagefind CLI も必要です。
検索は Pagefind 1.5.2 で検証しています。スクリプトによる自動インストールやダウンロードは行いません。

テーマのルートで実行します。

```sh
python3 scripts/check-social-image.py
python3 scripts/check-shortcode-anchors.py
node scripts/check-header.cjs
node scripts/check-search.cjs
```

- `check-social-image.py`: ページ添付画像とサイト共通画像の優先順位、日英、サブディレクトリ、別ホスト、画像名の特殊文字、クエリとフラグメント。
- `check-shortcode-anchors.py`: 記事・ホーム・お知らせ本文の明示ID、日本語ID、見出し重複、既存リンク、入れ子のShortcodes、コードの文字列維持、目次、リンクを省略した `media-intro`。
- `check-header.cjs`: 長い日本語・英語のブランド名、サイトタイトルへのフォールバック、ロゴ、320〜1440pxの表示、メニューとキーボード操作、JavaScriptなしのナビゲーション。
- `check-search.cjs`: 実際のPagefind索引での全角・半角・日本語検索、追加読み込み、IME、古い検索結果の破棄、お知らせの絞り込みとページ移動。

ブラウザーテストの実行環境が標準の場所と異なる場合は、以下を指定できます。

| 環境変数 | 指定するもの |
| --- | --- |
| `LUMEN_HUGO` | Hugoの実行ファイル |
| `LUMEN_PAGEFIND` | Pagefindの実行ファイル（検索テスト） |
| `LUMEN_PLAYWRIGHT` | `playwright` または `playwright-core` モジュールの場所 |
| `LUMEN_BROWSER` | Chromiumの実行ファイル。省略時はPlaywrightのChromium |

Pythonのテストには `--hugo /path/to/hugo` を指定できます。
見出しテストは `--keep` を付けると調査用サイトを保持します。
検索テストが失敗した場合は、調査用サイトを残してパスを表示します。
