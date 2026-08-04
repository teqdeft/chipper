/**
 * SCR-019 — in-browser geometry viewer.
 *
 * Plain three.js rather than a React renderer: the scene is created once per
 * file and driven by an imperative loop, so wrapping it in a reconciler would
 * only add a dependency and a second lifecycle to keep in sync.
 *
 * Phase 1 renders mesh formats only. The CAD interchange formats a chip is
 * usually authored in (STEP/IGES) are B-reps — a browser cannot tessellate
 * them without a WASM kernel, so they stay download-only until the API grows a
 * server-side conversion. The renderable list lives in lib/modelFormats so
 * screens can test a file without importing three.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GCodeLoader } from 'three/examples/jsm/loaders/GCodeLoader.js';
import type { UpAxis, ViewableFormat } from '@/lib/modelFormats';
import { cn } from '@/lib/utils';

/** Left-mouse behaviour. Orbit/zoom/pan are always available on the other buttons. */
export type ViewerTool = 'orbit' | 'zoom' | 'pan';

export type ModelStats = {
  /** Bounding-box extents in the file's own units (mm for every format here). */
  size: { x: number; y: number; z: number };
  triangles: number;
  /** Non-zero for toolpaths (G-code), which are lines rather than surfaces. */
  segments: number;
};

export type ModelViewerHandle = {
  /** Returns the camera to the framing chosen when the model finished loading. */
  resetView: () => void;
};

type Props = {
  url: string;
  format: ViewableFormat;
  tool?: ViewerTool;
  wireframe?: boolean;
  /** Which axis the file treats as up. Changing it reorients without reloading. */
  upAxis?: UpAxis;
  onLoaded?: (stats: ModelStats) => void;
  className?: string;
};

/**
 * Unpainted look for formats with no colour channel (STL, bare PLY).
 * No brand tint and no invented orange — just a neutral surface so geometry
 * reads as-authored. Formats that embed colour (3MF / glTF / vertex colours)
 * keep their own materials untouched.
 */
const DEFAULT_SURFACE = 0xdfd5cd; // line strong — the palette's warm neutral

/** Page canvas — keeps the viewer anchored in the site palette. */
const VIEWER_BG = 0xfffcf9;

function buildLoader(format: ViewableFormat) {
  switch (format) {
    case 'stl':
      return new STLLoader();
    case 'ply':
      return new PLYLoader();
    case 'obj':
      return new OBJLoader();
    case '3mf':
      return new ThreeMFLoader();
    case 'glb':
    case 'gltf':
      return new GLTFLoader();
    case 'fbx':
      return new FBXLoader();
    case 'gcode':
    case 'nc':
    case 'tap':
    case 'ngc':
    case 'cnc':
      return new GCodeLoader();
  }
}

/**
 * Normalises every loader's return value to a single Object3D.
 *
 * STL and PLY hand back bare geometry, so they get the shared surface material;
 * OBJ, 3MF and glTF hand back a populated group whose own materials are kept.
 */
