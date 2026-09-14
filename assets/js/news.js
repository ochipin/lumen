// Ordinary paging uses Hugo's generated HTML. Fetch the complete search data
// only when a reader filters, so page 1 does not download every article body.
(() => {
  "use strict";
  const form = document.getElementById("news-filters");
  if (!form) return;
  const keyword = form.querySelector("#news-keyword");
  const category = form.querySelector("#news-category");
  const list = document.getElementById("news-list");
  const controls = document.getElementById("news-filter-controls");
  const count = document.getElementById("news-results-count");
  const empty = document.getElementById("news-empty-state");
  const nativePagination = document.getElementById("news-pagination");
  const pagination = document.getElementById("news-filter-pagination");
  const heading = document.getElementById("news-results-heading");
  const status = document.getElementById("news-search-status");
  const retry = document.querySelector("[data-news-retry]");
  if (![keyword, category, list, controls, count, empty, nativePagination, pagination, heading, status, retry].every(Boolean)) return;

  let language = form.dataset.language || document.documentElement.lang || "en";
  try { new Intl.NumberFormat(language); } catch (_) { language = "en"; }
  const normalize = value => String(value || "").normalize("NFKC").toLocaleLowerCase(language);
  const format = (message, values) => message.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
  const categories = new Set([...category.options].map(option => option.value));
  const pageSize = Number(list.dataset.pageSize);
  const originalPage = Number(form.dataset.currentPage);
  const totalCount = Number(form.dataset.totalCount);
  const baseURL = new URL(form.dataset.baseUrl, location.href);
  let pageURLs;
  try { pageURLs = JSON.parse(form.dataset.pageUrls).map(url => new URL(url, location.href)); } catch (_) { return; }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !pageURLs.length) return;
  const original = {
    rows: [...list.children].map(row => row.cloneNode(true)),
    count: [...count.childNodes].map(node => node.cloneNode(true)),
    listHidden: list.hidden, emptyHidden: empty.hidden, pagerHidden: nativePagination.hidden,
  };
  let page = originalPage;
  let composing = false;
  let generation = 0;
  let timer;
  let indexPromise;
  let index;
  let lastRequest;

  function positivePage(value) {
    const number = /^\d+$/.test(String(value)) ? Number(value) : 1;
    return Number.isSafeInteger(number) && number > 0 ? number : 1;
  }

  function filtered() { return Boolean(keyword.value.trim() || category.value); }

  function pageURL(number) { return pageURLs[Math.min(Math.max(number, 1), pageURLs.length) - 1]; }

  function writeURL(mode, isFiltered) {
    const url = new URL(location.href);
    url.pathname = isFiltered ? baseURL.pathname : pageURL(page).pathname;
    for (const key of ["q", "category", "page"]) url.searchParams.delete(key);
    if (isFiltered) {
      if (keyword.value.trim()) url.searchParams.set("q", keyword.value.trim());
      if (category.value) url.searchParams.set("category", category.value);
      if (page > 1) url.searchParams.set("page", String(page));
    }
    if (url.href !== location.href) history[`${mode}State`](history.state, "", url);
  }

  function clearStatus() {
    list.removeAttribute("aria-busy");
    status.hidden = true;
    status.textContent = "";
    retry.hidden = true;
  }

  function restoreNative(mode) {
    clearStatus();
    const destination = pageURL(page);
    if (page !== originalPage) {
      const url = new URL(location.href);
      url.pathname = destination.pathname;
      for (const key of ["q", "category", "page"]) url.searchParams.delete(key);
      location[mode === "push" ? "assign" : "replace"](url.href);
      return;
    }
    list.replaceChildren(...original.rows.map(row => row.cloneNode(true)));
    count.replaceChildren(...original.count.map(node => node.cloneNode(true)));
    list.hidden = original.listHidden;
    empty.hidden = original.emptyHidden;
    nativePagination.hidden = original.pagerHidden;
    pagination.hidden = true;
    writeURL(mode, false);
  }

  function loadIndex() {
    if (!indexPromise) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      indexPromise = fetch(form.dataset.indexUrl, { signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error("News data unavailable"); return response.json(); })
        .then(rows => {
          if (!Array.isArray(rows) || rows.length !== totalCount) throw new Error("Invalid news data");
          return rows.map(row => {
            if (typeof row.title !== "string" || typeof row.url !== "string" || typeof row.search !== "string") throw new Error("Invalid news article");
            const url = new URL(row.url, location.href);
            if (!["https:", "http:"].includes(url.protocol) || url.origin !== location.origin) throw new Error("Invalid news URL");
            return { ...row, normalized: normalize(row.search) };
          });
        })
        .catch(error => { indexPromise = undefined; throw error; })
        .finally(() => clearTimeout(timeout));
    }
    return indexPromise;
  }

  function rowElement(row) {
    const item = document.createElement("li"); item.className = "news-item";
    const link = document.createElement("a"); link.className = "news-item-link"; link.href = row.url;
    const date = document.createElement(row.date ? "time" : "span");
    if (row.date) { date.textContent = row.date; if (row.dateTime) date.dateTime = row.dateTime; }
    else date.className = "news-undated";
    const badge = document.createElement("span"); badge.className = "news-category";
    badge.dataset.category = row.style; badge.textContent = row.category;
    const title = document.createElement("h3"); title.textContent = row.title;
    const arrow = document.createElement("span"); arrow.className = "news-item-arrow";
    arrow.setAttribute("aria-hidden", "true"); arrow.textContent = "→";
    link.append(date, badge, title, arrow); item.append(link); return item;
  }

  function pageButton(label, target, accessibleLabel, disabled = false) {
    const button = document.createElement("button"); button.type = "button";
    button.className = "news-page-button"; button.dataset.page = target;
    button.textContent = label; button.setAttribute("aria-label", accessibleLabel); button.disabled = disabled;
    return button;
  }

  function renderPagination(totalPages) {
    pagination.hidden = totalPages <= 1; pagination.replaceChildren();
    if (pagination.hidden) return;
    const pages = document.createElement("ul"); pages.className = "news-pagination-list";
    const append = element => { const item = document.createElement("li"); item.append(element); pages.append(item); };
    append(pageButton("‹", Math.max(1, page - 1), form.dataset.previousPage, page === 1));
    let numbers;
    if (totalPages <= 5) numbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    else if (page <= 3) numbers = [1, 2, 3, null, totalPages];
    else if (page >= totalPages - 2) numbers = [1, null, totalPages - 2, totalPages - 1, totalPages];
    else numbers = [1, null, page, null, totalPages];
    numbers.forEach(number => {
      if (number === null) {
        const ellipsis = document.createElement("span"); ellipsis.className = "news-pagination-ellipsis";
        ellipsis.textContent = "…"; ellipsis.setAttribute("aria-hidden", "true"); append(ellipsis);
      } else {
        const button = pageButton(String(number), number, format(form.dataset.pageNumber, { page: number }));
        if (number === page) button.setAttribute("aria-current", "page"); append(button);
      }
    });
    append(pageButton("›", Math.min(totalPages, page + 1), form.dataset.nextPage, page === totalPages));
    pagination.append(pages);
  }

  function revealHeading() {
    heading.focus({ preventScroll: true });
    const bounds = heading.getBoundingClientRect();
    const visibleTop = Math.max(0, document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0) + 8;
    if (bounds.top < visibleTop) scrollBy({ top: bounds.top - visibleTop, behavior: "instant" });
    else if (bounds.bottom > innerHeight) scrollBy({ top: bounds.bottom - innerHeight + 8, behavior: "instant" });
  }

  async function render(mode = "replace", focusHeading = false) {
    clearTimeout(timer);
    const request = ++generation;
    lastRequest = { mode, focusHeading };
    if (!filtered()) { restoreNative(mode); return; }
    const terms = normalize(keyword.value).trim().split(/\s+/).filter(Boolean);
    const selected = category.value;
    clearStatus();
    if (!index) {
      status.textContent = form.dataset.loadingMessage; status.hidden = false;
      list.setAttribute("aria-busy", "true");
      try { index = await loadIndex(); }
      catch (_) {
        if (request !== generation) return;
        list.removeAttribute("aria-busy");
        status.textContent = form.dataset.errorMessage; status.hidden = false; retry.hidden = false;
        return;
      }
    }
    if (request !== generation) return;
    const matched = index.filter(row => (!selected || row.category === selected) && terms.every(term => row.normalized.includes(term)));
    const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * pageSize;
    const shown = matched.slice(start, start + pageSize);
    list.replaceChildren(...shown.map(rowElement));
    const number = document.createElement("strong"); number.textContent = matched.length.toLocaleString(language);
    count.replaceChildren(number, format(form.dataset.countMessage, {
      total: index.length.toLocaleString(language), range: shown.length ? `${start + 1}–${start + shown.length}` : "0",
    }));
    list.hidden = !matched.length; empty.hidden = Boolean(matched.length); nativePagination.hidden = true;
    renderPagination(totalPages); clearStatus(); writeURL(mode, true);
    if (focusHeading) revealHeading();
  }

  function changeFilters(immediate = false) {
    if (composing) return;
    // Invalidate any in-flight render before the debounce period.
    generation++; clearTimeout(timer); page = 1;
    if (immediate || !filtered()) render();
    else timer = setTimeout(() => render(), 120);
  }

  function restoreURL() {
    const url = new URL(location.href);
    keyword.value = url.searchParams.get("q") || "";
    const selected = url.searchParams.get("category") || "";
    category.value = categories.has(selected) ? selected : "";
    const pathPage = pageURLs.findIndex(item => item.pathname === url.pathname) + 1;
    page = positivePage(url.searchParams.get("page") || (filtered() ? 1 : pathPage || originalPage));
    if (!filtered()) page = Math.min(page, pageURLs.length);
    composing = false; render();
  }

  keyword.addEventListener("compositionstart", () => { composing = true; generation++; clearTimeout(timer); });
  keyword.addEventListener("compositionend", () => { composing = false; changeFilters(); });
  keyword.addEventListener("input", event => { if (!event.isComposing) changeFilters(); });
  category.addEventListener("change", () => changeFilters(true));
  form.addEventListener("submit", event => { event.preventDefault(); changeFilters(true); });
  document.querySelectorAll("[data-news-reset]").forEach(button => button.addEventListener("click", () => {
    composing = false; keyword.value = ""; category.value = ""; page = 1; render(); keyword.focus({ preventScroll: true });
  }));
  retry.addEventListener("click", () => render(lastRequest?.mode, lastRequest?.focusHeading));
  pagination.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled || !pagination.contains(button)) return;
    const requested = Number(button.dataset.page);
    if (!Number.isSafeInteger(requested) || requested < 1 || requested === page) return;
    page = requested; render("push", true);
  });
  window.addEventListener("popstate", restoreURL);
  restoreURL(); controls.hidden = false;
})();
