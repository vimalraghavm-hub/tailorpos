export const GARMENT_MEASUREMENT_TYPES = [
  { id: 'gown', label: 'Gown' },
  { id: 'blouse', label: 'Blouse' },
  { id: 'top', label: 'Top' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'pant', label: 'Pant' },
  { id: 'custom', label: 'Custom' }
];

export const GARMENT_MEASUREMENT_FIELDS = {
  gown: [
    { key: 'length', label: 'Full Length' },
    { key: 'shoulder', label: 'Shoulder Width' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'bust', label: 'Bust / Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Hip' },
    { key: 'armHole', label: 'Arm Hole' },
    { key: 'neck', label: 'Neck Depth' }
  ],
  blouse: [
    { key: 'length', label: 'Blouse Length' },
    { key: 'shoulder', label: 'Shoulder Width' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'bust', label: 'Bust / Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'armHole', label: 'Arm Hole' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'elbow', label: 'Elbow Round' },
    { key: 'wrist', label: 'Wrist Round' },
    { key: 'neck', label: 'Front/Back Neck' },
    { key: 'dart', label: 'Dart Point' }
  ],
  top: [
    { key: 'length', label: 'Top Length' },
    { key: 'shoulder', label: 'Shoulder Width' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'bust', label: 'Bust / Chest' },
    { key: 'waist', label: 'Waist' }
  ],
  shirt: [
    { key: 'length', label: 'Shirt Length' },
    { key: 'shoulder', label: 'Shoulder Width' },
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'neck', label: 'Neck / Collar' }
  ],
  pant: [
    { key: 'length', label: 'Pant Length' },
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Hip' },
    { key: 'bottom', label: 'Bottom / Ankle' },
    { key: 'in-seam', label: 'In-Seam / Thigh' }
  ],
  custom: [
    { key: 'notes', label: 'Custom Fitting Notes / Remarks' }
  ]
};

export const getDefaultMeasurements = () => ({
  gown: { length: '', shoulder: '', sleeve: '', bust: '', waist: '', hip: '', armHole: '', neck: '', suppliedGarment: false },
  blouse: { length: '', shoulder: '', sleeve: '', bust: '', waist: '', armHole: '', neck: '', biceps: '', elbow: '', wrist: '', dart: '', suppliedGarment: false },
  top: { length: '', shoulder: '', sleeve: '', bust: '', waist: '', suppliedGarment: false },
  shirt: { length: '', shoulder: '', chest: '', waist: '', sleeve: '', neck: '', suppliedGarment: false },
  pant: { length: '', waist: '', hip: '', bottom: '', 'in-seam': '', suppliedGarment: false },
  custom: { notes: '', suppliedGarment: false }
});