function toObject3D(loaded: unknown, format: ViewableFormat): THREE.Object3D {
  if (format === 'glb' || format === 'gltf') {
    return (loaded as { scene: THREE.Group }).scene;
  }

  if (format === 'fbx') {
    // FBX scenes carry their unit as GlobalSettings.UnitScaleFactor
    // (centimetres per scene unit — FBX is natively cm). FBXLoader parses it
    // into userData without applying it, so without this a part authored in mm
    // would read 10× small next to every other format here.
    const group = loaded as THREE.Group;
    const cmPerUnit = Number(group.userData.unitScaleFactor);
    if (Number.isFinite(cmPerUnit) && cmPerUnit > 0) {
      group.scale.multiplyScalar(cmPerUnit * 10);
    }
    return group;
  }

  if (loaded instanceof THREE.BufferGeometry) {
    // Face-sharp normals: smooth averaging blurs the walls of tiny wells so
    // a dense chip reads as a flat slab. Drop any soft normals and rebuild
    // per-triangle so every channel edge stays crisp.
    loaded.deleteAttribute('normal');
    loaded.computeVertexNormals();
    const hasVertexColors = Boolean(loaded.getAttribute('color'));
    // Lambert is far cheaper than Standard on dense STL well-plates and still
    // reads channel walls under a hard key light.
    const material = new THREE.MeshLambertMaterial({
      // Only vertex colours are "real" paint. Otherwise keep a neutral
      // unpainted surface — never invent orange or sample a preview.
      color: hasVertexColors ? 0xffffff : DEFAULT_SURFACE,
      vertexColors: hasVertexColors,
      flatShading: true,
      // Channel geometry is frequently an open surface; single-sided would
      // render the inside of a channel as a hole.
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(loaded, material);
  }

  return loaded as THREE.Object3D;
}

function countTriangles(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    const position = geometry.getAttribute('position');
    if (index) total += index.count / 3;
    else if (position) total += position.count / 3;
  });
  return Math.round(total);
}

/**
 * Line segments in the scene. A G-code toolpath has no triangles at all, so
 * this is what stands in for a triangle count when reporting size.
 */
function countLineSegments(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.LineSegments)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute('position');
    if (position) total += position.count / 2;
  });
  return Math.round(total);
}

/** Frees every GPU resource the scene graph owns. */
function disposeTree(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Points) && !(child instanceof THREE.Line)) {
      return;
    }
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

