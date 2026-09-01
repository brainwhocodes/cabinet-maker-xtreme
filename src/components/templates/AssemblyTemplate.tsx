'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { loadAssemblyHelperImages } from '@/domain/assembly/helper-image-loader';
import {
  type AssemblyPdfInput,
  createAssemblyPdf,
  downloadAssemblyPdf,
} from '@/domain/assembly/pdf-generator';
import {
  deriveAssemblyPartCallouts,
  deriveAssemblyPartStates,
} from '@/domain/assembly/step-presentation';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import type { RoomProject } from '@/domain/geometry/models';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { useProjectStore } from '@/state/project-store';
import { AssemblyGuidancePanel } from '../organisms/assembly/AssemblyGuidancePanel';
import { AssemblyOverviewDialog } from '../organisms/assembly/AssemblyOverviewDialog';
import { type AssemblyDiagramMode, AssemblyStage } from '../organisms/assembly/AssemblyStage';
import { AssemblyStepRail } from '../organisms/assembly/AssemblyStepRail';

const EMPTY_COMPLETED_STEPS = new Set<number>();

async function buildAndDownloadAssemblyPdf(input: AssemblyPdfInput) {
  const helperImageByPose = await loadAssemblyHelperImages();
  const result = await createAssemblyPdf(input, { helperImageByPose });
  downloadAssemblyPdf(result);
  return result;
}

export function AssemblyTemplate() {
  const { project } = useProjectStore();
  if (project.cabinets.length === 0) {
    return (
      <main className="assembly-empty-state">
        <h1>No cabinets ready for assembly</h1>
        <p>Place a stock or built cabinet in the planner to generate exact assembly steps.</p>
        <Link prefetch={false} href="/planner/" className="button is-primary">
          Open planner
        </Link>
      </main>
    );
  }
  return <AssemblyWorkspace project={project} />;
}

function AssemblyWorkspace({ project }: { project: RoomProject }) {
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [activeStepNumber, setActiveStepNumber] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [highlightedPartId, setHighlightedPartId] = useState<string>();
  const [diagramMode, setDiagramMode] = useState<AssemblyDiagramMode>('manual');
  const activeCabinet =
    project.cabinets.find((cabinet) => cabinet.id === selectedCabinetId) ?? project.cabinets[0];
  const definition = getCabinetDefinitionByCode(activeCabinet.definitionId);
  if (!definition) throw new Error(`Unknown cabinet definition: ${activeCabinet.definitionId}`);
  const model = useMemo(
    () => buildCabinetParts(resolveCabinetSpec(definition, activeCabinet)),
    [activeCabinet, definition],
  );
  const currentStep =
    model.assemblySteps.find((step) => step.stepNumber === activeStepNumber) ??
    model.assemblySteps[0];
  const cabinetCompletedSet = completedSteps[activeCabinet.id] ?? EMPTY_COMPLETED_STEPS;
  const partStates = useMemo(
    () => deriveAssemblyPartStates(model, activeStepNumber),
    [activeStepNumber, model],
  );
  const callouts = useMemo(
    () => deriveAssemblyPartCallouts(model, currentStep),
    [currentStep, model],
  );
  const cabinetOptions = useMemo(
    () =>
      project.cabinets.map((cabinet) => ({
        value: cabinet.id,
        label: `${cabinet.definitionId} - ${cabinet.name}`,
      })),
    [project.cabinets],
  );

  const goToStep = (stepNumber: number) => {
    setActiveStepNumber(stepNumber);
    setHighlightedPartId(undefined);
  };
  const toggleStepComplete = () => {
    setCompletedSteps((current) => {
      const next = new Set(current[activeCabinet.id] ?? EMPTY_COMPLETED_STEPS);
      next.has(activeStepNumber) ? next.delete(activeStepNumber) : next.add(activeStepNumber);
      return { ...current, [activeCabinet.id]: next };
    });
  };
  const highlightPart = (partId: string | undefined) => {
    setHighlightedPartId(
      partId && partStates.get(partId) !== 'future' && partStates.has(partId) ? partId : undefined,
    );
  };
  const downloadPdf = async () => {
    if (!activeCabinet) return;
    setIsGeneratingPdf(true);
    setPdfStatus('Building the printable assembly guide…');
    try {
      const result = await buildAndDownloadAssemblyPdf({
        project,
        cabinet: activeCabinet,
        definition,
        model,
      });
      setPdfStatus(`Downloaded ${result.pageCount}-page guide: ${result.filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PDF generation failure';
      setPdfStatus(`Could not generate PDF: ${message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const relatedBuiltIns = project.builtInElements.filter((element) =>
    element.attachedCabinetIds.includes(activeCabinet.id),
  );

  return (
    <AssemblyOverviewDialog
      model={model}
      activeStepNumber={activeStepNumber}
      onSelectStep={goToStep}
      toolbarProps={{
        cabinetOptions,
        selectedCabinetId: activeCabinet.id,
        onCabinetChange: (cabinetId) => {
          setSelectedCabinetId(cabinetId);
          goToStep(1);
        },
        onDownloadPdf: downloadPdf,
        onPrint: () => window.print(),
        isGeneratingPdf,
        pdfStatus,
      }}
    >
      <main className="assembly-focus-main">
        <AssemblyStepRail
          steps={model.assemblySteps}
          activeStepNumber={activeStepNumber}
          completedSteps={cabinetCompletedSet}
          onSelectStep={goToStep}
        />
        <div className="assembly-focus-workspace">
          <AssemblyStage
            model={model}
            step={currentStep}
            mode={diagramMode}
            highlightedPartId={highlightedPartId}
            onModeChange={(mode) => {
              setDiagramMode(mode);
              setHighlightedPartId(undefined);
            }}
            onHighlightPart={highlightPart}
          />
          <AssemblyGuidancePanel
            model={model}
            step={currentStep}
            cabinetName={definition.name}
            partStates={partStates}
            callouts={callouts}
            highlightedPartId={highlightedPartId}
            isCompleted={cabinetCompletedSet.has(activeStepNumber)}
            onHighlightPart={highlightPart}
            onToggleComplete={toggleStepComplete}
            onPrevious={activeStepNumber > 1 ? () => goToStep(activeStepNumber - 1) : undefined}
            onNext={
              activeStepNumber < model.assemblySteps.length
                ? () => goToStep(activeStepNumber + 1)
                : undefined
            }
          />
        </div>
        {relatedBuiltIns.length > 0 && (
          <aside className="assembly-related-built-ins">
            <h2>Related run preparation</h2>
            <ul>
              {relatedBuiltIns.map((element) => (
                <li key={element.id}>
                  {element.name}: {element.width / 16}&quot; × {element.height / 16}&quot; ×{' '}
                  {element.depth / 16}&quot;
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
    </AssemblyOverviewDialog>
  );
}
