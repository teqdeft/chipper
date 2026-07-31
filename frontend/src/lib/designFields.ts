/** Controlled vocabularies from the Chipper style guide + datafields spec. */

export const COMPONENT_TYPES = [
  { slug: 'organ-chip', label: 'Organ chip' },
  { slug: 'flow-sensor', label: 'Flow sensor' },
  { slug: 'pressure-sensor', label: 'Pressure sensor' },
  { slug: 'pump', label: 'Pump' },
  { slug: 'reservoir', label: 'Reservoir' },
  { slug: 'fcb', label: 'FCB' },
  { slug: 'other-microfluidic-chip', label: 'Other microfluidic chip' },
  { slug: 'other', label: 'Other' },
] as const;

export const RESOURCE_TYPES = [
  { slug: '3d-model', label: '3D model' },
  { slug: 'sop', label: 'SOP' },
  { slug: 'product', label: 'Product' },
] as const;

export const ORGANS = [
  'Lung',
  'Liver',
  'Gut',
  'Skin',
  'Lymph',
  'Pancreas',
  'Kidney',
  'Heart',
  'Brain',
  'Other',
] as const;

export const MATERIALS = ['PDMS', 'PMMA', 'COC', 'Glass', 'Polystyrene', 'Resin', 'Other'] as const;

export const FABRICATION_METHODS = [
  'Soft lithography',
  'Micromachining',
  'SLA',
  'Injection moulding',
  'Laser cutting',
  'Hot embossing',
  'Other',
] as const;

export const MODEL_TYPES = [
  'Monolayer',
  'Organoid',
  'Spheroid',
  'Organ-on-chip',
  'ALI (air–liquid interface)',
] as const;

export const LICENSES = [
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC BY-NC 4.0',
  'CC0 1.0',
  'MIT',
  'GPL-3.0',
  'Custom',
] as const;

export const PUBLISH_AS_OPTIONS = [
  { value: 'person', label: 'Person' },
  { value: 'institute', label: 'Institute' },
  { value: 'person_from_institute', label: 'Person from institute' },
] as const;

export const WORKING_PRINCIPLES: Record<string, string[]> = {
  'flow-sensor': ['Thermal (calorimetric)', 'Coriolis', 'Differential pressure', 'Ultrasonic', 'Optical'],
  'pressure-sensor': ['Piezoresistive', 'Capacitive', 'Optical', 'Membrane deflection'],
  pump: ['Peristaltic', 'Syringe', 'Pressure-driven', 'Diaphragm', 'Gravity-driven', 'Rocker / tilting'],
};

export function componentTypeLabel(slug: string): string {
  return COMPONENT_TYPES.find((c) => c.slug === slug)?.label ?? slug;
}

export function resourceTypeLabel(slug: string): string {
  return RESOURCE_TYPES.find((r) => r.slug === slug)?.label ?? slug;
}

export function formatRange(range?: {
  min?: number | null;
  max?: number | null;
  value?: number | null;
  unit?: string | null;
}): string | null {
  if (!range) return null;
  const unit = range.unit ? ` ${range.unit}` : '';
  if (range.value != null) return `${range.value}${unit}`;
  if (range.min != null && range.max != null) return `${range.min}–${range.max}${unit}`;
  if (range.min != null) return `≥ ${range.min}${unit}`;
  if (range.max != null) return `≤ ${range.max}${unit}`;
  return null;
}