const ModelViewer = forwardRef<ModelViewerHandle, Props>(function ModelViewer(
  { url, format, tool = 'orbit', wireframe = false, upAxis = 'y', onLoaded, className },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  // Cached materials for cheap wireframe toggles (no full scene traverse).
  const materialsRef = useRef<THREE.Material[]>([]);
  // Framing captured once the model is centred, so "Reset view" is exact.
  const homeRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  // Set once the model is in the scene; re-orients and reframes without reloading.
  const reframeRef = useRef<((axis: UpAxis) => void) | null>(null);
  // Requests one frame from the on-demand render loop.
  const invalidateRef = useRef<(() => void) | null>(null);
  // Drops in-flight smooth-zoom so reset / reframe snaps cleanly.
  const clearZoomRef = useRef<(() => void) | null>(null);
  // Read inside the load callback, which closes over the value at mount time.
  const upAxisRef = useRef(upAxis);
  upAxisRef.current = upAxis;

  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // onLoaded is read inside an effect that must not re-run when the parent
  // re-renders with a new closure.
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useImperativeHandle(ref, () => ({
    resetView() {
      const home = homeRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!home || !camera || !controls) return;
      clearZoomRef.current?.();
      camera.position.copy(home.position);
      controls.target.copy(home.target);
      controls.update();
      invalidateRef.current?.();
    },
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setIsLoading(true);
    setProgress(0);
    setError(null);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setError('Your browser could not start WebGL, so the 3D preview is unavailable.');
      setIsLoading(false);
      return;
    }

    // Cap DPR — retina×2 on a dense STL saturates the GPU during orbit.
    const maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(maxPixelRatio);
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1);
    // Correct colour for glTF / 3MF / textured meshes — without this, embedded
    // materials look washed or wrongly tinted.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    // Shadow maps on dense chips cost a full extra geometry pass every move —
    // lighting contrast alone is enough for channel walls.
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(VIEWER_BG, 1);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(VIEWER_BG);

    const camera = new THREE.PerspectiveCamera(45, (mount.clientWidth || 1) / (mount.clientHeight || 1), 0.1, 1000);
    cameraRef.current = camera;

    // Two lights only — each extra light multiplies fragment cost on STL meshes.
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(1.6, 2.8, 1.1);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2.2, 1.0, -1.0);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // Higher factor = tracks the pointer closely; too low feels like lag.
    controls.dampingFactor = 0.18;
    // Wheel zoom is handled below with inertia. Orbit still owns middle-drag /
    // zoom-tool dolly; its built-in wheel step has no easing and feels harsh
    // next to Printables / Sketchfab.
    controls.zoomToCursor = false;
    controls.screenSpacePanning = true;
    controls.zoomSpeed = 1.0;
    controls.rotateSpeed = 1.0;
    controls.panSpeed = 0.9;
    controlsRef.current = controls;

    /**
     * Render only while something is moving, then stop the rAF loop.
     * A continuous loop — even with skipped draws — competes with Lenis and
     * makes the rest of the page feel laggy once a heavy model is loaded.
     */
    let needsRender = true;
    let frameId = 0;
    let running = false;

    /**
     * Smooth dolly — wheel updates a target distance; the loop eases the
     * camera toward it. OrbitControls applies zoom in a single jump with no
     * damping, which is why scroll felt stiff / "wrong" compared to other
     * model sites.
     */
    let targetDistance: number | null = null;
    const zoomOffset = new THREE.Vector3();
    clearZoomRef.current = () => {
      targetDistance = null;
    };

    const setCameraDistance = (distance: number) => {
      zoomOffset.subVectors(camera.position, controls.target);
      if (zoomOffset.lengthSq() < 1e-12) zoomOffset.set(0, 0, 1);
      zoomOffset.setLength(distance);
      camera.position.copy(controls.target).add(zoomOffset);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
    };

    const tick = () => {
      // Orbit first so rotate/pan damping write the camera, then ease zoom on
      // top — otherwise update() would overwrite the dolly with the old radius.
      const settling = controls.update();

      let zooming = false;
      if (targetDistance !== null) {
        const current = camera.position.distanceTo(controls.target);
        const next = THREE.MathUtils.lerp(current, targetDistance, 0.32);
        setCameraDistance(next);
        if (Math.abs(next - targetDistance) <= Math.max(targetDistance * 1e-4, 1e-4)) {
          setCameraDistance(targetDistance);
          targetDistance = null;
        } else {
          zooming = true;
        }
      }

      if (!settling && !zooming && !needsRender) {
        stop();
        return;
      }
      needsRender = false;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frameId = requestAnimationFrame(tick);
    };

    const invalidate = () => {
      needsRender = true;
      start();
    };
    invalidateRef.current = invalidate;

    // Grab cursors signal the stage is interactive (Sketchfab-style).
    const canvasEl = renderer.domElement;
    canvasEl.style.cursor = 'grab';
    const onPointerDown = () => {
      canvasEl.style.cursor = 'grabbing';
      // Drop to 1× pixels while dragging so orbit stays fluid on heavy meshes.
      renderer.setPixelRatio(1);
      renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
      invalidate();
    };
    const onPointerUp = () => {
      canvasEl.style.cursor = 'grab';
      renderer.setPixelRatio(maxPixelRatio);
      renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
      invalidate();
    };
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    const onWheel = (event: WheelEvent) => {
      // Capture phase + stopImmediatePropagation: beat OrbitControls' own
      // wheel handler so we never get a double (smooth + jumpy) dolly.
      event.preventDefault();
      event.stopImmediatePropagation();

      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 100;

      const current = targetDistance ?? camera.position.distanceTo(controls.target);
      // Exponential step keeps zoom speed proportional at every scale.
      const factor = Math.exp(delta * 0.0015);
      targetDistance = THREE.MathUtils.clamp(
        current * factor,
        controls.minDistance,
        controls.maxDistance,
      );
      invalidate();
    };
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false, capture: true });

    // The 'change' event is the reliable signal, not update()'s return value:
    // the wheel and drag handlers call update() themselves, so by the time the
    // loop asks, the transform has already been consumed and it reports false.
    controls.addEventListener('change', invalidate);
    controls.addEventListener('start', start);

    // Scrolled past the viewer? Stop the loop outright.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          invalidate();
        } else {
          stop();
        }
      },
      { threshold: 0 },
    );
    visibility.observe(mount);
    invalidate();

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      invalidate();
    });
    resizeObserver.observe(mount);

    // An unmount mid-download must not push state into a dead component.
    let cancelled = false;

    const loader = buildLoader(format);
    // A .gltf keeps its buffers and textures in sibling files; without this the
    // loader would resolve them against the page origin instead of the API.
    if (loader instanceof GLTFLoader) {
      loader.setResourcePath(url.slice(0, url.lastIndexOf('/') + 1));
    }

    loader.load(
      url,
      (loaded: unknown) => {
        if (cancelled) return;

        // Two wrappers so the loaded object is never mutated: `pivot` carries
        // the up-axis correction, `centerer` the recentring offset. Some loaders
        // orient their own output — GCodeLoader rotates to Y-up internally —
        // and writing our transform onto the root would silently undo theirs.
        const inner = toObject3D(loaded, format);
        const centerer = new THREE.Group();
        centerer.add(inner);
        const pivot = new THREE.Group();
        pivot.add(centerer);
        scene.add(pivot);
        modelRef.current = pivot;

        // Cache materials once — wireframe toggles hit this list, not a traverse.
        const mats: THREE.Material[] = [];
        inner.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const list = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of list) {
            if (material) mats.push(material);
          }
        });
        materialsRef.current = mats;

        // Warm both solid + wireframe shader variants so the first toggle does
        // not hitch the whole page on a dense mesh.
        for (const material of mats) {
          if ('wireframe' in material) (material as THREE.MeshLambertMaterial).wireframe = true;
        }
        renderer.compile(scene, camera);
        for (const material of mats) {
          if ('wireframe' in material) (material as THREE.MeshLambertMaterial).wireframe = false;
        }
        renderer.compile(scene, camera);

        const triangles = countTriangles(inner);
        const segments = countLineSegments(inner);

        /**
         * Orients the model for `axis`, recentres it on the origin and reframes
         * the camera. Runs on load and again whenever the up-axis is toggled.
         */
        const reframe = (axis: UpAxis) => {
          targetDistance = null;
          // Start from a clean pair of wrappers so each pass measures the file's
          // own orientation rather than the previous pass's correction.
          centerer.position.set(0, 0, 0);
          pivot.rotation.set(0, 0, 0);
          if (axis === 'z') pivot.rotation.x = -Math.PI / 2;
          pivot.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(pivot);
          if (box.isEmpty()) {
            setError('This file contains no renderable geometry.');
            setIsLoading(false);
            return;
          }
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Centre on the origin so orbiting turns the part rather than swinging
          // it around whatever the exporter treated as world zero. The offset
          // goes on the inner wrapper, so it has to be expressed in the pivot's
          // frame or the up-axis rotation would skew it.
          centerer.position.sub(pivot.worldToLocal(center.clone()));
          pivot.updateMatrixWorld(true);

          const radius = Math.max(size.length() / 2, 1e-4);
          const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.3;

          // Viewing angle follows the shape. A tall part seen from above reads
          // as leaning — perspective foreshortens the base — so it gets a
          // near-level, head-on view. A flat part (a chip on its build plate)
          // seen head-on is just an edge, so it keeps a raised three-quarter
          // view that shows the top face and the channel walls.
          const footprint = Math.max(size.x, size.z, 1e-6);
          const isTall = size.y > footprint;
          const elevation = THREE.MathUtils.degToRad(isTall ? 4 : 32);
          const azimuth = THREE.MathUtils.degToRad(isTall ? 0 : 38);
          camera.position.set(
            distance * Math.cos(elevation) * Math.sin(azimuth),
            distance * Math.sin(elevation),
            distance * Math.cos(elevation) * Math.cos(azimuth),
          );
          // Tighter near plane preserves depth detail in shallow wells when
          // zoomed in; far stays generous for orbit.
          camera.near = Math.max(distance / 500, radius * 0.001);
          camera.far = distance * 100;
          camera.updateProjectionMatrix();
          controls.target.set(0, 0, 0);
          controls.minDistance = radius * 0.12;
          controls.maxDistance = distance * 6;
          controls.update();
          homeRef.current = { position: camera.position.clone(), target: controls.target.clone() };
          keyLight.position.set(radius * 1.4, radius * 2.2, radius * 1.1);

          invalidate();
          setIsLoading(false);
          onLoadedRef.current?.({ size: { x: size.x, y: size.y, z: size.z }, triangles, segments });
        };

        reframeRef.current = reframe;
        reframe(upAxisRef.current);
      },
      (event: ProgressEvent) => {
        if (cancelled || !event.lengthComputable) return;
        setProgress(Math.round((event.loaded / event.total) * 100));
      },
      () => {
        if (cancelled) return;
        setError('This file could not be read. It may be corrupt or stored in an unexpected variant.');
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel, { capture: true });
      controls.removeEventListener('change', invalidate);
      controls.removeEventListener('start', start);
      controls.dispose();
      reframeRef.current = null;
      invalidateRef.current = null;
      clearZoomRef.current = null;

      if (modelRef.current) {
        scene.remove(modelRef.current);
        disposeTree(modelRef.current);
        modelRef.current = null;
      }

      renderer.dispose();
      // Browsers cap live WebGL contexts; navigating between designs would
      // otherwise exhaust them and start killing the oldest canvases.
      renderer.forceContextLoss();
      renderer.domElement.remove();

      controlsRef.current = null;
      cameraRef.current = null;
      homeRef.current = null;
      materialsRef.current = [];
    };
  }, [url, format]);

  // Left-drag action. Middle/right keep their defaults so every gesture stays
  // reachable whichever tool is selected.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const action =
      tool === 'pan' ? THREE.MOUSE.PAN : tool === 'zoom' ? THREE.MOUSE.DOLLY : THREE.MOUSE.ROTATE;
    controls.mouseButtons = {
      LEFT: action,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }, [tool, isLoading]);

  // Reorients in place. Skipped while loading — the load callback frames the
  // model itself, using the axis current at that moment.
  useEffect(() => {
    if (isLoading) return;
    reframeRef.current?.(upAxis);
  }, [upAxis, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    for (const material of materialsRef.current) {
      if (material && 'wireframe' in material) {
        (material as THREE.MeshLambertMaterial).wireframe = wireframe;
      }
    }
    invalidateRef.current?.();
  }, [wireframe, isLoading]);

  return (
    // Absolute rather than h-full: the canvas sits inside a flex column whose
    // height comes from flex-grow, so a percentage height would resolve
    // against an `auto` parent and collapse the canvas to zero.
    <div className={cn('absolute inset-0', className)} data-lenis-prevent>
      {/* data-lenis-prevent: Lenis owns wheel events for the whole page, so
          without it scrolling over the canvas scrolls the article behind it
          instead of dollying the camera. */}
      <div ref={mountRef} className="h-full w-full" data-lenis-prevent />

      {isLoading && !error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/80 backdrop-blur-md">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-aubergine/10 border-t-coral" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-medium text-aubergine" role="status" aria-live="polite">
              {progress > 0 ? `Loading geometry — ${progress}%` : 'Loading geometry…'}
            </p>
            {progress > 0 ? (
              <div className="mx-auto mt-3 h-0.5 w-36 overflow-hidden rounded-pill bg-aubergine/10">
                <div
                  className="h-full rounded-pill bg-coral transition-[width] duration-300 ease-premium"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas/90 p-8 backdrop-blur-sm">
          <p className="max-w-sm text-center text-sm leading-relaxed text-muted">{error}</p>
        </div>
      ) : null}
    </div>
  );
});

export default ModelViewer;
