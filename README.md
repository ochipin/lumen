# Lumen

白を基調に、ひとつの色からサイトの配色を作るHugoテーマです。記事、ドキュメント、広報サイトなどに使えます。コンテンツの階層から作るメガメニュー、本文の目次、組み合わせ可能なShortcodes、コードのコピー、Pagefindの検索画面を備えています。

**Hugo 0.166.0以上のStandard版**で動作します。SassやNode.jsはHugoのビルドには不要です。検索索引の生成にだけ、別途Pagefindを使います。言語の構成にはHugo標準の多言語機能を使い、共通UIの翻訳辞書は日本語と英語を同梱しています。

## はじめる

このディレクトリを自分のサイトの `themes/lumen/` に置き、`hugo.yaml` に次を記述します。

```yaml
baseURL: https://example.org/
locale: ja-JP
defaultContentLanguage: ja
title: サイトの名前
theme: lumen
params:
  BaseColor: '#F8BBD0'
  description: サイトの紹介文
```

`content/_index.md` にホームの本文、`content/about/index.md` などに記事を作り、`hugo server` で確認します。公開用の生成は `hugo` です。

動く例は [exampleSite](exampleSite/README.md) にあります。英語版（`/`）と日本語版（`/ja/`）を備えた架空の読み物サイト「Field Notes」で、テーマ以外のテンプレート・画像・データを必要としません。日本語の本文は `*.ja.md` に置き、言語切り替えで対応する英語ページへ移動できます。例のコピー方法、検索を含めた起動方法も同梱しています。

## 設定とデフォルト値

