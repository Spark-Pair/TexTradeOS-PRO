import React, { useEffect } from "react";
import Button from "./Button";
import { useShortcut } from "../hooks/useShortcuts";
import {
  formatComboDisplay,
  isEventMatchingShortcut,
  shouldIgnoreGlobalShortcutTarget,
} from "../utils/shortcuts";

export default function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  rightContent,
}) {
  const primaryActionShortcut = useShortcut("page_header_primary_action");
  const mobileActionLabel = actionLabel
    ?.replace(/^Generate\s+/i, "New ")
    .replace(/^Add\s+/i, "New ");

  useEffect(() => {
    if (!actionLabel || !onAction || !primaryActionShortcut) return;

    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (shouldIgnoreGlobalShortcutTarget(e.target)) return;
      if (!isEventMatchingShortcut(e, primaryActionShortcut)) return;

      e.preventDefault();
      onAction();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actionLabel, onAction, primaryActionShortcut]);

  return (
    <div className="mb-5 flex min-h-10 items-center justify-between gap-3 pl-13 sm:min-h-0 sm:items-start sm:pl-0">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-medium tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="hidden text-sm text-gray-400 sm:block">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {rightContent}
        {actionLabel && onAction && (
          <Button
            className="shrink-0 px-3 sm:px-4"
            icon={actionIcon}
            iconPosition="right"
            onClick={onAction}
            title={`Shortcut: ${formatComboDisplay(primaryActionShortcut)}`}
            aria-label={actionLabel}
          >
            <span className="sm:hidden">{mobileActionLabel || actionLabel}</span>
            <span className="hidden sm:inline">{actionLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
