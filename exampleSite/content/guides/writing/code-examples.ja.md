---
title: 短いコード例で考え方を伝える
linkTitle: コード例
description: ファイル名、読みやすいコード表示、コピーボタンがあると、例を試しやすくなります。
weight: 20
---

短い例を添えると、抽象的な説明を具体的に伝えられます。何をするコードなのかを説明し、実行に必要な手順も近くに書きましょう。

## 集めたものを数える

このPythonの例では、観察したものを種類ごとに数えます。`observations.py`として保存し、リストの内容を自分の記録に合わせて変えてみてください。

```python {filename="observations.py"}
from collections import Counter

observations = ["bird", "leaf", "bird", "cloud", "leaf", "bird"]
counts = Counter(observations)

for name, count in sorted(counts.items()):
    print(f"{name}: {count}")
```

### 出力の意味を説明する

このプログラムは、それぞれの名前が何回現れるかを表示します。なぜその傾向があるのかまでは分かりません。それは、次の観察で考えることです。

```text {filename="output.txt" linenos=false}
bird: 3
cloud: 1
leaf: 2
```

## 注目してほしい処理を示す

説明している箇所を見つけやすくなる場合は、該当する行を強調表示しましょう。

```python {filename="normalize.py" hl_lines=[2]}
label = "  Cloud  "
normalized = label.strip().lower()
print(normalized)
```

{{< note title="同じ結果を確かめられる例にする" >}}
入力と期待する結果を記録しましょう。ほかの人が同じ例を実行し、結果を比べられるようにします。
{{< /note >}}