`baseURL`、`title`、`copyright`、`defaultContentLanguage`、`languages` はHugo標準の設定です。サイトの設定ファイルの対応する位置に記述します。Lumen独自の色・ブランド・検索の設定だけを `params` に記述します。独自パラメータを置くための `params` 自体はHugo標準の仕組みです。[Hugo公式：params](https://gohugo.io/configuration/params/)

テーマの [hugo.toml](hugo.toml) に任意パラメータの初期値をまとめています。サイト側の `hugo.yaml` / `hugo.toml` が優先されるため、変更したい項目だけ指定してください。`params` は通常、テーマの値と深くマージされます。`theme.toml` はテーマの紹介情報、`exampleSite/hugo.yaml` は設定例で、初期値を読み込ませるファイルではありません。[Hugo公式：設定のマージ](https://gohugo.io/configuration/introduction/#merge-configuration-settings)

| `params` の項目 | 初期値 | 未指定・空のときの表示や動作 |
| --- | --- | --- |
| `BaseColor` | `'#245CF2'` | 配色の基準色。空文字は無効なので、省略するか有効な色を指定 |
| `brand` | `''` | Hugoの `title` をヘッダーに表示 |
| `brandSubtitle` | `''` | サブタイトルを省略 |
| `logo` | `''` | ロゴ画像を省略し、サイト名を表示 |
| `logoAlt` | `''` | `brand`、または `title` をロゴの代替テキストに使用 |
| `footerBrand` | `''` | `brand`、または `title` をフッターに表示 |
| `organization` | `''` | 組織名を省略 |
| `description` | `''` | ページ固有の説明がなければ、メタ説明に `title` を使用 |
| `socialImage` | `''` | ページの `params.image` もなければ、SNS共有画像を省略 |
| `favicon` | `''` | ファビコンのリンクを省略 |
| `themeColor` | `''` | ブラウザー向けの `theme-color` メタ情報に `BaseColor` を使用 |
| `newsSection` | `'news'` | お知らせの記事を探すセクション名 |
| `pagefindPath` | `'/pagefind/'` | Pagefindが生成したファイルの配置先 |
| `searchURL` | `''` | 現在の言語の `type: search` ページを自動検出。なければ検索リンクを省略 |
| `searchPlaceholder` | `''` | 共通UIの翻訳辞書にある入力例を使用 |
| `searchLinks` | `[]` | 検索ページの案内リンクをメニューやセクションから生成 |

`params` に必須項目はありません。`brand` のようにサイトの値に依存する初期表示は、テンプレートで決定します。ページ側の `description` や `params.searchPlaceholder` などの指定は、対応するサイト共通値より優先します。`searchLinks` の項目は `name` と `url` を持つリストです。

言語とURLは、次の「言語」で説明するHugo標準の設定を使います。テーマの初期値には、`languages` や日本語・英語専用のURLを含めません。

## BaseColor

```yaml
params:
  BaseColor: '#F8BBD0' # ピンク
```

TOMLの場合:

```toml
[params]
BaseColor = '#F8BBD0'
```

`#RGB` または `#RRGGBB` を指定します。YAMLでは `#` がコメントとして扱われないよう、引用符で囲んでください。省略時は `#245CF2` です。例えば `#07143D` なら濃紺、`#2E7D32` なら緑に変わります。

タイトル帯は指定色を始点にしてグラデーションを作ります。帯の文字色は明るさに合わせて黒または白、リンク・ボタンは白い背景でも読める濃さに調整します。淡い背景、罫線、フッター、操作中の目次も同じ色から生成します。本文の背景は白です。

濃紺などの暗い色を指定した場合は、同系色の明るい終点を作り、右側へ色が広がる3段階のグラデーションにします。ボタンには同系色の鮮やかな色を使います。暗い指定色からさらに暗い色だけを作って、帯やボタンが一色に見えてしまうことを避けています。

色はHugoのビルド時にCSSへ出力します。ブラウザーで色を計算するJavaScriptは不要です。情報・警告などの囲み、ニュースの分類、構文ハイライトは意味を伝える色を保ちます。写真そのものの色は変わりません。

## コンテンツからメニューを作る

```text
content/
  _index.md
  guides/
    _index.md
    writing/
      _index.md
      first-page/index.md
      code/index.md
    publishing/
      _index.md
      checklist/index.md
```

入口の `content/guides/_index.md`:

```yaml
---
title: ガイド
description: 記事の書き方と公開方法を紹介します。
weight: 10
layout: navigation-section
params:
  icon: books
  navigation:
    main: true
---

## ガイドの使い方

このページの本文も普通のMarkdownで書けます。
```

配下のディレクトリが分類、記事がリンクになります。子ページにメニューへの登録を書く必要はありません。各ページの標準の `linkTitle`（省略時は `title`）、`description`、`weight` と、`params.icon` を使います。アイコンは `books`、`document`、`layers`、`network`、`history`、`user`、`server` などから選べます。[アイコンの実装](layouts/_partials/icon.html)

子ページの `params.navigation.main: false` で、そのページ以下を非表示にできます。入口をリンクだけにする場合は次のようにします。

```yaml
params:
  navigation:
    main:
      expand: false
```

PCではホバーで開き、親の文字をクリックするとまとめページへ移動します。隣の矢印は開閉専用です。スマートフォンでは矢印をタップして開閉します。キーボードのTab・Enter・Space・Escapeでも操作できます。

## フッター

ホームの `content/_index.md` で列の見出しを指定します。

```yaml
params:
  navigation:
    footerGroups:
      - id: guides
        name: ガイド
        weight: 10
      - id: site
        name: このサイトについて
        weight: 20
```

掲載する記事に `params.navigation.footer.guides: { weight: 10 }` などを指定します。複数列への登録もできます。`legal` は最下部のリンク用で、列の定義は不要です。外部リンクはホームの `params.navigation.externalLinks` に `name`・`url`・`group`・`weight` を記述できます。設定ファイルの `[menus]` は使用しません。

## ホームとShortcodes

`content/_index.md` の本文で部品の順序を決めます。`params.hero` を指定すると、大きなタイトル・説明・リンクを持つヒーローを表示できます。画像は任意です。`params.metrics` は任意の数値や短い文言の帯です。[ホームの実例](exampleSite/content/_index.md)

動画と説明文、動画2本、文章2列は `columns` / `column` で組み合わせられます。

```go-html-template
{{< columns align="center" >}}
  {{< column >}}
  ## プロジェクトの紹介

  本文は **Markdown** で書けます。
  {{< /column >}}
  {{< column >}}
    {{< video id="動画のYouTube ID" title="紹介動画" >}}
  {{< /column >}}
{{< /columns >}}
```

2つの `column` を入れ替えると表示順が変わります。スマートフォンでは記述順に縦に並びます。`ratio` は `equal` / `wide-left` / `wide-right`、`align` は `center` / `start` を指定できます。

| Shortcode | 内容 |
| --- | --- |
| `video` / `youtube` | クリック後にYouTubeプレーヤーを読み込む動画。ローカルの `thumbnail` も指定可能 |
| `video-intro` | 動画と紹介文の2列。`youtube`・`title`・`link`・`linkLabel` などを指定、`reverse=true` で逆順 |
| `quick-links` / `quick-link` | 案内リンク。`page="/guides"` でページの題名・説明を取得 |
| `research-cards` | `section="journal" count=3` のように任意のセクションの記事をカード表示 |
| `news-list` | お知らせを新しい日付順に表示。`count`・`title`・`link` などを指定 |
| `process` / `process-step` | 説明文と番号付きの手順 |
| `media-intro` | 画像と説明文の2列 |
| `research-figure` | 図全体・説明・出典の表示 |
| `info` / `notice` / `important` / `tips` / `note` | 青・黄・赤・緑・灰の囲み |

囲みの本文にもMarkdownが使えます。`title` でラベルを変更できます。

```go-html-template
{{< tips title="編集のヒント" >}}
長い本文は見出しで分けると、**目次**から探しやすくなります。
{{< /tips >}}
```

Shortcodesには `{{< ... >}}` 記法を使います。サイト全体の `markup.goldmark.renderer.unsafe` を有効にする必要はありません。[記事の実例](exampleSite/content/guides/writing/readable-pages.md)

## 記事・目次・コード

本文のH2・H3から目次を作ります。PCでは右側に追従し、現在の項目を丸印と太字で示します。画面幅1050px以下では本文の前で開閉します。フロントマターの `toc: false` で非表示にできます。見出しがなければ目次は表示しません。セクション本文でも同じ仕組みを使い、`showList: false` で配下の記事一覧を省略できます。

本文のフォントは同梱のNoto Sans JPです。外部のフォントサービスへ接続せず、必要な文字のサブセットだけを読み込みます。コードはConsolasを優先し、端末にない場合は別の等幅フォントへ切り替えます。

コードフェンスにはファイル名とオプションを指定できます。

````markdown
```python {filename="hello.py" hl_lines=[2]}
name = "World"
print(f"Hello, {name}!")
```
````

行番号と言語、コピーボタンを表示します。`linenos=false` で行番号を省略できます。構文ハイライトはビルド時に行います。[コードの実例](exampleSite/content/guides/writing/code-examples.md)

## お知らせ

`content/news/_index.md` と、配下に日付付きの記事を置きます。一覧は日付・カテゴリ・題名をコンパクトに並べ、キーワード・カテゴリで絞り込めます。`params.newsCategory` で表示カテゴリ、`params.newsCategoryStyle` で分類の色を指定できます。未指定なら記事の `category` を使います。[お知らせの実例](exampleSite/content/news/)

別のディレクトリをお知らせとして使う場合は `_index.md` に `type: news` を指定し、サイト設定の `params.newsSection` にそのディレクトリ名を指定します。

Lumenのお知らせ一覧は、指定がなければ全件を1ページに表示します。分割する一覧だけ、その `_index.md` でHugo標準の `layout` を指定します。

```toml
+++
title = 'お知らせ'
layout = 'paginated'
+++
```

HugoがLumenの `layouts/news/paginated.html` を選び、このテンプレートが `.Paginate` でページを生成します。`layout` はHugo標準の設定項目で、`paginated` はLumenが用意するテンプレート名です。指定を削除すると全件表示に戻ります。個別記事の `index.md` に設定する必要はありません。[Hugo公式：テンプレートの選択](https://gohugo.io/templates/lookup-order/#target-a-template)

件数とURLの形式は、サイトの `hugo.toml` / `hugo.yaml` にあるHugo標準の設定で指定します。

```toml
[pagination]
pagerSize = 10
path = 'page'
```

分割用テンプレートを選んだ一覧では、10件を超えた分が `/news/page/2/`、`/news/page/3/` …になります。サイト設定を省略した場合もHugo標準の10件・`page`です。`pagerSize = 1` は「1ページ1件」であり、無効化を意味しません。`_index.md` の `[pagination]` や `[params.pagination]` では上書きしません。

Hugo標準のフロントマターには一覧ごとの件数・ページ分割用URLを指定する項目がないため、それらはサイト（または言語）の設定で共通に管理します。一覧ごとに異なる件数が必要なら、別のテンプレートで `.Paginate` の第2引数に件数を渡します。[Hugo公式：Paginate](https://gohugo.io/methods/page/paginate/)

日本語のURL接頭辞を省略する構成、多言語の `/en/news/`、サブディレクトリ公開にも追従します。全件表示の一覧では検索結果もまとめて表示します。ページ数が減る変更の公開時は、以前の生成物が残らないように出力を更新してください。

分割する各一覧ページのHTMLには、そのページの件数分だけ記事の行を出力します。ページ番号は通常のリンクなので、JavaScriptが無効でも前後のページへ移動できます。キーワード・カテゴリで絞り込むときだけ、全お知らせの検索データを読み込みます。検索対象は現在のページに限らず、すべてのお知らせのタイトル・本文です。検索データの生成にPagefindやNode.jsは不要です。サイト全体の検索には、次節のPagefindを使います。

トップページの `news-list count=4` は引き続き最新4件を表示します。一覧の `pagination.pagerSize` とは独立しています。

## サイト内検索

任意のページに `type: search` を設定すると、サイト内検索画面になります。実在する検索ページをヘッダーから案内します。検索ページがないサイトには検索リンクを表示しません。

索引の生成はHugoとは別です。Node.jsを用意して実行します。

```sh
hugo
npx --yes pagefind@1.5.2 --site public
```

`public/pagefind/` を含む出力全体を公開します。検索は静的ファイルだけで動きます。タイトルと本文を検索し、共通のナビ・フッターを除外します。PDF自体の本文は索引化しません。検索を除外するページには `params.searchExclude: true` を指定できます。

検索ページの `params.searchPlaceholder` で入力例、`params.searchLinks` で検索以外の案内リンクを指定できます。未指定ならメニューやセクションから案内を生成します。Hugoの開発サーバーは索引を作らないため、索引生成後の `public/` をHTTPサーバーで配信すると検索も確認できます。[検索を含む起動手順](exampleSite/README.md#optional-full-site-search)

## 言語

Hugo標準の `defaultContentLanguage` と `languages` で設定します。テーマは言語を追加しません。日本語だけのサイトでも右上に言語メニューを表示し、現在の言語を確認できます。単一言語では別言語へのリンクは表示されません。

日本語だけの場合の設定例です。記事は従来どおり `content/` に置けます。

```yaml
defaultContentLanguage: ja
defaultContentLanguageInSubdir: false
languages:
  ja:
    label: 日本語
    locale: ja-JP
```

複数言語では、言語ごとに `contentDir` を指定できます。

```yaml
defaultContentLanguage: ja
defaultContentLanguageInSubdir: false
languages:
  ja:
    label: 日本語
    locale: ja-JP
    contentDir: content/ja
    weight: 1
  en:
    label: English
    locale: en-US
    contentDir: content/en
    weight: 2
    params:
      organization: Example Research Group
  fr:
    label: Français
    locale: fr-FR
    contentDir: content/fr
    weight: 3
```

この設定では `content/ja/about/_index.md` の公開URLは `/about/`、英語は `/en/about/`、フランス語は `/fr/about/` です。`defaultContentLanguageInSubdir: true` にすると、日本語にも `/ja/` が付きます。ドイツ語・中国語・韓国語・ロシア語なども同じ仕組みで追加できます。`label` が切り替えに表示する名称、`locale` が言語タグです。`label` を省略した場合、同梱辞書の言語名（日・英）、なければ言語コードを表示します。[Hugo公式：言語設定](https://gohugo.io/configuration/languages/)

同じ相対パスのページをHugoが翻訳として関連付けます。パスが異なる場合は各ページのフロントマターに同じ `translationKey` を指定できます。本文の翻訳はそれぞれの記事として用意してください。翻訳記事がない言語は、その言語のホームへのリンクと「ホーム」の注記を表示します。記事同士の `hreflang` には実在する翻訳だけを使います。ホームは現在の言語の `.Site.Home`、翻訳記事は `.AllTranslations` などのHugoのページ情報から取得します。[Hugo公式：多言語コンテンツ](https://gohugo.io/content-management/multilingual/)

言語ごとに組織名・紹介文・SNS共有画像を変える場合は、上記の `languages.en.params.organization` と同様に、同じパラメータ名を各言語の `params` に記述します。`organizationEn`、`homeURLEn`、`japaneseURL`、`englishURL`、`searchURLEn` といった日英専用パラメータはテーマでは使用しません。ホームのURLを手書きする `homeURL` も不要です。検索ページは言語ごとに自動検出し、必要なときだけ各言語の `params.searchURL` で対象を指定します。

「検索」「目次」などの共通UIは [i18n](i18n/) の辞書から取得します。日本語・英語以外の表示文言を用意する場合は、テーマの辞書と同じキーを使い、サイト側の `i18n/fr.yaml` などに翻訳を追加してください。未訳のキーはHugo標準どおり `defaultContentLanguage` の辞書へフォールバックします。そこにもないキーは空になるため、新しい標準言語を選ぶ場合は、その言語のUI辞書も用意してください。辞書の追加は記事の自動翻訳を行いません。

## 拡張とライセンス

`baseURL` に `/blog/` のような公開パスを含めた構成にも対応します。サイト固有のレイアウトや既存URLの変換は、利用するプロジェクトの `layouts/` でテーマを上書きしてください。テーマの `layouts/_partials/site/metadata.html` はサイト固有情報を追加する拡張用の窓口です。

テーマのコードとサンプルは [MIT License](LICENSE) です。フォントには別途SIL Open Font License 1.1が適用されます。[Noto Sans JPのライセンスと出典](assets/fonts/noto-sans-jp/README.md)を参照してください。
