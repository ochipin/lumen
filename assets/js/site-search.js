(() => {
  "use strict";

  const root = document.querySelector("#site-search");
  if (!root) return;
  const form = root.querySelector("#site-search-form");
  const input = root.querySelector("#site-search-input");
  const clear = root.querySelector("#site-search-clear");
  const status = root.querySelector("#site-search-status");
  const list = root.querySelector("#site-search-results");
  const more = root.querySelector("#site-search-more");
  const error = root.querySelector("#site-search-error");
  const retry = root.querySelector("#site-search-retry");
  if (![form, input, clear, status, list, more, error, retry].every(Boolean)) return;

  let language = root.dataset.language || document.documentElement.lang || "en";
  try { new Intl.NumberFormat(language); } catch (_) { language = "en"; }
  const format = (message, values) => message.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
  const pageSize = 10;
  const timeoutMs = 20000;
  const moreLabel = more.textContent;
  const base = new URL(root.dataset.baseUrl || "/", window.location.origin);
  const bundle = new URL(root.dataset.bundlePath || "/pagefind/", window.location.origin);
  const languageLinks = [...document.querySelectorAll(".language-options a[data-language-search]")].map(link => ({
    link, url: new URL(link.href, window.location.href),
  }));
  const messages = {
    idle: status.dataset.idle || "Enter keywords to search this site.",
    composing: root.dataset.composing || "Finish entering your keywords to search.",
    loading: root.dataset.loading || "Searching…",
    more: root.dataset.more || "Loading more results…",
    zero: query => format(root.dataset.zero || "No pages match “{query}”. Try another keyword.", { query }),
    count: (query, total, shown) => format(root.dataset.count || "{total} results for “{query}” ({shown} shown).", {
      query, total: total.toLocaleString(language), shown: shown.toLocaleString(language),
    }),
    untitled: root.dataset.untitled || "Untitled page",
  };

  let generation = 0;
  let timer;
  let composing = false;
  let loadingMore = false;
  let modulePromise;
  let moduleInstance;
  let moduleAttempt = 0;
  let active = { query: "", results: [], shown: 0 };
  let failed = { query: "", visible: pageSize };

  function timed(promise) {
    let timeout;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Search request timed out")), timeoutMs); }),
    ]).finally(() => clearTimeout(timeout));
  }

  function client() {
    if (!modulePromise) {
      const attempt = moduleAttempt;
      const url = new URL("pagefind.js", bundle);
      // A failed module import can be cached by the browser. Explicit retries
      // use a new module URL and a fresh Pagefind instance.
      if (moduleAttempt) url.searchParams.set("retry", String(moduleAttempt));
      const pending = (async () => {
        const pagefind = await import(url.href);
        await pagefind.options({ baseUrl: base.pathname, excerptLength: 30 });
        if (attempt === moduleAttempt) moduleInstance = pagefind;
        return pagefind;
      })().catch(reason => {
        if (modulePromise === pending) {
          modulePromise = undefined;
          moduleAttempt += 1;
        }
        throw reason;
      });
      modulePromise = pending;
    }
    return timed(modulePromise);
  }

  function resetClient() {
    const old = moduleInstance;
    modulePromise = undefined;
    moduleInstance = undefined;
    moduleAttempt += 1;
    if (old && typeof old.destroy === "function") {
      // Cleanup is independent of the replacement search. Failure to dispose
      // an interrupted worker must not prevent the user from retrying.
      Promise.resolve().then(() => old.destroy()).catch(() => {});
    }
  }

  function query() {
    return input.value.trim();
  }

  function syncURL(value) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    for (const entry of languageLinks) {
      const destination = new URL(entry.url);
      if (value) destination.searchParams.set("q", value);
      else destination.searchParams.delete("q");
      entry.link.href = destination.origin === window.location.origin
        ? destination.pathname + destination.search + destination.hash
        : destination.href;
    }
  }

  function busy(value) {
    list.setAttribute("aria-busy", String(value));
    more.disabled = value;
    more.textContent = value ? messages.more : moreLabel;
  }

  function invalidate() {
    generation += 1;
    clearTimeout(timer);
    loadingMore = false;
    return generation;
  }

  function clearResults() {
    list.replaceChildren();
    more.hidden = true;
    error.hidden = true;
    busy(false);
  }

  function showIdle() {
    active = { query: "", results: [], shown: 0 };
    clearResults();
    root.dataset.state = "idle";
    status.textContent = messages.idle;
  }

  function showError(token, desiredVisible) {
    if (token !== generation) return;
    loadingMore = false;
    busy(false);
    more.hidden = true;
    error.hidden = false;
    root.dataset.state = "error";
    failed = { query: active.query, visible: desiredVisible };
    // A failed fetch is not an empty result set. Keep already-loaded results
    // during pagination failures, and let the alert explain the failed action.
    status.textContent = active.shown ? messages.count(active.query, active.results.length, active.shown) : "";
  }

  function localHref(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Missing search result URL");
    const url = new URL(value, base);
    const prefix = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
    if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)
      || url.username || url.password || !url.pathname.startsWith(prefix)) {
      throw new Error("Search result URL is outside this site");
    }
    return url.pathname + url.search + url.hash;
  }

  function excerptFragment(value) {
    const fragment = document.createDocumentFragment();
    const stack = [fragment];
    const decoder = document.createElement("textarea");
    // Pagefind escapes excerpt text before adding <mark>. Only those exact
    // highlight tags become elements; arbitrary tags/attributes stay text.
    for (const token of String(value || "").split(/(<\/?mark>)/gi)) {
      if (token.toLowerCase() === "<mark>") {
        const highlight = document.createElement("mark");
        stack[stack.length - 1].append(highlight);
        stack.push(highlight);
      } else if (token.toLowerCase() === "</mark>") {
        if (stack.length > 1) stack.pop();
      } else {
        decoder.innerHTML = token.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        stack[stack.length - 1].append(document.createTextNode(decoder.value));
      }
    }
    return fragment;
  }

  function resultElement(result) {
    const item = document.createElement("li");
    item.className = "site-search-result";
    const heading = document.createElement("h2");
    const link = document.createElement("a");
    link.href = localHref(result.url);
    link.textContent = String(result.meta?.title || messages.untitled);
    heading.append(link);
    const excerpt = document.createElement("p");
    excerpt.append(excerptFragment(result.excerpt));
    item.append(heading, excerpt);
    return item;
  }

  function showCount() {
    const total = active.results.length;
    status.textContent = total ? messages.count(active.query, total, active.shown) : messages.zero(active.query);
    root.dataset.state = total ? "results" : "empty";
    more.hidden = active.shown >= total;
    error.hidden = true;
    busy(false);
  }

  async function loadBatch(results, start, end) {
    const data = await timed(Promise.all(results.slice(start, end).map(result => result.data())));
    // Build offscreen first so a failed/invalid batch cannot partially append.
    return data.map(resultElement);
  }

  async function search(value, token, desiredVisible = pageSize) {
    if (token !== generation || composing) return;
    active = { query: value, results: [], shown: 0 };
    clearResults();
    if (!value) {
      showIdle();
      return;
    }
    busy(true);
    root.dataset.state = "loading";
    status.textContent = messages.loading;
    try {
      const pagefind = await client();
      if (token !== generation) return;
      // Let Pagefind apply the same normalization as its index. Normalizing
      // only the query can hide matching full-width text in the source pages.
      const response = await timed(pagefind.search(value));
      if (token !== generation) return;
      if (!response || !Array.isArray(response.results)) throw new Error("Invalid search response");
      const session = { query: value, results: response.results, shown: 0 };
      const end = Math.min(desiredVisible, session.results.length);
      const elements = [];
      // A pagination retry restores the previously visible results and the
      // failed page, while fetching no more than ten result fragments at once.
      for (let start = 0; start < end; start += pageSize) {
        elements.push(...await loadBatch(session.results, start, Math.min(start + pageSize, end)));
        if (token !== generation) return;
      }
      active = session;
      active.shown = end;
      list.replaceChildren(...elements);
      showCount();
    } catch (_) {
      showError(token, desiredVisible);
    }
  }

  function schedule(immediate = false, desiredVisible = pageSize) {
    const token = invalidate();
    const value = query();
    syncURL(value);
    clear.disabled = !input.value;
    clearResults();
    if (!value) {
      showIdle();
      return;
    }
    root.dataset.state = "loading";
    status.textContent = messages.loading;
    if (immediate) search(value, token, desiredVisible);
    else timer = setTimeout(() => search(value, token, desiredVisible), 250);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!composing) schedule(true);
  });
  input.addEventListener("input", event => {
    if (!composing && !event.isComposing) schedule();
  });
  input.addEventListener("compositionstart", () => {
    composing = true;
    invalidate();
    clearResults();
    root.dataset.state = "composing";
    status.textContent = messages.composing;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    schedule();
  });
  clear.addEventListener("click", () => {
    composing = false;
    input.value = "";
    schedule(true);
    input.focus();
  });
  more.addEventListener("click", async () => {
    if (loadingMore || composing || active.shown >= active.results.length) return;
    const token = generation;
    const session = active;
    const end = Math.min(session.shown + pageSize, session.results.length);
    loadingMore = true;
    busy(true);
    error.hidden = true;
    root.dataset.state = "loading-more";
    status.textContent = messages.more;
    try {
      const elements = await loadBatch(session.results, session.shown, end);
      if (token !== generation || active !== session) return;
      list.append(...elements);
      active.shown = end;
      loadingMore = false;
      showCount();
      elements[0]?.querySelector("a")?.focus();
    } catch (_) {
      showError(token, end);
    }
  });
  retry.addEventListener("click", () => {
    const visible = failed.query === query() ? failed.visible : pageSize;
    resetClient();
    schedule(true, visible);
  });
  window.addEventListener("popstate", () => {
    composing = false;
    input.value = new URL(window.location.href).searchParams.get("q") || "";
    schedule(true);
  });

  input.value = new URL(window.location.href).searchParams.get("q") || "";
  form.hidden = false;
  status.hidden = false;
  schedule(true);
})();
