import type {
  BuiltCabinetModel,
  CabinetAssemblyStepDef,
  CabinetPartMeshSpec,
} from '@/domain/geometry/part-builder';

export type AssemblyPartState = 'context' | 'complete' | 'active' | 'future';

export interface AssemblyPartCallout {
  partId: string;
  number: number;
  label: string;
}

export function splitAssemblyInstruction(text: string): string[] {
  const instructions: string[] = [];
  for (const match of text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []) {
    const instruction = match.trim();
    if (instruction) instructions.push(instruction);
  }
  return instructions;
}

function getIntroductionStep(part: CabinetPartMeshSpec): number {
  if (
    part.id === 'panel_side_left' ||
    part.id === 'panel_side_right' ||
    part.id === 'panel_bottom_deck'
  ) {
    return 2;
  }

  if (part.id.startsWith('stretcher_top_') || part.id === 'panel_top_deck') {
    return 3;
  }

  if (part.id === 'panel_back_board') {
    return 4;
  }

  if (
    part.category === 'shelf' ||
    part.category === 'shelf_hardware' ||
    part.id.startsWith('shelf_')
  ) {
    return 5;
  }

  if (part.category === 'face_frame' || part.category === 'finished_end') {
    return 6;
  }

  return 6;
}

export function deriveAssemblyPartStates(
  model: BuiltCabinetModel,
  activeStepNumber: number,
): Map<string, AssemblyPartState> {
  const states = new Map<string, AssemblyPartState>();

  if (activeStepNumber === 1) {
    for (const part of model.parts) {
      states.set(part.id, 'context');
    }
  } else {
    for (const part of model.parts) {
      const introductionStep = getIntroductionStep(part);
      states.set(
        part.id,
        introductionStep < activeStepNumber
          ? 'complete'
          : introductionStep === activeStepNumber
            ? 'active'
            : 'future',
      );
    }
  }

  const activeStep = model.assemblySteps.find((step) => step.stepNumber === activeStepNumber);
  if (activeStep) {
    for (const partId of activeStep.activePartIds) {
      if (states.has(partId)) {
        states.set(partId, 'active');
      }
    }
  }

  return states;
}

export function deriveAssemblyPartCallouts(
  model: BuiltCabinetModel,
  step: CabinetAssemblyStepDef,
): AssemblyPartCallout[] {
  const partById = new Map(model.parts.map((part) => [part.id, part]));
  const seen = new Set<string>();
  const callouts: AssemblyPartCallout[] = [];

  for (const partId of step.activePartIds) {
    const part = partById.get(partId);
    if (!part || seen.has(partId) || part.id.startsWith('shelf_pin_')) {
      continue;
    }

    seen.add(partId);
    callouts.push({
      partId,
      number: callouts.length + 1,
      label: part.name,
    });
  }

  return callouts;
}
