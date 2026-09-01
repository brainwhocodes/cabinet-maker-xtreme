export type HelperPose =
  | 'pointing_guide'
  | 'measuring'
  | 'drill_safety'
  | 'check_square'
  | 'two_person_lift'
  | 'completion_check';

export const HELPER_ASSET_URL_BY_POSE: Record<HelperPose, string> = {
  pointing_guide: '/assembly/helpers/pointing_guide.png',
  measuring: '/assembly/helpers/measuring.png',
  drill_safety: '/assembly/helpers/drill_safety.png',
  check_square: '/assembly/helpers/check_square.png',
  two_person_lift: '/assembly/helpers/two_person_lift.png',
  completion_check: '/assembly/helpers/completion_check.png',
};
