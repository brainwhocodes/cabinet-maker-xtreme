'use client';

import { useId, useMemo, useState } from 'react';
import {
  type CadProjectedPart,
  type CadViewSpec,
  deriveCadBalloons,
  deriveCadGeometryBounds,
  deriveCadViewRecipe,
  expandCadBoundsForBalloons,
  projectCadParts,
} from '@/domain/assembly/cad-layout';
import {
  type AssemblyPartCallout,
  deriveAssemblyPartCallouts,
  deriveAssemblyPartStates,
} from '@/domain/assembly/step-presentation';
import type { BuiltCabinetModel, CabinetAssemblyStepDef } from '@/domain/geometry/part-builder';

export interface AssemblyLineDiagramProps {
  model: BuiltCabinetModel;
  step: CabinetAssemblyStepDef;
  highlightedPartId?: string;
  className?: string;
  label?: string;
  variant?: 'sheet' | 'thumbnail';
}

interface CadPartStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

function getPartStyle(
  item: CadProjectedPart,
  isStepEmphasized: boolean,
  isUserHighlighted: boolean,
): CadPartStyle {
  if (isStepEmphasized || isUserHighlighted) {
    return {
      fill: '#FFF1E8',
      stroke: '#8A3508',
      strokeWidth: isUserHighlighted ? 2 : 1.75,
    };
  }
  if (item.hidden) {
    return {
      fill: 'none',
      stroke: item.state === 'complete' ? '#738292' : '#9AA8B6',
      strokeWidth: 0.75,
      strokeDasharray: '3 2',
    };
  }
  if (item.state === 'active') {
    return { fill: '#EAF1F8', stroke: '#17212B', strokeWidth: 1.5 };
  }
  if (item.state === 'complete') {
    return { fill: '#FFFFFF', stroke: '#738292', strokeWidth: 0.9 };
  }
  return { fill: '#FFFFFF', stroke: '#9AA8B6', strokeWidth: 0.75 };
}

