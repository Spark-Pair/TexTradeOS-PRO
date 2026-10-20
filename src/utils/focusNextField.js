const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'button:not([disabled]):not([aria-disabled="true"])',
  'a[href]:not([aria-disabled="true"])',
  '[data-focusable]:not([disabled]):not([aria-disabled="true"]):not([readonly])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-disabled="true"]):not([readonly])',
].join(', ');

const FORM_FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  '[data-focusable]:not([disabled]):not([aria-disabled="true"]):not([readonly])',
].join(', ');

const isFormField = (element) => element.matches(FORM_FIELD_SELECTOR);
const isSecondaryAction = (element) =>
  /^(cancel|discard|close|back|remove|reset)\b/i.test(element.textContent?.trim() || "");

const isVisible = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.closest('[hidden]')) return false;
  return element.getClientRects().length > 0;
};

export function getKeyboardFocusableElements(scope = document) {
  return [...scope.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (!isVisible(element)) return false;
    if (element.matches('[data-shortcut-capture="true"] *')) return false;
    if (element.closest('[data-select-dropdown="true"]')) return false;
    return true;
  });
}

export function focusNextField(current) {
  if (!(current instanceof HTMLElement)) return false;

  // Keep focus movement inside the open modal or current form. This prevents
  // Enter from jumping into the sidebar or another unrelated form.
  const scope = current.closest('.modal-panel') || current.closest('form') || document;
  const elements = getKeyboardFocusableElements(scope);
  const currentIndex = elements.indexOf(current);
  const following = elements.slice(Math.max(0, currentIndex + 1));

  // Always finish the form fields first. When the last field is complete,
  // prefer the primary action (Save/Create/Submit) over Cancel or Discard,
  // even when the secondary button appears first in the modal footer.
  const next = following.find(isFormField) ||
    following.find((element) => element.matches('button[type="submit"]')) ||
    following.find((element) => element.tagName === "BUTTON" && !isSecondaryAction(element)) ||
    following.find((element) => element.tagName === "BUTTON");

  if (!next) return false;
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

export function focusFirstField(scope) {
  if (!scope?.querySelectorAll) return false;

  const first = [...scope.querySelectorAll(FORM_FIELD_SELECTOR)].find(isVisible);
  if (!first) return false;

  first.focus({ preventScroll: true });
  first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

export function isFormFieldTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.matches?.('[data-focusable]');
}
