const HSF_DEFAULTS = {
  patterns: [
    "(^|/)__tests__/",
    "[._](spec|test)\\.[cm]?[jt]sx?$",
    "\\.snap$"
  ],
  mode: "collapse"
};

function hsfLoadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(HSF_DEFAULTS, (stored) => resolve(stored));
  });
}

function hsfCompile(patterns) {
  const regexes = [];
  for (const source of patterns) {
    const trimmed = source.trim();
    if (!trimmed) continue;
    try {
      regexes.push(new RegExp(trimmed));
    } catch {
      continue;
    }
  }
  return regexes;
}
