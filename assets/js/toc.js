// Native fragment links work without JS. Enhance them with a reading position
// indicator, without changing the URL or browser history while scrolling.
(() => {
  "use strict";
  const toc = document.querySelector("[data-article-toc]");
  const layout = toc?.closest("[data-article-layout]");
  const disclosure = toc?.querySelector(".toc-disclosure");
  const summary = toc?.querySelector(".toc-summary");
  const nav = toc?.querySelector(".toc-nav");
  if (!layout || !disclosure || !summary || !nav) return;

  const entries = Array.from(toc.querySelectorAll(".toc-link")).flatMap((link) => {
    let id;
    try { id = decodeURIComponent(new URL(link.href).hash.slice(1)); } catch { return []; }
    const heading = document.getElementById(id);
    if (!heading || !layout.contains(heading)) return [];
    return [{ link, heading }];
  });
  if (!entries.length) return;

  const header = document.querySelector(".site-header");
  const mobile = window.matchMedia("(max-width: 1050px)");
  let activeIndex = -1;
  let frame = 0;
  let readingTop = 100;

  function keepActiveVisible() {
    if (activeIndex < 0 || !disclosure.open) return;
    const link = entries[activeIndex].link.getBoundingClientRect();
    const box = nav.getBoundingClientRect();
    // Scroll only inside the TOC. scrollIntoView would also move the article.
    if (link.top < box.top + 6) nav.scrollTop += link.top - box.top - 6;
    else if (link.bottom > box.bottom - 6) nav.scrollTop += link.bottom - box.bottom + 6;
  }

  function activate(index) {
    if (activeIndex === index) return;
    if (activeIndex >= 0) entries[activeIndex].link.removeAttribute("aria-current");
    activeIndex = index;
    entries[index].link.setAttribute("aria-current", "location");
    keepActiveVisible();
  }

  function update() {
    frame = 0;
    let current = 0;
    entries.forEach(({ heading }, index) => {
      if (heading.getBoundingClientRect().top <= readingTop + 2) current = index;
    });
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    // A short final section cannot always reach the top of the viewport.
    if (maxScroll > 0 && window.scrollY >= maxScroll - 2) current = entries.length - 1;
    activate(current);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure() {
    readingTop = Math.ceil(Math.max(0, header?.getBoundingClientRect().bottom || 0) + 24);
    layout.style.setProperty("--article-toc-top", `${readingTop}px`);
    document.documentElement.style.setProperty("--page-scroll-offset", `${readingTop}px`);
    keepActiveVisible();
    schedule();
  }

  function responsive() {
    const hadFocus = nav.contains(document.activeElement);
    disclosure.open = !mobile.matches;
    if (mobile.matches && hadFocus) summary.focus({ preventScroll: true });
    measure();
  }

  toc.addEventListener("click", (event) => {
    const link = event.target.closest(".toc-link");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index = entries.findIndex((entry) => entry.link === link);
    if (index < 0) return;
    activate(index);
    if (mobile.matches) disclosure.open = false;
    const heading = entries[index].heading;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    // Let the browser apply the fragment and history entry, then move keyboard
    // focus without triggering a second, differently aligned scroll.
    requestAnimationFrame(() => {
      heading.focus({ preventScroll: true });
      schedule();
    });
  });

  disclosure.addEventListener("toggle", () => {
    keepActiveVisible();
    schedule();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("popstate", () => requestAnimationFrame(schedule));
  window.addEventListener("pageshow", schedule);
  window.addEventListener("load", measure, { once: true });
  mobile.addEventListener("change", responsive);
  document.fonts?.ready.then(measure);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    const body = layout.querySelector("[data-article-body]");
    if (body) observer.observe(body);
  }
  responsive();
})();
