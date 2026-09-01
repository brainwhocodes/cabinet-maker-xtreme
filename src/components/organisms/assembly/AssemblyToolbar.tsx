'use client';

import Link from 'next/link';
import { type RefObject, useRef } from 'react';
import { Button } from '@/components/atoms/Button';
import { Select, type SelectOption } from '@/components/atoms/Select';
import { SolarIcon } from '@/components/atoms/SolarIcon';

export interface AssemblyToolbarProps {
  cabinetOptions: SelectOption[];
  selectedCabinetId: string;
  onCabinetChange(cabinetId: string): void;
  onOverview(): void;
  overviewTriggerRef: RefObject<HTMLButtonElement | null>;
  onDownloadPdf(): void;
  onPrint(): void;
  isGeneratingPdf: boolean;
  pdfStatus: string;
}

export function AssemblyToolbar({
  cabinetOptions,
  selectedCabinetId,
  onCabinetChange,
  onOverview,
  overviewTriggerRef,
  onDownloadPdf,
  onPrint,
  isGeneratingPdf,
  pdfStatus,
}: AssemblyToolbarProps) {
  const moreActionsRef = useRef<HTMLDetailsElement>(null);

  const runMobileAction = (action: () => void) => {
    action();
    moreActionsRef.current?.removeAttribute('open');
  };

  return (
    <header className="assembly-toolbar no-print">
      <Link
        prefetch={false}
        href="/planner/"
        className="assembly-toolbar-back"
        aria-label="Back to planner"
      >
        <SolarIcon name="solar:arrow-left-linear" size={20} />
        <span className="assembly-toolbar-back-label">Back to planner</span>
      </Link>

      <div className="assembly-toolbar-selector">
        <label className="sr-only" htmlFor="assembly-cabinet-select">
          Cabinet
        </label>
        <Select
          id="assembly-cabinet-select"
          selectSize="sm"
          aria-label="Select cabinet for assembly guide"
          options={cabinetOptions}
          value={selectedCabinetId}
          onChange={(event) => onCabinetChange(event.target.value)}
        />
      </div>

      <div className="assembly-toolbar-actions">
        <button
          ref={overviewTriggerRef}
          type="button"
          className="button is-small"
          aria-label="Overview"
          onClick={onOverview}
        >
          <SolarIcon name="solar:bill-list-linear" size={16} className="mr-1" />
          <span className="assembly-toolbar-overview-label">Overview</span>
        </button>
        <div className="assembly-toolbar-desktop-actions">
          <Button
            size="sm"
            variant="primary"
            icon="solar:download-linear"
            isLoading={isGeneratingPdf}
            onClick={onDownloadPdf}
          >
            Download PDF
          </Button>
          <Button size="sm" icon="solar:printer-linear" onClick={onPrint}>
            Print view
          </Button>
        </div>
        <details ref={moreActionsRef} className="assembly-toolbar-more">
          <summary aria-label="More actions">
            <SolarIcon name="solar:widget-3-linear" size={20} />
            <span className="sr-only">More actions</span>
          </summary>
          <div className="assembly-toolbar-more-menu">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => runMobileAction(onDownloadPdf)}
            >
              <SolarIcon name="solar:download-linear" size={18} />
              <span>{isGeneratingPdf ? 'Preparing PDF' : 'Download PDF'}</span>
            </button>
            <button type="button" onClick={() => runMobileAction(onPrint)}>
              <SolarIcon name="solar:printer-linear" size={18} />
              <span>Print view</span>
            </button>
          </div>
        </details>
        <span className="sr-only" aria-live="polite">
          {pdfStatus}
        </span>
      </div>
    </header>
  );
}
