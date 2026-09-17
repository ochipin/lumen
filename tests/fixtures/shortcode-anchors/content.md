[Outside custom](#custom-heading)
[Outside nested](#nested-heading)
[Outside Japanese](#日本語の見出し)
[Outside setext](#setext-heading)

## Shared

Normal Markdown keeps its usual identifier.

{{< tips >}}
## Shared

[Scoped shared](#shared)

## Custom heading {#custom-heading .preserved}

[Scoped custom](#custom-heading)

### Japanese heading {id="日本語の見出し"}

Setext heading {#setext-heading}
--------------------------------

{{< info >}}
### Nested heading {#nested-heading}

[Nested custom](#nested-heading)

```markdown
{{</* note */>}}
## This is an example {#example-heading}
{{</* /note */>}}
```
{{< /info >}}
{{< /tips >}}

{{< columns >}}
{{< column >}}
## Repeated

[First repeated](#repeated)
{{< /column >}}
{{< column >}}
## Repeated

[Second repeated](#repeated)
{{< /column >}}
{{< /columns >}}

{{< media-intro title="No action" image="/wide.svg" >}}
Body without optional link parameters.
{{< /media-intro >}}

{{< media-intro title="With action" image="/wide.svg" link="/destination/" linkLabel="Open destination" >}}
Body with a configured action.
{{< /media-intro >}}
