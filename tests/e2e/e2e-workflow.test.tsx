import { beforeEach, describe, expect, it } from 'vitest';
import { computeProjectBOM } from '@/domain/bom/compute-project-bom';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { sixteenthsToInches } from '@/domain/geometry/units';
import { generateAutoFitProposals } from '@/domain/layout/auto-fit';
import { validateRoomProject } from '@/domain/validation/rules';
import { useProjectStore } from '@/state/project-store';

describe('End-to-End Kitchen Planning, BOM & Assembly Workflow', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it('completes the full end-to-end room design to BOM to assembly pipeline', () => {
    const store = useProjectStore.getState();

    // 1. Configure Room Dimensions: 12ft x 12ft (144" x 144")
    store.setRoomDimensions(144, 144, 96, 'l_shape');
    expect(sixteenthsToInches(useProjectStore.getState().project.width)).toBe(144);
    expect(useProjectStore.getState().project.layoutShape).toBe('l_shape');

    // 2. Run Auto-Fit Wall Optimizer with Sink Base Centering
    const wall1 = useProjectStore.getState().project.walls[0];
    const proposals = generateAutoFitProposals({
      project: useProjectStore.getState().project,
      wallId: wall1.id,
      wallLength: wall1.length,
      targetCategory: 'base',
      includeSinkBase: true,
    });

    expect(proposals.length).toBeGreaterThanOrEqual(1);
    const bestProposal = proposals[0];
    expect(bestProposal.cabinets.length).toBeGreaterThan(0);
    expect(bestProposal.scores.overallScore).toBeGreaterThan(60);

    // 3. Apply the Staged Proposal to the Project
    const staged = store.stageAutoFitProposal(bestProposal);
    const preview = useProjectStore.getState().scenePreview!;
    expect(staged.ok).toBe(true);
    expect(store.commitScenePreview(preview.token, preview.expectedRevision).ok).toBe(true);
    const updatedCabinets = useProjectStore.getState().project.cabinets;
    expect(updatedCabinets.filter((cabinet) => cabinet.category !== 'wall').length).toBe(
      bestProposal.cabinets.length,
    );
    expect(updatedCabinets.filter((cabinet) => cabinet.category === 'wall')).toHaveLength(2);

    // 4. Validate NKBA & Clearance Compliance
    const validation = validateRoomProject(useProjectStore.getState().project);
    expect(validation.isValid).toBe(true);
    expect(validation.errorCount).toBe(0);

    const runCompletion = useProjectStore
      .getState()
      .completeBuiltInRuns(wall1.id, undefined, useProjectStore.getState().project.revision);
    expect(runCompletion.ok).toBe(true);
    const runPreview = useProjectStore.getState().scenePreview!;
    expect(
      useProjectStore.getState().commitScenePreview(runPreview.token, runPreview.expectedRevision)
        .ok,
    ).toBe(true);

    // 5. Generate retailer-ready Bill of Materials (BOM)
    const bom = computeProjectBOM(useProjectStore.getState().project);
    expect(bom.rows.length).toBeGreaterThanOrEqual(4); // Cabinets, Trim, Hardware, Fasteners
    expect(bom.knownGrandTotalUSD).toBeGreaterThan(500);
    expect(bom.countertopSqFt).toBeGreaterThan(10);

    const cabinetBOMRows = bom.rows.filter((r) => r.category === 'cabinet');
    expect(cabinetBOMRows.length).toBeGreaterThan(0);
    for (const row of cabinetBOMRows) {
      if (row.unitPriceUSD === null) {
        expect(row.sku).toBeUndefined();
        expect(row.retailSearchUrl).toBeUndefined();
        expect(row.notes).toContain('Price unavailable');
      } else {
        expect(row.sku).toBeTruthy();
        expect(row.retailSearchUrl).toContain('homedepot.com');
      }
      expect(row.dataStatus).toBe('search-only');
    }

    // 6. Generate Step-by-Step Assembly Guide for the Placed Sink Base
    const sinkCab =
      updatedCabinets.find((c) => c.definitionId.startsWith('SB')) || updatedCabinets[0];
    const def = getCabinetDefinitionByCode(sinkCab.definitionId)!;
    expect(def).toBeDefined();

    const assemblyModel = buildCabinetParts(resolveCabinetSpec(def, sinkCab));
    expect(assemblyModel.assemblySteps.length).toBe(6);
    expect(assemblyModel.parts.length).toBeGreaterThan(5);

    // Verify step requirements and tools
    const step1 = assemblyModel.assemblySteps[0];
    expect(step1.requiredToolNames).toContain('Tape Measure');
    expect(step1.helperPose).toBe('measuring');

    // 7. Verify Undo / Redo Transaction Integrity
    const revisionBeforeUndo = useProjectStore.getState().project.revision;
    store.undo();
    expect(useProjectStore.getState().project.revision).toBeLessThan(revisionBeforeUndo);

    store.redo();
    expect(useProjectStore.getState().project.revision).toBe(revisionBeforeUndo);
  });
});
