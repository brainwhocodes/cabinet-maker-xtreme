'use client';

import type { AutoFitProposal } from '@/domain/layout/auto-fit';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { DimensionDisplay } from '../atoms/DimensionDisplay';

export interface ProposalScoreCardProps {
  proposal: AutoFitProposal;
  isStaged: boolean;
  onPreview: (proposal: AutoFitProposal) => void;
  onApply: (proposal: AutoFitProposal) => void;
}

export function ProposalScoreCard({
  proposal,
  isStaged,
  onPreview,
  onApply,
}: ProposalScoreCardProps) {
  return (
    <div
      className={`box p-3 mb-3 ${isStaged ? 'has-background-link-light' : 'has-background-white'}`}
      style={{
        border: isStaged ? '2px solid var(--color-primary)' : '1px solid var(--color-line)',
        borderRadius: 8,
      }}
    >
      <div className="is-flex is-align-items-center is-justify-content-between mb-2">
        <div>
          <h4 className="is-size-6 has-text-weight-bold mb-0">{proposal.title}</h4>
          <span className="is-size-7 has-text-grey">{proposal.description}</span>
        </div>
        <div className="has-text-right">
          <Badge variant="primary" size="sm">
            {proposal.scores.overallScore}/100 Match
          </Badge>
          <div className="is-size-7 has-text-weight-bold has-text-dark mt-1">
            {proposal.estimatedCostUSD === null
              ? 'Price unavailable'
              : `Est. $${proposal.estimatedCostUSD}`}
          </div>
        </div>
      </div>

      <div className="tags are-small mb-3">
        <span className="tag is-light">Units: {proposal.unitCount}</span>
        <span className="tag is-light">Drawers: {proposal.drawerUnitCount}</span>
        <span className="tag is-light">
          Gap: <DimensionDisplay sixteenths={proposal.uncoveredSpanSixteenths} className="ml-1" />
        </span>
        <span className="tag is-light">Fit: {proposal.scores.fitScore}%</span>
        <span className="tag is-light">Symmetry: {proposal.scores.symmetryScore}%</span>
      </div>

      <div className="buttons is-flex is-justify-content-flex-end mb-0">
        <Button
          size="sm"
          variant={isStaged ? 'secondary' : 'ghost'}
          onClick={() => onPreview(proposal)}
          title="Preview layout in 3D viewport"
        >
          {isStaged ? 'Previewing' : 'Preview 3D'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon="solar:check-circle-linear"
          onClick={() => onApply(proposal)}
          title="Apply layout to wall"
        >
          Apply Layout
        </Button>
      </div>
    </div>
  );
}
