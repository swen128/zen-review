const HSF_VIEWS = [
  {
    selector: ".file[data-tagsearch-path]",
    paths(el) {
      const header = el.querySelector(".file-header");
      return [header?.dataset.path, el.dataset.tagsearchPath].filter(Boolean);
    },
    header(el) {
      return el.querySelector(".file-header");
    },
    toggle(el) {
      return el.querySelector(".file-header .js-details-target");
    },
    isExpanded(el) {
      const toggle = this.toggle(el);
      if (toggle?.hasAttribute("aria-expanded")) return toggle.getAttribute("aria-expanded") === "true";
      return el.classList.contains("Details--on");
    }
  },
  {
    selector: '[role="region"][id^="diff-"]',
    paths(el) {
      const text = el.querySelector("h3")?.textContent.replace(/[\u200e\u200f]/g, "").trim();
      return text ? text.split(/\s+→\s+/) : [];
    },
    header(el) {
      return el.firstElementChild;
    },
    toggle(el) {
      return this.header(el)?.querySelector("button svg.octicon-chevron-down, button svg.octicon-chevron-right")?.closest("button") ?? null;
    },
    isExpanded(el) {
      return !!this.toggle(el)?.querySelector("svg.octicon-chevron-down");
    }
  }
];

const hsf = {
  settings: HSF_DEFAULTS,
  regexes: hsfCompile(HSF_DEFAULTS.patterns),
  pageKey: null,
  active: true,
  matched: new Set(),
  overrides: new Set(),
  autoCollapsed: new Set(),
  lastClick: new WeakMap(),
  pill: null,
  scheduled: false
};

function hsfPageKey() {
  const match = location.pathname.match(/^\/([^/]+\/[^/]+\/pull\/\d+)\/(files|changes|commits\/)/);
  return match ? match[1] : null;
}

function hsfMatches(paths) {
  return paths.some((path) => hsf.regexes.some((regex) => regex.test(path)));
}

function hsfSetHidden(el, hidden) {
  if (hidden && !el.hasAttribute("data-hsf-hidden")) el.setAttribute("data-hsf-hidden", "");
  if (!hidden && el.hasAttribute("data-hsf-hidden")) el.removeAttribute("data-hsf-hidden");
}

function hsfClickToggle(view, el) {
  const toggle = view.toggle(el);
  if (!toggle) return;
  const now = Date.now();
  if (now - (hsf.lastClick.get(el) ?? 0) < 1000) return;
  hsf.lastClick.set(el, now);
  toggle.click();
}

function hsfResetPage(key) {
  hsf.pageKey = key;
  hsf.active = true;
  hsf.matched.clear();
  hsf.overrides.clear();
  hsf.autoCollapsed.clear();
}

function hsfProcessFiles() {
  const hide = hsf.settings.mode === "hide";
  for (const view of HSF_VIEWS) {
    for (const el of document.querySelectorAll(view.selector)) {
      const paths = view.paths(el);
      if (!paths.length || !hsfMatches(paths)) {
        hsfSetHidden(el, false);
        continue;
      }
      const key = paths[paths.length - 1];
      hsf.matched.add(key);
      if (hide) {
        hsfSetHidden(el, hsf.active && !hsf.overrides.has(key));
        continue;
      }
      hsfSetHidden(el, false);
      const expanded = view.isExpanded(el);
      if (hsf.active && expanded && !hsf.overrides.has(key)) {
        hsf.autoCollapsed.add(key);
        hsfClickToggle(view, el);
      } else if (!hsf.active && !expanded && hsf.autoCollapsed.has(key)) {
        hsf.autoCollapsed.delete(key);
        hsfClickToggle(view, el);
      }
    }
  }
}

function hsfTreeItemPath(item) {
  const label = item.querySelector(":scope > [data-filterable-item-text]");
  if (label) return label.textContent.trim();
  if (item.id && !item.id.startsWith("file-tree-item-")) return item.id;
  return null;
}

function hsfProcessTree() {
  const hide = hsf.settings.mode === "hide" && hsf.active;
  const items = [...document.querySelectorAll('[role="treeitem"]')];
  const leaves = items.filter((item) => !item.querySelector('[role="group"]'));
  for (const item of leaves) {
    const path = hsfTreeItemPath(item);
    const matched = !!path && hsfMatches([path]);
    if (matched) hsf.matched.add(path);
    hsfSetHidden(item, hide && matched);
  }
  for (const item of items.filter((item) => item.querySelector('[role="group"]')).reverse()) {
    const childLeaves = [...item.querySelectorAll('[role="treeitem"]')].filter((child) => !child.querySelector('[role="group"]'));
    hsfSetHidden(item, hide && childLeaves.length > 0 && childLeaves.every((child) => child.hasAttribute("data-hsf-hidden")));
  }
}

function hsfPillText() {
  const count = hsf.matched.size;
  const noun = count === 1 ? "test file" : "test files";
  if (hsf.settings.mode === "hide") {
    return hsf.active ? [`${count} ${noun} hidden`, "Show"] : [`${count} ${noun} shown`, "Hide"];
  }
  return hsf.active ? [`${count} ${noun} collapsed`, "Expand"] : [`${count} ${noun}`, "Collapse"];
}

function hsfRenderPill() {
  if (!hsf.pageKey || hsf.matched.size === 0) {
    hsf.pill?.remove();
    hsf.pill = null;
    return;
  }
  if (!hsf.pill) {
    hsf.pill = document.createElement("div");
    hsf.pill.className = "hsf-pill";
    hsf.pill.append(document.createElement("span"), document.createElement("button"));
    hsf.pill.lastChild.type = "button";
    hsf.pill.lastChild.addEventListener("click", () => {
      hsf.active = !hsf.active;
      hsf.overrides.clear();
      hsfScan();
    });
  }
  if (!hsf.pill.isConnected) document.body.append(hsf.pill);
  const [label, action] = hsfPillText();
  if (hsf.pill.firstChild.textContent !== label) hsf.pill.firstChild.textContent = label;
  if (hsf.pill.lastChild.textContent !== action) hsf.pill.lastChild.textContent = action;
}

function hsfScan() {
  hsf.scheduled = false;
  const key = hsfPageKey();
  if (key !== hsf.pageKey) hsfResetPage(key);
  if (key) {
    hsfProcessFiles();
    hsfProcessTree();
  } else {
    for (const el of document.querySelectorAll("[data-hsf-hidden]")) el.removeAttribute("data-hsf-hidden");
  }
  hsfRenderPill();
}

function hsfSchedule() {
  if (hsf.scheduled) return;
  hsf.scheduled = true;
  setTimeout(hsfScan, 100);
}

function hsfOnUserClick(event) {
  if (!event.isTrusted || !hsf.pageKey) return;
  for (const view of HSF_VIEWS) {
    const el = event.target.closest?.(view.selector);
    if (!el || !view.header(el)?.contains(event.target)) continue;
    const paths = view.paths(el);
    if (!hsfMatches(paths)) return;
    const key = paths[paths.length - 1];
    hsf.overrides.add(key);
    hsf.autoCollapsed.delete(key);
    return;
  }
}

function hsfApplySettings(settings) {
  hsf.settings = settings;
  hsf.regexes = hsfCompile(settings.patterns);
  hsf.matched.clear();
  hsfSchedule();
}

hsfLoadSettings().then((settings) => {
  hsfApplySettings(settings);
  new MutationObserver(hsfSchedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", hsfOnUserClick, true);
  window.addEventListener("popstate", hsfSchedule);
  document.addEventListener("turbo:load", hsfSchedule);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  hsfLoadSettings().then(hsfApplySettings);
});