function CadViewFigure({
  model,
  step,
  viewSpec,
  callouts,
  stepEmphasizedIds,
  highlightedPartId,
  label,
  primary,
  selected,
}: {
  model: BuiltCabinetModel;
  step: CabinetAssemblyStepDef;
  viewSpec: CadViewSpec;
  callouts: AssemblyPartCallout[];
  stepEmphasizedIds: ReadonlySet<string>;
  highlightedPartId?: string;
  label: string;
  primary: boolean;
  selected: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const arrowMarkerId = `cad-arrow-${id}`;
  const hatchPatternId = `cad-hatch-${id}`;
  const projectedParts = useMemo(
    () => projectCadParts(model, step, viewSpec),
    [model, step, viewSpec],
  );
  const geometryBounds = useMemo(() => deriveCadGeometryBounds(projectedParts), [projectedParts]);
  const balloons = useMemo(
    () => deriveCadBalloons(projectedParts, callouts, geometryBounds),
    [callouts, geometryBounds, projectedParts],
  );
  const sheetBounds = useMemo(
    () => expandCadBoundsForBalloons(geometryBounds, balloons),
    [balloons, geometryBounds],
  );
  const axisFontSize = Math.min(
    1.8,
    Math.max(0.9, Math.max(geometryBounds.width, geometryBounds.height) * 0.028),
  );
  const showDepthAxis =
    viewSpec.orientation === 'top' ||
    viewSpec.orientation === 'right' ||
    viewSpec.orientation === 'section-right';
  const showCuttingPlane =
    primary &&
    ((step.stepNumber === 4 && viewSpec.orientation === 'rear') ||
      (step.stepNumber === 5 && viewSpec.orientation === 'front'));

  return (
    <figure
      className={`assembly-cad-view ${primary ? 'is-primary' : 'is-secondary'} ${
        selected ? 'is-selected' : ''
      }`}
      data-cad-view-id={viewSpec.id}
      data-cad-orientation={viewSpec.orientation}
    >
      <svg
        viewBox={`${sheetBounds.x} ${sheetBounds.y} ${sheetBounds.width} ${sheetBounds.height}`}
        role="img"
        aria-label={`${label}, ${viewSpec.label}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id={arrowMarkerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#17212B" />
          </marker>
          <pattern
            id={hatchPatternId}
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="3" stroke="#738292" strokeWidth="0.45" />
          </pattern>
        </defs>

        {projectedParts.map((item) => {
          const moved =
            item.state === 'active' &&
            Math.hypot(item.position.x - item.assembled.x, item.position.y - item.assembled.y) >
              0.1;
          if (!moved) return null;
          return (
            <line
              key={`trail-${item.part.id}`}
              className="assembly-cad-explode-trail"
              x1={item.position.x}
              y1={item.position.y}
              x2={item.assembled.x}
              y2={item.assembled.y}
              stroke="#17212B"
              strokeWidth="0.75"
              strokeDasharray="4 2 1 2"
              markerEnd={`url(#${arrowMarkerId})`}
              vectorEffect="non-scaling-stroke"
              data-explode-trail={item.part.id}
            />
          );
        })}

        {projectedParts.map((item) => {
          const left = item.position.x - item.width / 2;
          const top = item.position.y - item.height / 2;
          const style = getPartStyle(
            item,
            stepEmphasizedIds.has(item.part.id),
            highlightedPartId === item.part.id,
          );
          return (
            <g
              key={item.part.id}
              data-part-id={item.part.id}
              data-part-state={item.state}
              data-hidden-edge={item.hidden || undefined}
              data-sectioned={item.sectioned || undefined}
            >
              <rect
                x={left}
                y={top}
                width={item.width}
                height={item.height}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
                vectorEffect="non-scaling-stroke"
              />
              {item.skewDepth > 0 && (
                <path
                  d={`M ${left} ${top} l ${item.skewDepth} ${-item.skewDepth} h ${item.width} l ${-item.skewDepth} ${item.skewDepth}`}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {item.sectioned && (
                <rect
                  x={left}
                  y={top}
                  width={item.width}
                  height={item.height}
                  fill={`url(#${hatchPatternId})`}
                  stroke="none"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {showCuttingPlane && (
          <g className="assembly-cad-cutting-plane" data-cutting-plane="A-A">
            <line
              x1={geometryBounds.left + geometryBounds.width / 2}
              y1={geometryBounds.top}
              x2={geometryBounds.left + geometryBounds.width / 2}
              y2={geometryBounds.bottom}
              stroke="#3E4C5A"
              strokeWidth="0.9"
              strokeDasharray="5 2 1 2"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={geometryBounds.left + geometryBounds.width / 2}
              y={geometryBounds.top - axisFontSize * 0.7}
              fill="#3E4C5A"
              fontSize={axisFontSize}
              fontWeight="700"
              textAnchor="middle"
            >
              A
            </text>
            <text
              x={geometryBounds.left + geometryBounds.width / 2}
              y={geometryBounds.bottom + axisFontSize * 1.25}
              fill="#3E4C5A"
              fontSize={axisFontSize}
              fontWeight="700"
              textAnchor="middle"
            >
              A
            </text>
          </g>
        )}

        {showDepthAxis && (
          <g className="assembly-cad-axis-labels">
            {viewSpec.orientation === 'top' ? (
              <>
                <text
                  x={geometryBounds.left + geometryBounds.width / 2}
                  y={geometryBounds.top - axisFontSize * 0.7}
                  fill="#3E4C5A"
                  fontSize={axisFontSize}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  REAR
                </text>
                <text
                  x={geometryBounds.left + geometryBounds.width / 2}
                  y={geometryBounds.bottom + axisFontSize * 1.25}
                  fill="#3E4C5A"
                  fontSize={axisFontSize}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  FRONT
                </text>
              </>
            ) : (
              <>
                <text
                  x={geometryBounds.left - axisFontSize * 0.8}
                  y={geometryBounds.bottom + axisFontSize * 1.25}
                  fill="#3E4C5A"
                  fontSize={axisFontSize}
                  fontWeight="700"
                  textAnchor="start"
                >
                  REAR
                </text>
                <text
                  x={geometryBounds.right + axisFontSize * 0.8}
                  y={geometryBounds.bottom + axisFontSize * 1.25}
                  fill="#3E4C5A"
                  fontSize={axisFontSize}
                  fontWeight="700"
                  textAnchor="end"
                >
                  FRONT
                </text>
              </>
            )}
          </g>
        )}

        {balloons.map((balloon) => {
          const balloonEdgeX =
            balloon.side === 'left'
              ? balloon.center.x + balloon.radius
              : balloon.center.x - balloon.radius;
          return (
            <g
              key={balloon.callout.partId}
              className="assembly-cad-balloon"
              data-callout-part-id={balloon.callout.partId}
              data-callout-side={balloon.side}
            >
              <polyline
                points={`${balloon.anchor.x},${balloon.anchor.y} ${balloon.elbowX},${balloon.anchor.y} ${balloon.elbowX},${balloon.center.y} ${balloonEdgeX},${balloon.center.y}`}
                fill="none"
                stroke="#3E4C5A"
                strokeWidth="0.65"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={balloon.center.x}
                cy={balloon.center.y}
                r={balloon.radius}
                fill="#17212B"
                stroke="#FFFFFF"
                strokeWidth="0.65"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={balloon.center.x}
                y={balloon.center.y}
                dy="0.35em"
                fill="#FFFFFF"
                fontSize={balloon.radius * 1.15}
                fontWeight="700"
                textAnchor="middle"
              >
                {balloon.callout.number}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <strong>{viewSpec.label}</strong>
        <span>{viewSpec.scaleLabel}</span>
      </figcaption>
    </figure>
  );
}

export function AssemblyLineDiagram({
  model,
  step,
  highlightedPartId,
  className = '',
  label = `CAD assembly drawing for step ${step.stepNumber}: ${step.title}`,
  variant = 'sheet',
}: AssemblyLineDiagramProps) {
  const recipe = useMemo(() => deriveCadViewRecipe(step), [step]);
  const views = useMemo(
    () => [recipe.primary, ...recipe.secondary],
    [recipe.primary, recipe.secondary],
  );
  const [requestedViewId, setRequestedViewId] = useState(recipe.primary.id);
  const selectedViewId = views.some((view) => view.id === requestedViewId)
    ? requestedViewId
    : recipe.primary.id;
  const partStates = useMemo(
    () => deriveAssemblyPartStates(model, step.stepNumber),
    [model, step.stepNumber],
  );
  const callouts = useMemo(() => deriveAssemblyPartCallouts(model, step), [model, step]);
  const stepEmphasizedIds = useMemo(
    () =>
      new Set(
        step.highlightPartIds.filter(
          (partId) => partStates.has(partId) && partStates.get(partId) !== 'future',
        ),
      ),
    [partStates, step.highlightPartIds],
  );
  const visibleViews = variant === 'thumbnail' ? [recipe.primary] : views;

  return (
    <div
      className={`assembly-line-diagram assembly-cad-sheet ${
        variant === 'thumbnail' ? 'is-thumbnail' : 'is-full-sheet'
      } ${className}`}
      data-cad-step={step.stepNumber}
    >
      {variant === 'sheet' && (
        <fieldset className="assembly-cad-view-selector no-print">
          <legend className="sr-only">CAD drawing view</legend>
          {views.map((viewSpec) => (
            <button
              key={viewSpec.id}
              type="button"
              aria-pressed={selectedViewId === viewSpec.id}
              onClick={() => setRequestedViewId(viewSpec.id)}
            >
              {viewSpec.label}
            </button>
          ))}
        </fieldset>
      )}

      <div className="assembly-cad-view-grid">
        <CadViewFigure
          model={model}
          step={step}
          viewSpec={visibleViews[0]}
          callouts={callouts}
          stepEmphasizedIds={stepEmphasizedIds}
          highlightedPartId={highlightedPartId}
          label={label}
          primary
          selected={selectedViewId === visibleViews[0].id}
        />
        {variant === 'sheet' && (
          <div className="assembly-cad-secondary-views">
            {recipe.secondary.map((viewSpec) => (
              <CadViewFigure
                key={viewSpec.id}
                model={model}
                step={step}
                viewSpec={viewSpec}
                callouts={callouts}
                stepEmphasizedIds={stepEmphasizedIds}
                highlightedPartId={highlightedPartId}
                label={label}
                primary={false}
                selected={selectedViewId === viewSpec.id}
              />
            ))}
          </div>
        )}
      </div>

      {variant === 'sheet' && (
        <footer className="assembly-cad-title-block">
          <div>
            <strong>Step {step.stepNumber} · Assembly drawing</strong>
            <span>{model.definitionId}</span>
          </div>
          <dl>
            <div>
              <dt>Projection</dt>
              <dd>Third-angle</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {model.widthInches}&quot; × {model.heightInches}&quot; × {model.depthInches}&quot;
              </dd>
            </div>
            <div>
              <dt>Scale</dt>
              <dd>NTS</dd>
            </div>
          </dl>
        </footer>
      )}
    </div>
  );
}
