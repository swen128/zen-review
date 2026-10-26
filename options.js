const patternsInput = document.getElementById("patterns");
const errorText = document.getElementById("error");
const statusText = document.getElementById("status");

function render(settings) {
  patternsInput.value = settings.patterns.join("\n");
  for (const radio of document.querySelectorAll('input[name="mode"]')) radio.checked = radio.value === settings.mode;
}

function invalidPatterns(patterns) {
  return patterns.filter((source) => {
    try {
      new RegExp(source);
      return false;
    } catch {
      return true;
    }
  });
}

function flash(message) {
  statusText.textContent = message;
  setTimeout(() => (statusText.textContent = ""), 1500);
}

document.getElementById("save").addEventListener("click", () => {
  const patterns = patternsInput.value.split("\n").map((line) => line.trim()).filter(Boolean);
  const invalid = invalidPatterns(patterns);
  errorText.hidden = invalid.length === 0;
  errorText.textContent = invalid.length ? `Invalid pattern:\n${invalid.join("\n")}` : "";
  if (invalid.length) return;
  const mode = document.querySelector('input[name="mode"]:checked')?.value ?? HSF_DEFAULTS.mode;
  chrome.storage.sync.set({ patterns, mode }, () => flash("Saved"));
});

document.getElementById("reset").addEventListener("click", () => {
  chrome.storage.sync.set(HSF_DEFAULTS, () => {
    render(HSF_DEFAULTS);
    errorText.hidden = true;
    flash("Defaults restored");
  });
});

hsfLoadSettings().then(render);
