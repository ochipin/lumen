---
title: Explain an idea with a small code example
linkTitle: Code examples
description: A filename, readable syntax, and a copy button keep an example practical.
weight: 20
---

A short example can make an abstract explanation concrete. Tell the reader what it does and keep the surrounding instructions close by.

## Count the things you have collected

This Python example counts observations by category. Save it as `observations.py` and adapt the list to your own notes.

```python {filename="observations.py"}
from collections import Counter

observations = ["bird", "leaf", "bird", "cloud", "leaf", "bird"]
counts = Counter(observations)

for name, count in sorted(counts.items()):
    print(f"{name}: {count}")
```

### Explain what the output means

The program reports how many times each label appears. It does not tell you why a pattern exists; that is a question for the next observation.

```text {filename="output.txt" linenos=false}
bird: 3
cloud: 1
leaf: 2
```

## Draw attention to a particular step

Use a highlighted line when it helps readers find the part being discussed.

```python {filename="normalize.py" hl_lines=[2]}
label = "  Cloud  "
normalized = label.strip().lower()
print(normalized)
```

{{< note title="Keep examples reproducible" >}}
Record the input and the expected result. Another reader should be able to repeat the example and compare what happens.
{{< /note >}}
