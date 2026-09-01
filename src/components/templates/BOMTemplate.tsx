'use client';

import Link from 'next/link';
import { useProjectStore } from '@/state/project-store';
import { SolarIcon } from '../atoms/SolarIcon';
import { BOMTable } from '../organisms/BOMTable';

export function BOMTemplate() {
  const { project } = useProjectStore();

  return (
    <div
      className="bom-layout is-flex is-flex-direction-column"
      style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header
        className="page-toolbar navbar px-4 is-flex is-align-items-center is-justify-content-between no-print"
        style={{
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 56,
        }}
      >
        <div className="page-toolbar-title is-flex is-align-items-center">
          <Link prefetch={false} href="/planner/" className="button is-small is-ghost pl-0">
            <SolarIcon name="solar:arrow-left-linear" size={18} className="mr-1" />
            <span>Back to 3D Planner</span>
          </Link>
          <span className="has-text-grey-light">/</span>
          <span className="has-text-weight-bold is-size-6">{project.name}</span>
        </div>

        <div className="page-toolbar-actions is-flex is-align-items-center">
          <Link prefetch={false} href="/assemble/" className="button is-small is-primary">
            <SolarIcon name="solar:clipboard-check-linear" size={16} className="mr-1" />
            <span>Open Assembly Guide</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="section p-4 is-flex-grow-1">
        <div className="container" style={{ maxWidth: 1100 }}>
          <BOMTable project={project} />
        </div>
      </main>
    </div>
  );
}
