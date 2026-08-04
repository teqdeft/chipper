/**
 * Which geometry formats the in-browser viewer can render.
 *
 * Kept apart from ModelViewer so screens can ask "is this file renderable?"
 * without pulling three.js — ~600 KB — into the main bundle. Mirrors
 * VIEWABLE_MODEL_EXTENSIONS on the API; change both together.
 */
export const VIEWABLE_FORMATS = [
  // Surface meshes
  'stl',
  '3mf',
  'obj',
  'ply',
  'glb',
  'gltf',
  'fbx',
  // Machine toolpaths — drawn as lines, not surfaces. Same G-code under each
  // extension; only the CAM tool that wrote it differs.
  'gcode',
  'nc',
  'tap',
  'ngc',
  'cnc',
] as const;

export type ViewableFormat = (typeof VIEWABLE_FORMATS)[number];

/** Files serialise their extension uppercased ("STL"), so normalise first. */
export function isViewableFormat(extension: string | null | undefined): extension is ViewableFormat {
  return (VIEWABLE_FORMATS as readonly string[]).includes(String(extension ?? '').toLowerCase());
}

/**
 * Formats accepted on upload but not renderable yet. STEP and IGES are B-reps
 * that need a CAD kernel to tessellate; DXF and DWG are 2D fabrication
 * drawings. All four are chip staples, so they upload and download normally.
 */
export const DOWNLOAD_ONLY_FORMATS = ['step', 'stp', 'iges', 'igs', 'dxf', 'dwg'] as const;

export type UpAxis = 'y' | 'z';

/**
 * Which axis each format treats as "up". three.js renders Y-up, so a Z-up file
 * has to be rotated or it lies on its side.
 *
 * Only glTF actually specifies this (Y-up, mandated); the rest are conventions:
 * STL and 3MF come out of CAD and slicers where the build plate is the XY
 * plane, while OBJ, PLY and FBX are usually written by DCC tools that are
 * already Y-up. Conventions are not guarantees, which is why the viewer offers
 * a toggle rather than trusting this outright.
 */
export const DEFAULT_UP_AXIS: Record<ViewableFormat, UpAxis> = {
  stl: 'z',
  '3mf': 'z',
  obj: 'y',
  ply: 'y',
  glb: 'y',
  gltf: 'y',
  fbx: 'y',
  // G-code is authored Z-up (Z is the spindle axis), but three's GCodeLoader
  // already rotates its output to Y-up, so no further correction is wanted.
  gcode: 'y',
  nc: 'y',
  tap: 'y',
  ngc: 'y',
  cnc: 'y',
};
