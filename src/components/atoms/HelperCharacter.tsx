'use client';

import Image from 'next/image';
import { HELPER_ASSET_URL_BY_POSE, type HelperPose } from '@/domain/assembly/helper-pose';

const POSE_ALT_BY_ID: Record<HelperPose, string> = {
  pointing_guide: 'Workshop guide pointing to the current assembly step',
  measuring: 'Workshop guide measuring dimensions with a tape measure',
  drill_safety: 'Workshop guide holding a cordless drill safely with protective eyewear',
  check_square: 'Workshop guide checking right-angle squareness with a carpenter square',
  two_person_lift: 'Two workshop guides demonstrating a safe two-person cabinet lift',
  completion_check: 'Workshop guide holding a checklist clipboard and giving a thumbs up',
};

export interface HelperCharacterProps {
  pose?: HelperPose;
  size?: number;
  className?: string;
  caption?: string;
}

export function HelperCharacter({
  pose = 'pointing_guide',
  size = 120,
  className = '',
  caption,
}: HelperCharacterProps) {
  const altText = POSE_ALT_BY_ID[pose] || 'Workshop guide character';

  return (
    <div
      className={`helper-character-wrapper is-inline-flex is-flex-direction-column is-align-items-center ${className}`}
    >
      <Image
        key={pose}
        src={HELPER_ASSET_URL_BY_POSE[pose]}
        width={size}
        height={size}
        alt={altText}
        className="helper-character-image"
        style={{
          width: size,
          height: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
      {caption && (
        <span
          className="is-size-7 has-text-grey font-italic mt-1 text-center"
          style={{ maxWidth: size + 40 }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
