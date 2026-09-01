'use client';

import { useEffect, useRef, useState } from 'react';
import { validateRoomProject } from '@/domain/validation/rules';
import { PlannerCanvas } from '@/rendering/planner-scene/PlannerCanvas';
import { useProjectStore } from '@/state/project-store';
import { Button } from '../atoms/Button';
import { ViewportToolDock } from '../molecules/ViewportToolDock';
import { AutoFitModal } from '../organisms/AutoFitModal';
import { CatalogRail } from '../organisms/CatalogRail';
import { PlannerInspector } from '../organisms/PlannerInspector';
import { PlannerTopBar } from '../organisms/PlannerTopBar';
import { RunCompletionDialog } from '../organisms/RunCompletionDialog';
import { SceneInspectionPanel } from '../organisms/SceneInspectionPanel';
import { SelectionActionBar } from '../organisms/SelectionActionBar';
import { SemanticCabinetList } from '../organisms/SemanticCabinetList';
import { ValidationPanel } from '../organisms/ValidationPanel';
import { WebMCPActivityDrawer } from '../organisms/WebMCPActivityDrawer';

export function PlannerTemplate() {
  const [isAutoFitOpen, setIsAutoFitOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [showSemanticList, setShowSemanticList] = useState(false);
  const [isCatalogDrawerOpen, setIsCatalogDrawerOpen] = useState(false);
  const [isInspectorDrawerOpen, setIsInspectorDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const catalogHeadingRef = useRef<HTMLElement>(null);
  const inspectorHeadingRef = useRef<HTMLElement>(null);

  const { project, scenePreview, selectSceneEntity } = useProjectStore();
  const validationReport = validateRoomProject(project);
  const isMobileDrawerOpen = isCatalogDrawerOpen || isInspectorDrawerOpen;

  useEffect(() => {
    const query = window.matchMedia('(width <= 1100px)');
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (scenePreview?.kind === 'placement') setIsCatalogDrawerOpen(false);
  }, [scenePreview]);

  const openDrawer = (drawer: 'catalog' | 'properties') => {
    setIsCatalogDrawerOpen(drawer === 'catalog');
    setIsInspectorDrawerOpen(drawer === 'properties');
    requestAnimationFrame(() =>
      (drawer === 'catalog' ? catalogHeadingRef.current : inspectorHeadingRef.current)?.focus(),
    );
  };

  const closeDrawer = (drawer: 'catalog' | 'properties') => {
    drawer === 'catalog' ? setIsCatalogDrawerOpen(false) : setIsInspectorDrawerOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(`[data-planner-drawer-trigger="${drawer}"]`)
        ?.focus(),
    );
  };

  const closeMobileDrawers = () => {
    if (isCatalogDrawerOpen) closeDrawer('catalog');
    if (isInspectorDrawerOpen) closeDrawer('properties');
  };

  useEffect(() => {
    if (!isCompact || !isMobileDrawerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeMobileDrawers();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });

  return (
    <div
      className="planner-layout is-flex is-flex-direction-column"
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <PlannerTopBar onOpenAutoFit={() => setIsAutoFitOpen(true)} />

      <div className="planner-workspace is-flex is-flex-grow-1">
        {isMobileDrawerOpen && (
          <button
            type="button"
            className="planner-drawer-backdrop"
            aria-label="Close planner drawer"
            onClick={closeMobileDrawers}
          />
        )}

        <div
          className={`planner-side-panel planner-catalog-panel ${isCatalogDrawerOpen ? 'is-open' : ''}`}
          inert={isCompact && !isCatalogDrawerOpen ? true : undefined}
          aria-hidden={isCompact && !isCatalogDrawerOpen}
        >
          <div className="planner-mobile-drawer-header">
            <strong ref={catalogHeadingRef} tabIndex={-1}>
              Cabinet catalog
            </strong>
            <button
              type="button"
              className="delete"
              aria-label="Close cabinet catalog"
              onClick={() => closeDrawer('catalog')}
            />
          </div>
          <CatalogRail />
        </div>

        <main
          className="is-flex-grow-1"
          style={{ position: 'relative', height: '100%', overflow: 'hidden' }}
          aria-label="3D Cabinet Design Studio Canvas"
        >
          <PlannerCanvas />
          <ViewportToolDock onOpenAutoFit={() => setIsAutoFitOpen(true)} />
          <SelectionActionBar />
          {scenePreview?.kind !== 'placement' && <SceneInspectionPanel />}

          <div className="planner-canvas-actions">
            <Button
              size="sm"
              icon="solar:widget-3-linear"
              className="planner-mobile-action"
              data-planner-drawer-trigger="catalog"
              onClick={() => openDrawer('catalog')}
            >
              Catalog
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSemanticList(!showSemanticList)}
              title="Toggle accessible non-canvas scene table"
            >
              {showSemanticList ? 'Hide scene table' : 'Scene table'} ({project.cabinets.length})
            </Button>
            <Button
              size="sm"
              icon="solar:settings-linear"
              className="planner-mobile-action"
              data-planner-drawer-trigger="properties"
              onClick={() => openDrawer('properties')}
            >
              Properties
            </Button>
          </div>

          {showSemanticList && (
            <div className="planner-semantic-table box p-3 has-background-white">
              <div className="is-flex is-align-items-center is-justify-content-between mb-2">
                <span className="has-text-weight-bold is-size-7">
                  Complete scene list (Keyboard Navigable)
                </span>
                <button
                  type="button"
                  className="delete is-small"
                  aria-label="Close cabinet table"
                  onClick={() => setShowSemanticList(false)}
                />
              </div>
              <SemanticCabinetList />
            </div>
          )}

          <ValidationPanel
            report={validationReport}
            onSelectCabinet={(id) => selectSceneEntity(id, 'replace')}
            isOpen={isValidationOpen}
            onToggle={() => setIsValidationOpen(!isValidationOpen)}
          />
        </main>

        <div
          className={`planner-side-panel planner-inspector-panel ${isInspectorDrawerOpen ? 'is-open' : ''}`}
          inert={isCompact && !isInspectorDrawerOpen ? true : undefined}
          aria-hidden={isCompact && !isInspectorDrawerOpen}
        >
          <div className="planner-mobile-drawer-header">
            <strong ref={inspectorHeadingRef} tabIndex={-1}>
              Properties
            </strong>
            <button
              type="button"
              className="delete"
              aria-label="Close properties"
              onClick={() => closeDrawer('properties')}
            />
          </div>
          <PlannerInspector />
        </div>
        <RunCompletionDialog />
      </div>

      <AutoFitModal isOpen={isAutoFitOpen} onClose={() => setIsAutoFitOpen(false)} />
      <WebMCPActivityDrawer />
    </div>
  );
}
