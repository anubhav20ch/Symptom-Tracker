// ENTRY-8: the controlled vocabulary behind the front/back body-map control
// (UI-9, Phase 5). `body_location` remains a free-text field (populated by
// NLP extraction or the patient's own words); `body_region_code` is the
// structured selection from this fixed list, stored alongside it rather
// than replacing it.
const BODY_REGIONS = [
  { code: 'head_front', label: 'Head / Face', view: 'front' },
  { code: 'neck_front', label: 'Neck (front)', view: 'front' },
  { code: 'chest', label: 'Chest', view: 'front' },
  { code: 'abdomen', label: 'Abdomen / Stomach', view: 'front' },
  { code: 'pelvis_groin', label: 'Pelvis / Groin', view: 'front' },
  { code: 'shoulder_left_front', label: 'Left Shoulder', view: 'front' },
  { code: 'shoulder_right_front', label: 'Right Shoulder', view: 'front' },
  { code: 'arm_left', label: 'Left Arm', view: 'front' },
  { code: 'arm_right', label: 'Right Arm', view: 'front' },
  { code: 'hand_left', label: 'Left Hand', view: 'front' },
  { code: 'hand_right', label: 'Right Hand', view: 'front' },
  { code: 'leg_left_front', label: 'Left Leg (front)', view: 'front' },
  { code: 'leg_right_front', label: 'Right Leg (front)', view: 'front' },
  { code: 'foot_left', label: 'Left Foot', view: 'front' },
  { code: 'foot_right', label: 'Right Foot', view: 'front' },
  { code: 'head_back', label: 'Back of Head', view: 'back' },
  { code: 'neck_back', label: 'Neck (back)', view: 'back' },
  { code: 'upper_back', label: 'Upper Back', view: 'back' },
  { code: 'lower_back', label: 'Lower Back', view: 'back' },
  { code: 'buttocks', label: 'Buttocks', view: 'back' },
  { code: 'leg_left_back', label: 'Left Leg (back)', view: 'back' },
  { code: 'leg_right_back', label: 'Right Leg (back)', view: 'back' },
  { code: 'whole_body', label: 'Whole Body / Systemic', view: 'both' }
];

const BODY_REGION_CODES = new Set(BODY_REGIONS.map((r) => r.code));

module.exports = { BODY_REGIONS, BODY_REGION_CODES };
