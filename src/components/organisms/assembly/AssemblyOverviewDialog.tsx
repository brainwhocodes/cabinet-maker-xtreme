'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SolarIcon } from '@/components/atoms/SolarIcon';
import { AssemblyStoryboard } from '@/components/organisms/AssemblyStoryboard';
import type { BuiltCabinetModel } from '@/domain/geometry/part-builder';
import { AssemblyToolbar, type AssemblyToolbarProps } from './AssemblyToolbar';

interface AssemblyOverviewDialogProps {
  model: BuiltCabinetModel;
  activeStepNumber: number;
  toolbarProps: Omit<AssemblyToolbarProps, 'onOverview' | 'overviewTriggerRef'>;
  onSelectStep(stepNumber: number): void;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AssemblyOverviewDialog({
  model,
  activeStepNumber,
  toolbarProps,
  onSelectStep,
  children,
}: AssemblyOverviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overviewTriggerRef = useRef<HTMLButtonElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(
    () => () => {
      pageContentRef.current?.removeAttribute('inert');
    },
    [],
  );

  const openOverview = () => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      return;
    }

    setFallbackOpen(true);
    pageContentRef.current?.setAttribute('inert', '');
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  };

  const closeOverview = useCallback(() => {
    const dialog = dialogRef.current;
    if (fallbackOpen) {
      pageContentRef.current?.removeAttribute('inert');
      setFallbackOpen(false);
    } else if (dialog?.open) {
      dialog.close();
    }
    requestAnimationFrame(() => overviewTriggerRef.current?.focus());
  }, [fallbackOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const closeFromBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) closeOverview();
    };
    dialog.addEventListener('click', closeFromBackdrop);
    return () => dialog.removeEventListener('click', closeFromBackdrop);
  }, [closeOverview]);

  const handleFallbackKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (!fallbackOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverview();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.hasAttribute('hidden') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        element.getClientRects().length > 0,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const selectOverviewStep = (stepNumber: number) => {
    onSelectStep(stepNumber);
    closeOverview();
  };

  return (
    <>
      <div ref={pageContentRef} className="assembly-page-content">
        <AssemblyToolbar
          {...toolbarProps}
          onOverview={openOverview}
          overviewTriggerRef={overviewTriggerRef}
        />
        {children}
      </div>

      <dialog
        ref={dialogRef}
        className={`assembly-overview-dialog ${fallbackOpen ? 'is-fallback' : ''}`}
        open={fallbackOpen || undefined}
        aria-modal="true"
        aria-labelledby="assembly-overview-title"
        onCancel={(event) => {
          event.preventDefault();
          closeOverview();
        }}
        onKeyDown={handleFallbackKeyDown}
      >
        <div className="assembly-overview-dialog-surface">
          <header>
            <div>
              <p>Six-step cabinet sequence</p>
              <h2 id="assembly-overview-title">Assembly overview</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="button"
              aria-label="Close overview"
              onClick={closeOverview}
            >
              <SolarIcon name="solar:close-circle-linear" size={20} />
              <span>Close overview</span>
            </button>
          </header>
          <AssemblyStoryboard
            model={model}
            activeStepNumber={activeStepNumber}
            onSelectStep={selectOverviewStep}
          />
        </div>
      </dialog>
    </>
  );
}
