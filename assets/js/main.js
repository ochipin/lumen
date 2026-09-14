document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.getElementById('site-navigation');
const mobile = window.matchMedia('(max-width: 1050px)');
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const dropdowns = [...document.querySelectorAll('.nav-dropdown')].map((details) => ({
  details,
  item: details.closest('.nav-item'),
  trigger: details.querySelector('summary'),
  panel: details.querySelector('.mega-menu'),
  openTimer: null,
  closeTimer: null,
}));
let pointerInteraction = false;
let keyboardNavigation = false;
let lastMenuFocus = null;

function cancelTimers(dropdown) {
  clearTimeout(dropdown.openTimer);
  clearTimeout(dropdown.closeTimer);
  dropdown.openTimer = null;
  dropdown.closeTimer = null;
}

function closeDropdown(dropdown) {
  cancelTimers(dropdown);
  dropdown.details.open = false;
}

function closeDropdowns() {
  dropdowns.forEach(closeDropdown);
}

function setMenu(open) {
  document.body.toggleAttribute('data-menu-open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  if (!open) closeDropdowns();
}

function canHover(event) {
  return !mobile.matches && hoverPointer.matches && event.pointerType === 'mouse';
}

document.addEventListener('pointerdown', () => {
  pointerInteraction = true;
  keyboardNavigation = false;
}, true);
document.addEventListener('pointercancel', () => { pointerInteraction = false; }, true);

menuButton?.addEventListener('click', () => {
  const open = !document.body.hasAttribute('data-menu-open');
  setMenu(open);
  if (open) navigation?.querySelector('a, summary')?.focus();
});

mobile.addEventListener('change', () => {
  const active = document.activeElement;
  // A media-query change can hide and blur a control before this event fires.
  const focus = (active === document.body || active === document.documentElement)
    ? (lastMenuFocus || active) : active;
  const wasInNavigation = navigation?.contains(focus);
  const parentDropdown = dropdowns.find((entry) => entry.item.contains(focus));
  setMenu(false);
  if (mobile.matches && wasInNavigation) menuButton?.focus();
  else if (!mobile.matches && parentDropdown?.panel.contains(focus)) parentDropdown.trigger.focus();
  else if (!mobile.matches && focus === menuButton) navigation?.querySelector('a, summary')?.focus();
});
hoverPointer.addEventListener('change', () => dropdowns.forEach(cancelTimers));

navigation?.addEventListener('click', (event) => {
  // Parent labels are ordinary links to their section pages, including on touch.
  if (event.target.closest('a')) setMenu(false);
});

dropdowns.forEach((dropdown) => {
  const enter = (event) => {
    if (!canHover(event)) return;
    keyboardNavigation = false;
    cancelTimers(dropdown);
    if (dropdown.details.open) return;
    // Avoid flashing a panel when the pointer merely crosses the header.
    dropdown.openTimer = setTimeout(() => {
      dropdown.openTimer = null;
      if (mobile.matches || !hoverPointer.matches) return;
      // Hover should never hide the link a keyboard user is currently reading.
      if (dropdowns.some((other) => other !== dropdown && other.panel.contains(document.activeElement))) return;
      dropdowns.forEach((other) => { if (other !== dropdown) closeDropdown(other); });
      dropdown.details.open = true;
    }, 120);
  };
  const leave = (event) => {
    if (!canHover(event)) return;
    // The absolutely positioned panel is a descendant even outside the item box.
    if (event.relatedTarget instanceof Node && dropdown.item.contains(event.relatedTarget)) return;
    cancelTimers(dropdown);
    dropdown.closeTimer = setTimeout(() => {
      dropdown.closeTimer = null;
      if (dropdown.panel.contains(document.activeElement)) return;
      if (keyboardNavigation && dropdown.item.contains(document.activeElement)) return;
      closeDropdown(dropdown);
    }, 240);
  };
  dropdown.item.addEventListener('pointerenter', enter);
  dropdown.item.addEventListener('pointerleave', leave);
  dropdown.panel.addEventListener('pointerenter', enter);
  dropdown.panel.addEventListener('pointerleave', leave);
  // Native summary handles mouse, touch, Enter and Space; no link interception.
  dropdown.trigger.addEventListener('click', () => dropdowns.forEach(cancelTimers));
  dropdown.details.addEventListener('toggle', () => {
    if (dropdown.details.open) {
      dropdowns.forEach((other) => { if (other !== dropdown) closeDropdown(other); });
    }
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-item')) closeDropdowns();
  if (mobile.matches && !event.target.closest('.site-header')) setMenu(false);
  if (!navigation?.contains(event.target) && !menuButton?.contains(event.target)) lastMenuFocus = null;
  pointerInteraction = false;
});

// Preserve normal Tab order: parent link, disclosure, then the open panel links.
document.addEventListener('focusin', (event) => {
  if (navigation?.contains(event.target) || event.target === menuButton) lastMenuFocus = event.target;
  else if (event.target !== document.body && event.target !== document.documentElement) lastMenuFocus = null;
  // Pointer focus happens before click. Do not move a pressed mobile target.
  if (pointerInteraction) return;
  dropdowns.forEach(cancelTimers);
  dropdowns.forEach((entry) => {
    if (!entry.item.contains(event.target)) closeDropdown(entry);
  });
  if (mobile.matches && !event.target.closest('.site-header')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  pointerInteraction = false;
  keyboardNavigation = true;
  if (event.key !== 'Escape') return;
  // Also cancel a pending hover opening, even if the panel is not visible yet.
  dropdowns.forEach(cancelTimers);
  const openDropdown = dropdowns.find((entry) => entry.details.open);
  if (openDropdown) {
    closeDropdown(openDropdown);
    openDropdown.trigger.focus();
  } else if (document.body.hasAttribute('data-menu-open')) {
    setMenu(false);
    menuButton?.focus();
  }
});

document.querySelectorAll('.video-frame[data-video-id]').forEach((frame) => {
  frame.querySelector('.video-launch')?.addEventListener('click', () => {
    const id = frame.dataset.videoId;
    if (!/^[\w-]{11}$/.test(id)) return;
    const iframe = document.createElement('iframe');
    iframe.title = frame.dataset.videoTitle || document.body.dataset.videoLabel || '';
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
    iframe.focus();
  }, { once: true });
});

// Make wide scientific tables scroll locally, keeping the page itself responsive.
document.querySelectorAll('.prose table').forEach((table) => {
  if (table.parentElement.classList.contains('table-scroll')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', document.body.dataset.tableScrollLabel || '');
  table.before(wrapper);
  wrapper.append(table);
});

// Native details keeps the language selector usable without JavaScript.
const languageSwitcher = document.querySelector('.language-switcher');
document.addEventListener('click', (event) => {
  if (!languageSwitcher?.contains(event.target)) languageSwitcher?.removeAttribute('open');
});
document.addEventListener('focusin', (event) => {
  if (!languageSwitcher?.contains(event.target)) languageSwitcher?.removeAttribute('open');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && languageSwitcher?.open) {
    languageSwitcher.open = false;
    languageSwitcher.querySelector('summary').focus();
  }
});
