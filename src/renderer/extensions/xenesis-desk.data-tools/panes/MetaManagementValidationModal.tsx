import { type KeyboardEvent, useEffect, useRef } from 'react';
import type { MetaGridKind } from '../useMetaManagementData';
import type { MetaPendingWarningSave } from '../useMetaManagementGridSave';

export interface MetaManagementValidationModalProps {
  pending: MetaPendingWarningSave | null;
  onCancel: () => void;
  onConfirm: (grid: MetaGridKind) => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex !== -1 && element.getAttribute('aria-hidden') !== 'true',
  );
}

export function MetaManagementValidationModal({ pending, onCancel, onConfirm }: MetaManagementValidationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isOpen = pending !== null;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const animationFrame = window.requestAnimationFrame(() => {
      const modal = modalRef.current;
      const firstFocusable = getFocusableElements(modal)[0];
      (firstFocusable ?? modal)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key !== 'Tab') return;

    const modal = modalRef.current;
    const focusableElements = getFocusableElements(modal);
    if (!modal || focusableElements.length === 0) {
      event.preventDefault();
      modal?.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstFocusable || !modal.contains(activeElement)) {
        event.preventDefault();
        lastFocusable.focus();
      }
      return;
    }

    if (activeElement === lastFocusable || !modal.contains(activeElement)) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  if (!pending) return null;

  const warnings = pending.validation.warnings.slice(0, 8);
  const hiddenWarnings = Math.max(0, pending.validation.warningCount - warnings.length);

  return (
    <div className="mm-modal-overlay" role="presentation" onKeyDown={handleKeyDown}>
      <div
        ref={modalRef}
        className="mm-modal mm-validation-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Validation warnings"
        tabIndex={-1}
      >
        <div className="mm-modal-header">Save with validation warnings?</div>
        <div className="mm-modal-body">
          <div className="mm-validation-summary">
            <strong>{pending.validation.warningCount}</strong> warning(s) found for <strong>{pending.grid}</strong>.
          </div>
          <div className="mm-validation-warning-list">
            {warnings.map((warning, index) => (
              <div className="mm-validation-warning" key={`${warning.code}-${warning.index}-${index}`}>
                <strong>{warning.code}</strong>
                <span>{warning.message}</span>
              </div>
            ))}
            {hiddenWarnings > 0 && <div className="mm-validation-more">+{hiddenWarnings} more warning(s)</div>}
          </div>
        </div>
        <div className="mm-modal-footer">
          <button type="button" className="mm-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="mm-btn primary" onClick={() => onConfirm(pending.grid)}>
            Save with warnings
          </button>
        </div>
      </div>
    </div>
  );
}
