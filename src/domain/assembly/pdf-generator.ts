import { type jsPDF as JsPDF, jsPDF } from 'jspdf';
import {
  type CadProjectedPart,
  type CadViewSpec,
  deriveCadBalloons,
  deriveCadGeometryBounds,
  deriveCadViewRecipe,
  expandCadBoundsForBalloons,
  projectCadParts,
} from '@/domain/assembly/cad-layout';
import type { HelperPose } from '@/domain/assembly/helper-pose';
import {
  deriveAssemblyPartCallouts,
  splitAssemblyInstruction,
} from '@/domain/assembly/step-presentation';
import type { CabinetDefinition } from '@/domain/catalog/types';
import type { CabinetInstance, RoomProject } from '@/domain/geometry/models';
import type { BuiltCabinetModel, CabinetAssemblyStepDef } from '@/domain/geometry/part-builder';

const PAGE_WIDTH_MM = 215.9;
const PAGE_HEIGHT_MM = 279.4;
const MARGIN_MM = 14;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_BOTTOM_MM = 260;

const COLOR = {
  graphite: [23, 33, 43] as const,
  muted: [62, 76, 90] as const,
  line: [203, 212, 222] as const,
  lineStrong: [115, 130, 146] as const,
  context: [154, 168, 182] as const,
  surface: [247, 248, 250] as const,
  blue: [45, 95, 154] as const,
  blueLight: [234, 241, 248] as const,
  orange: [138, 53, 8] as const,
  orangeLight: [255, 241, 232] as const,
  white: [255, 255, 255] as const,
};

export interface AssemblyPdfInput {
  project: RoomProject;
  cabinet: CabinetInstance;
  definition: CabinetDefinition;
  model: BuiltCabinetModel;
  generatedAt?: Date;
}

export interface AssemblyPdfOptions {
  helperImageByPose?: Partial<Record<HelperPose, string>>;
}

export interface AssemblyPdfResult {
  bytes: Uint8Array;
  filename: string;
  pageCount: number;
}

function setTextColor(doc: JsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(...color);
}

function setFillColor(doc: JsPDF, color: readonly [number, number, number]) {
  doc.setFillColor(...color);
}

function setDrawColor(doc: JsPDF, color: readonly [number, number, number]) {
  doc.setDrawColor(...color);
}

function wrapText(doc: JsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(text, width) as string[];
}

function drawPageHeader(doc: JsPDF, title: string, subtitle: string) {
  setFillColor(doc, COLOR.graphite);
  doc.rect(0, 0, PAGE_WIDTH_MM, 21, 'F');
  setTextColor(doc, COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, MARGIN_MM, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitle, MARGIN_MM, 15);
}

function drawContinuationHeader(doc: JsPDF, input: AssemblyPdfInput, step: CabinetAssemblyStepDef) {
  setFillColor(doc, COLOR.graphite);
  doc.rect(0, 0, PAGE_WIDTH_MM, 21, 'F');
  setTextColor(doc, COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(`Step ${step.stepNumber} continued · ${step.title}`, MARGIN_MM, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${input.definition.code} · Assembly guide`, MARGIN_MM, 15);
}

function drawPageFooter(doc: JsPDF, project: RoomProject) {
  const pageNumber = doc.getNumberOfPages();
  setDrawColor(doc, COLOR.line);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_MM, PAGE_HEIGHT_MM - 12, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 12);
  setTextColor(doc, COLOR.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${project.name} · Revision ${project.revision}`, MARGIN_MM, PAGE_HEIGHT_MM - 7);
  doc.text(`Page ${pageNumber}`, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 7, {
    align: 'right',
  });
}

function uniqueStepValues(
  steps: CabinetAssemblyStepDef[],
  selector: (step: CabinetAssemblyStepDef) => string[],
): string[] {
  return [...new Set(steps.flatMap(selector))];
}

function drawMovementArrow(doc: JsPDF, fromX: number, fromY: number, toX: number, toY: number) {
  setDrawColor(doc, COLOR.graphite);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 1, 0.5, 1], 0);
  doc.line(fromX, fromY, toX, toY);
  doc.setLineDashPattern([], 0);

  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const length = Math.hypot(deltaX, deltaY);
  if (length === 0) return;
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const head = 2;
  doc.line(
    toX,
    toY,
    toX - unitX * head - unitY * head * 0.5,
    toY - unitY * head + unitX * head * 0.5,
  );
  doc.line(
    toX,
    toY,
    toX - unitX * head + unitY * head * 0.5,
    toY - unitY * head - unitX * head * 0.5,
  );
}

