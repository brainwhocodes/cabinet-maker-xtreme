import { beforeEach, describe, expect, it } from 'vitest';
import { type AssemblyPdfInput, createAssemblyPdf } from '@/domain/assembly/pdf-generator';
import { resolveCabinetSpec } from '@/domain/cabinet/resolve-cabinet-spec';
import { getCabinetDefinitionByCode } from '@/domain/catalog/standard-cabinets';
import { buildCabinetParts } from '@/domain/geometry/part-builder';
import { useProjectStore } from '@/state/project-store';

const GENERATED_AT = new Date('2026-08-31T12:00:00.000Z');
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';

function createInput(): AssemblyPdfInput {
  const project = useProjectStore.getState().project;
  const cabinet = project.cabinets[0];
  const definition = getCabinetDefinitionByCode(cabinet.definitionId)!;
  const model = buildCabinetParts(resolveCabinetSpec(definition, cabinet));
  return { project, cabinet, definition, model, generatedAt: GENERATED_AT };
}

describe('Printable assembly PDF', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it('generates a cover, quick map, and readable pages for every assembly step', async () => {
    const input = createInput();
    const result = await createAssemblyPdf(input, {});

    expect(result.pageCount).toBeGreaterThanOrEqual(input.model.assemblySteps.length + 2);
    expect(result.filename).toContain(`${input.definition.code}-assembly-guide`);
    expect(result.filename).toMatch(/-assembly-guide-r\d+\.pdf$/);
    expect(result.bytes.byteLength).toBeGreaterThan(10_000);
    expect(new TextDecoder().decode(result.bytes.slice(0, 4))).toBe('%PDF');
    const pdfText = new TextDecoder('latin1').decode(result.bytes);
    expect(pdfText).toContain('Exploded inventory');
    expect(pdfText).toContain('Rear elevation');
    expect(pdfText).toContain('Section A');
    expect(pdfText).toContain('Detail A');
  });

  it('creates continuation pages without clipping the final instruction sentinel', async () => {
    const input = createInput();
    const baseline = await createAssemblyPdf(input, {});
    const longInstruction = Array.from(
      { length: 90 },
      (_, index) => `Long instruction segment ${index + 1} must remain readable.`,
    ).join(' ');
    const finalSentinel = 'CLIP_SENTINEL_FINAL.';
    const longModel = {
      ...input.model,
      assemblySteps: input.model.assemblySteps.map((step) =>
        step.stepNumber === 1
          ? { ...step, actionInstruction: `${longInstruction} ${finalSentinel}` }
          : step,
      ),
    };
    const result = await createAssemblyPdf({ ...input, model: longModel }, {});
    const pdfText = new TextDecoder('latin1').decode(result.bytes);

    expect(result.pageCount).toBeGreaterThan(baseline.pageCount);
    expect(pdfText).toContain('Step 1 continued');
    expect(pdfText).toContain(finalSentinel);
  });

  it('embeds supplied decoded helper PNGs as PDF image objects', async () => {
    const input = createInput();
    const result = await createAssemblyPdf(input, {
      helperImageByPose: { measuring: TINY_PNG },
    });
    const pdfText = new TextDecoder('latin1').decode(result.bytes);

    expect(pdfText).toContain('/Subtype /Image');
  });
});
