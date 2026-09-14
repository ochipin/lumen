// Copy the original fenced text, keeping line numbers and syntax markup out.
(() => {
  "use strict";

  function fallbackCopy(text) {
    if (typeof document.execCommand !== "function") return false;
    const active = document.activeElement;
    const selection = document.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    const field = document.createElement("textarea");
    field.value = text;
    field.readOnly = true;
    field.tabIndex = -1;
    field.style.cssText = "position:fixed;inset:0 auto auto 0;width:1px;height:1px;padding:0;border:0;opacity:0";
    document.body.append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      return document.execCommand("copy") === true;
    } finally {
      field.remove();
      if (active instanceof HTMLElement && active.isConnected) active.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      }
    }
  }

  async function copy(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // A denied Clipboard permission may still permit a user-initiated copy.
    }
    try {
      return fallbackCopy(text);
    } catch {
      return false;
    }
  }

  document.querySelectorAll(".code-block").forEach((block) => {
    const button = block.querySelector(".code-copy");
    const label = button?.querySelector(".code-copy-label");
    const status = block.querySelector(".code-copy-status");
    const source = block.querySelector("template.code-source");
    if (!button || !label || !status || !(source instanceof HTMLTemplateElement)) return;
    const originalLabel = label.textContent;
    let resetTimer = null;
    let copying = false;

    button.addEventListener("click", async () => {
      if (copying) return;
      copying = true;
      clearTimeout(resetTimer);
      status.textContent = "";
      const success = await copy(source.content.textContent);
      copying = false;
      if (success) {
        label.textContent = block.dataset.copied || "Copied";
        status.textContent = block.dataset.copySuccess || "Code copied to clipboard.";
        resetTimer = setTimeout(() => { label.textContent = originalLabel; }, 2200);
      } else {
        label.textContent = block.dataset.copySelect || "Select and copy";
        status.textContent = block.dataset.copyFailed || "Copy failed. Select the code and copy it manually, or press the copy button to try again.";
      }
    });
    button.hidden = false;
  });
})();