function drawSectionHatch(doc: JsPDF, x: number, y: number, width: number, height: number) {
  setDrawColor(doc, COLOR.lineStrong);
  doc.setLineWidth(0.18);
  const gap = 2.4;
  for (let diagonal = -height; diagonal < width; diagonal += gap) {
    const x1 = Math.max(0, diagonal);
    const y1 = Math.max(0, -diagonal);
    const x2 = Math.min(width, height + diagonal);
    const y2 = Math.min(height, width - diagonal);
    if (x2 > x1 && y2 > y1) doc.line(x + x1, y + y1, x + x2, y + y2);
  }
}

function drawCadPart(
  doc: JsPDF,
  item: CadProjectedPart,
  highlightedIds: ReadonlySet<string>,
  originX: number,
  originY: number,
  scale: number,
) {
  const partX = originX + (item.position.x - item.width / 2) * scale;
  const partY = originY + (item.position.y - item.height / 2) * scale;
  const partWidth = Math.max(0.6, item.width * scale);
  const partHeight = Math.max(0.6, item.height * scale);
  const skewDepth = Math.min(4, item.skewDepth * scale);
  const isHighlighted = highlightedIds.has(item.part.id);
  const fill = isHighlighted
    ? COLOR.orangeLight
    : item.state === 'active'
      ? COLOR.blueLight
      : COLOR.white;
  const stroke = isHighlighted
    ? COLOR.orange
    : item.state === 'active'
      ? COLOR.graphite
      : item.state === 'complete'
        ? COLOR.lineStrong
        : COLOR.context;

  setFillColor(doc, fill);
  setDrawColor(doc, stroke);
  doc.setLineWidth(
    isHighlighted ? 0.55 : item.state === 'active' ? 0.5 : item.state === 'complete' ? 0.32 : 0.25,
  );
  doc.setLineDashPattern(item.hidden ? [1.4, 1] : [], 0);
  doc.rect(partX, partY, partWidth, partHeight, item.hidden ? 'S' : 'FD');
  if (skewDepth > 1) {
    doc.line(partX, partY, partX + skewDepth, partY - skewDepth);
    doc.line(partX + partWidth, partY, partX + partWidth + skewDepth, partY - skewDepth);
    doc.line(
      partX + skewDepth,
      partY - skewDepth,
      partX + partWidth + skewDepth,
      partY - skewDepth,
    );
  }
  doc.setLineDashPattern([], 0);
  if (item.sectioned) drawSectionHatch(doc, partX, partY, partWidth, partHeight);
}

function drawCadView(
  doc: JsPDF,
  model: BuiltCabinetModel,
  step: CabinetAssemblyStepDef,
  viewSpec: CadViewSpec,
  x: number,
  y: number,
  width: number,
  height: number,
  primary: boolean,
  showCaption = true,
) {
  setFillColor(doc, COLOR.white);
  setDrawColor(doc, COLOR.line);
  doc.setLineWidth(0.25);
  doc.rect(x, y, width, height, 'FD');

  const parts = projectCadParts(model, step, viewSpec);
  const geometry = deriveCadGeometryBounds(parts);
  const callouts = deriveAssemblyPartCallouts(model, step);
  const balloons = deriveCadBalloons(parts, callouts, geometry);
  const bounds = expandCadBoundsForBalloons(geometry, balloons, 3);
  const captionHeight = showCaption ? 7 : 2;
  const scale = Math.min((width - 6) / bounds.width, (height - captionHeight - 4) / bounds.height);
  const originX = x + (width - bounds.width * scale) / 2 - bounds.x * scale;
  const originY = y + (height - captionHeight - bounds.height * scale) / 2 - bounds.y * scale;
  const projectedById = new Map(parts.map((part) => [part.part.id, part]));
  const highlightedIds = new Set(
    step.highlightPartIds.filter((partId) => projectedById.has(partId)),
  );

  for (const item of parts) {
    if (
      item.state !== 'active' ||
      Math.hypot(item.position.x - item.assembled.x, item.position.y - item.assembled.y) <= 0.1
    ) {
      continue;
    }
    drawMovementArrow(
      doc,
      originX + item.position.x * scale,
      originY + item.position.y * scale,
      originX + item.assembled.x * scale,
      originY + item.assembled.y * scale,
    );
  }

  for (const item of parts) {
    drawCadPart(doc, item, highlightedIds, originX, originY, scale);
  }

  const showCuttingPlane =
    primary &&
    ((step.stepNumber === 4 && viewSpec.orientation === 'rear') ||
      (step.stepNumber === 5 && viewSpec.orientation === 'front'));
  if (showCuttingPlane) {
    const cuttingX = originX + (geometry.left + geometry.width / 2) * scale;
    setDrawColor(doc, COLOR.muted);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([2, 1, 0.5, 1], 0);
    doc.line(cuttingX, originY + geometry.top * scale, cuttingX, originY + geometry.bottom * scale);
    doc.setLineDashPattern([], 0);
    setTextColor(doc, COLOR.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('A', cuttingX, originY + geometry.top * scale - 1.5, { align: 'center' });
    doc.text('A', cuttingX, originY + geometry.bottom * scale + 3, { align: 'center' });
  }

  if (
    viewSpec.orientation === 'top' ||
    viewSpec.orientation === 'right' ||
    viewSpec.orientation === 'section-right'
  ) {
    setTextColor(doc, COLOR.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    if (viewSpec.orientation === 'top') {
      const axisX = originX + (geometry.left + geometry.width / 2) * scale;
      doc.text('REAR', axisX, originY + geometry.top * scale - 1.5, { align: 'center' });
      doc.text('FRONT', axisX, originY + geometry.bottom * scale + 3, { align: 'center' });
    } else {
      const axisY = originY + geometry.bottom * scale + 3;
      doc.text('REAR', originX + geometry.left * scale, axisY);
      doc.text('FRONT', originX + geometry.right * scale, axisY, { align: 'right' });
    }
  }

  for (const balloon of balloons) {
    const anchorX = originX + balloon.anchor.x * scale;
    const anchorY = originY + balloon.anchor.y * scale;
    const elbowX = originX + balloon.elbowX * scale;
    const centerX = originX + balloon.center.x * scale;
    const centerY = originY + balloon.center.y * scale;
    const radius = Math.min(3, Math.max(1.5, balloon.radius * scale));
    const edgeX = balloon.side === 'left' ? centerX + radius : centerX - radius;
    setDrawColor(doc, COLOR.muted);
    doc.setLineWidth(0.25);
    doc.line(anchorX, anchorY, elbowX, anchorY);
    doc.line(elbowX, anchorY, elbowX, centerY);
    doc.line(elbowX, centerY, edgeX, centerY);
    setFillColor(doc, COLOR.graphite);
    doc.circle(centerX, centerY, radius, 'F');
    setTextColor(doc, COLOR.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(radius < 2 ? 5.5 : 6.5);
    doc.text(String(balloon.callout.number), centerX, centerY + radius * 0.38, {
      align: 'center',
    });
  }

  if (showCaption) {
    setDrawColor(doc, COLOR.line);
    doc.line(x, y + height - 6, x + width, y + height - 6);
    setTextColor(doc, COLOR.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(viewSpec.label, x + 2.5, y + height - 2.2);
    setTextColor(doc, COLOR.muted);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6);
    doc.text(viewSpec.scaleLabel, x + width - 2.5, y + height - 2.2, {
      align: 'right',
    });
  }
}

function drawCadSheet(
  doc: JsPDF,
  model: BuiltCabinetModel,
  step: CabinetAssemblyStepDef,
  x: number,
  y: number,
  width: number,
  height: number,
  primaryOnly = false,
  showCaption = true,
) {
  const recipe = deriveCadViewRecipe(step);
  if (primaryOnly || recipe.secondary.length === 0) {
    drawCadView(doc, model, step, recipe.primary, x, y, width, height, true, showCaption);
    return;
  }

  const gap = 4;
  const primaryWidth = (width - gap) * 0.68;
  const secondaryWidth = width - gap - primaryWidth;
  drawCadView(doc, model, step, recipe.primary, x, y, primaryWidth, height, true);
  const secondaryHeight = (height - gap * (recipe.secondary.length - 1)) / recipe.secondary.length;
  recipe.secondary.forEach((viewSpec, index) => {
    drawCadView(
      doc,
      model,
      step,
      viewSpec,
      x + primaryWidth + gap,
      y + index * (secondaryHeight + gap),
      secondaryWidth,
      secondaryHeight,
      false,
    );
  });
}

function measureList(doc: JsPDF, items: string[], width: number, fontSize: number, pitch: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  return items.reduce((height, item) => height + wrapText(doc, item, width - 5).length * pitch, 0);
}

function drawList(
  doc: JsPDF,
  title: string,
  items: string[],
  x: number,
  y: number,
  width: number,
  fontSize = 8.5,
  pitch = 4.1,
): number {
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(Math.max(9, fontSize));
  doc.text(title, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  let cursorY = y + 5;
  for (const item of items) {
    const lines = wrapText(doc, item, width - 5);
    doc.text('•', x, cursorY);
    doc.text(lines, x + 4, cursorY);
    cursorY += lines.length * pitch;
  }
  return cursorY;
}

function drawCoverPage(doc: JsPDF, input: AssemblyPdfInput, generatedAt: Date) {
  drawPageHeader(
    doc,
    'CabCraft 3D · Assembly Guide',
    `${input.definition.code} · ${input.definition.name}`,
  );
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Build it square.', MARGIN_MM, 39);
  doc.setFontSize(13);
  doc.text(`${input.definition.name} (${input.definition.code})`, MARGIN_MM, 49);
  setTextColor(doc, COLOR.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `${input.model.widthInches}" W × ${input.model.heightInches}" H × ${input.model.depthInches}" D`,
    MARGIN_MM,
    56,
  );
  doc.text(
    `Project: ${input.project.name} · Revision ${input.project.revision} · Generated ${generatedAt.toLocaleDateString()}`,
    MARGIN_MM,
    62,
  );
  drawCadSheet(
    doc,
    input.model,
    input.model.assemblySteps[0],
    MARGIN_MM,
    68,
    CONTENT_WIDTH_MM,
    78,
    true,
  );

  const tools = uniqueStepValues(input.model.assemblySteps, (step) => step.requiredToolNames);
  const materials = uniqueStepValues(
    input.model.assemblySteps,
    (step) => step.requiredMaterialNames,
  );
  const toolsEnd = drawList(doc, 'Tools to have ready', tools, MARGIN_MM, 155, 86, 8, 3.8);
  const materialsEnd = drawList(doc, 'Fasteners and supplies', materials, 111, 155, 90, 8, 3.8);
  const preparation = wrapText(
    doc,
    'Confirm the cabinet code and all parts before fastening. Follow the selected manufacturer manual when it differs from this verified template. Stop and seek qualified help for unknown wall construction, electrical, plumbing, gas, or structural work.',
    CONTENT_WIDTH_MM - 8,
  );
  const preparationHeight = 13 + preparation.length * 4.6;
  const preparationY = Math.min(
    CONTENT_BOTTOM_MM - preparationHeight,
    Math.max(toolsEnd, materialsEnd) + 5,
  );
  setFillColor(doc, COLOR.orangeLight);
  setDrawColor(doc, COLOR.orange);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_MM, preparationY, CONTENT_WIDTH_MM, preparationHeight, 2, 2, 'FD');
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Before you start', MARGIN_MM + 4, preparationY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(preparation, MARGIN_MM + 4, preparationY + 11);
  drawPageFooter(doc, input.project);
}

function drawSequenceOverviewPage(doc: JsPDF, input: AssemblyPdfInput) {
  doc.addPage('letter', 'portrait');
  drawPageHeader(doc, 'Quick assembly map', `${input.definition.code} · Six-step cabinet sequence`);
  const gap = 7;
  const cardWidth = (CONTENT_WIDTH_MM - gap) / 2;
  const cardHeight = 73;

  input.model.assemblySteps.forEach((step, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN_MM + column * (cardWidth + gap);
    const y = 28 + row * (cardHeight + gap);
    setFillColor(doc, COLOR.white);
    setDrawColor(doc, COLOR.lineStrong);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
    setFillColor(doc, COLOR.graphite);
    doc.circle(x + 7, y + 7, 4, 'F');
    setTextColor(doc, COLOR.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(step.stepNumber), x + 7, y + 8.2, { align: 'center' });
    drawCadSheet(doc, input.model, step, x + 5, y + 8, cardWidth - 10, 48, true, false);
    setTextColor(doc, COLOR.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(wrapText(doc, step.title, cardWidth - 10), x + 5, y + 62);
  });
  drawPageFooter(doc, input.project);
}

function ensurePdfSpace(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  cursorY: number,
  requiredHeight: number,
): number {
  if (cursorY + requiredHeight <= CONTENT_BOTTOM_MM) {
    return cursorY;
  }
  drawPageFooter(doc, input.project);
  doc.addPage('letter', 'portrait');
  drawContinuationHeader(doc, input, step);
  return 30;
}

function drawNumberedInstructions(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  initialCursorY: number,
): number {
  let cursorY = ensurePdfSpace(doc, input, step, initialCursorY, 9);
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Instructions', MARGIN_MM, cursorY);
  cursorY += 7;

  const instructions = splitAssemblyInstruction(step.actionInstruction);
  instructions.forEach((instruction, index) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = wrapText(doc, instruction, CONTENT_WIDTH_MM - 10);
    cursorY = ensurePdfSpace(doc, input, step, cursorY, lines.length * 5 + 5);
    setTextColor(doc, COLOR.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${index + 1}.`, MARGIN_MM, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, MARGIN_MM + 8, cursorY);
    cursorY += lines.length * 5 + 5;
  });
  return cursorY;
}

function drawRequirements(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  initialCursorY: number,
): number {
  const columnGap = 7;
  const columnWidth = (CONTENT_WIDTH_MM - columnGap) / 2;
  const leftHeight = measureList(doc, step.requiredToolNames, columnWidth - 8, 9, 4.5);
  const rightHeight = measureList(doc, step.requiredMaterialNames, columnWidth - 8, 9, 4.5);
  const stripHeight = Math.max(24, 14 + Math.max(leftHeight, rightHeight));
  const cursorY = ensurePdfSpace(doc, input, step, initialCursorY, stripHeight + 5);
  setFillColor(doc, COLOR.surface);
  setDrawColor(doc, COLOR.line);
  doc.roundedRect(MARGIN_MM, cursorY, CONTENT_WIDTH_MM, stripHeight, 2, 2, 'FD');
  drawList(
    doc,
    'Required tools',
    step.requiredToolNames,
    MARGIN_MM + 4,
    cursorY + 8,
    columnWidth - 8,
    9,
    4.5,
  );
  drawList(
    doc,
    'Fasteners and supplies',
    step.requiredMaterialNames,
    MARGIN_MM + columnWidth + columnGap + 4,
    cursorY + 8,
    columnWidth - 8,
    9,
    4.5,
  );
  return cursorY + stripHeight + 5;
}

function drawNote(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  initialCursorY: number,
  title: string,
  text: string,
  kind: 'safety' | 'quality',
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = wrapText(doc, text, CONTENT_WIDTH_MM - 8);
  const height = 14 + lines.length * 4.6;
  const cursorY = ensurePdfSpace(doc, input, step, initialCursorY, height + 5);
  setFillColor(doc, kind === 'safety' ? COLOR.orangeLight : COLOR.blueLight);
  setDrawColor(doc, kind === 'safety' ? COLOR.orange : COLOR.blue);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_MM, cursorY, CONTENT_WIDTH_MM, height, 2, 2, 'FD');
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title, MARGIN_MM + 4, cursorY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(lines, MARGIN_MM + 4, cursorY + 11);
  return cursorY + height + 5;
}

function drawHelperImage(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  initialCursorY: number,
  helperImage?: string,
): number {
  if (!helperImage) return initialCursorY;
  const cursorY = ensurePdfSpace(doc, input, step, initialCursorY, 28);
  try {
    doc.addImage(helperImage, 'PNG', MARGIN_MM, cursorY, 24, 24, undefined, 'FAST');
    return cursorY + 28;
  } catch {
    return initialCursorY;
  }
}

function drawStepPage(
  doc: JsPDF,
  input: AssemblyPdfInput,
  step: CabinetAssemblyStepDef,
  options?: AssemblyPdfOptions,
) {
  doc.addPage('letter', 'portrait');
  drawPageHeader(
    doc,
    `Step ${step.stepNumber} of ${input.model.assemblySteps.length}`,
    `${input.definition.code} · ${step.title}`,
  );
  drawCadSheet(doc, input.model, step, MARGIN_MM, 27, CONTENT_WIDTH_MM, 110);

  let cursorY = 145;
  setTextColor(doc, COLOR.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titleLines = wrapText(doc, step.title, CONTENT_WIDTH_MM);
  doc.text(titleLines, MARGIN_MM, cursorY);
  cursorY += titleLines.length * 6 + 5;
  cursorY = drawNumberedInstructions(doc, input, step, cursorY);
  cursorY = drawRequirements(doc, input, step, cursorY);
  cursorY = drawNote(doc, input, step, cursorY, 'Safety', step.safetyNote, 'safety');
  cursorY = drawNote(doc, input, step, cursorY, 'Check your work', step.checkWorkNote, 'quality');
  cursorY = drawHelperImage(
    doc,
    input,
    step,
    cursorY,
    options?.helperImageByPose?.[step.helperPose],
  );
  drawPageFooter(doc, input.project);
}

export async function createAssemblyPdf(
  input: AssemblyPdfInput,
  options?: AssemblyPdfOptions,
): Promise<AssemblyPdfResult> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'letter',
    orientation: 'portrait',
    compress: false,
  });
  const generatedAt = input.generatedAt ?? new Date();
  doc.setProperties({
    title: `${input.definition.code} Assembly Guide`,
    subject: `Parametric assembly instructions for ${input.definition.name}`,
    author: 'CabCraft 3D',
    creator: 'CabCraft 3D',
    keywords: 'cabinet, assembly, installation, bill of materials',
  });

  drawCoverPage(doc, input, generatedAt);
  drawSequenceOverviewPage(doc, input);
  for (const step of input.model.assemblySteps) {
    drawStepPage(doc, input, step, options);
  }

  const arrayBuffer = doc.output('arraybuffer');
  const safeProjectName = input.project.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return {
    bytes: new Uint8Array(arrayBuffer),
    filename: `${safeProjectName}-${input.definition.code}-assembly-guide-r${input.project.revision}.pdf`,
    pageCount: doc.getNumberOfPages(),
  };
}

export function downloadAssemblyPdf(result: AssemblyPdfResult) {
  const blob = new Blob([result.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
