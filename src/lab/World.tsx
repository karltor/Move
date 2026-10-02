import { solveLeg } from "./animation";
import { characterEquipment } from "./characterVisuals";
import { createTerrain, routeSurface } from "./terrain";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  biomeBlend,
  BIOMES,
  projectilePhysics,
  projectileClockRate,
  hasAbility,
  type Save,
} from "./game";
import { advanceFlight, predictFlight } from "./ballistics";
import { modelRootName } from "./modelRoots";
import { VARIANTS } from "./research";
export default function World({
  game,
  closeup,
  onView,
  timeScale = 1,
}: {
  game: Save;
  closeup: boolean;
  onView: () => void;
  timeScale?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(game),
    view = useRef(closeup), rate = useRef(timeScale);
  current.current = game;
  view.current = closeup;
  rate.current = timeScale;
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let alive = true,
      frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setLoading(false);
      setError(
        "3D needs hardware acceleration. You can still use all expedition controls.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "3D expedition. Drag to orbit the camera.",
    );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#c0cdd2");
    scene.fog = new THREE.Fog("#c0cdd2", 28, 85);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
    camera.position.set(4.4, 2.9, 6.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    const rangeCamera = new THREE.Vector3(4.4, 2.9, 6.5),
      rangeTarget = new THREE.Vector3(1, 1.15, 0);
    controls.target.set(1, 1.15, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.47;
    scene.add(new THREE.HemisphereLight("#eaf5ed", "#4f5943", 2));
    const sun = new THREE.DirectionalLight("#fff1d2", 2.4);
    sun.position.set(8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.normalBias = 0.015;
    scene.add(sun);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#c1c6be",
      roughness: 1,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 140), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.035;
    ground.receiveShadow = true;
    scene.add(ground);
    const terrain = createTerrain();
    scene.add(terrain.mesh);
    const marks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.7, 0.012, 0.07),
      new THREE.MeshStandardMaterial({ color: "#d7ddc5" }),
      30,
    );
    scene.add(marks);
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(1800);
    trailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(trailPositions, 3),
    );
    trailGeometry.setDrawRange(0, 0);
    const flightTrail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: "#e37d35",
        transparent: true,
        opacity: 0.6,
      }),
    );
    flightTrail.frustumCulled = false;
    scene.add(flightTrail);
    const trailOutline = new THREE.Points(
      trailGeometry,
      new THREE.PointsMaterial({
        color: "#fff9e4",
        size: 0.22,
        depthTest: false,
      }),
    );
    const trailDots = new THREE.Points(
      trailGeometry,
      new THREE.PointsMaterial({
        color: "#be5a19",
        size: 0.13,
        depthTest: false,
      }),
    );
    trailOutline.frustumCulled = false;
    trailDots.frustumCulled = false;
    trailOutline.renderOrder = 6;
    trailDots.renderOrder = 7;
    scene.add(trailOutline, trailDots);
    const projectileHalo = new THREE.Group();
    const haloWhite = new THREE.Mesh(
      new THREE.RingGeometry(0.23, 0.3, 24),
      new THREE.MeshBasicMaterial({
        color: "#fffdf0",
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    const haloOrange = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.23, 24),
      new THREE.MeshBasicMaterial({
        color: "#de702a",
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    haloWhite.renderOrder = 9;
    haloOrange.renderOrder = 10;
    projectileHalo.add(haloWhite, haloOrange);
    projectileHalo.visible = false;
    scene.add(projectileHalo);
    const landingMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.23, 24),
      new THREE.MeshBasicMaterial({ color: "#ef7f31", side: THREE.DoubleSide }),
    );
    landingMarker.rotation.x = -Math.PI / 2;
    landingMarker.visible = false;
    scene.add(landingMarker);
    const predictionLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: "#1a6973",
        dashSize: 0.3,
        gapSize: 0.22,
        transparent: true,
        opacity: 0.35,
      }),
    );
    predictionLine.visible = false;
    scene.add(predictionLine);
    const matrix = new THREE.Matrix4();
    let library: THREE.Group | undefined,
      scientist: THREE.Object3D | undefined,
      vehicle: THREE.Object3D | undefined,
      projectile: THREE.Object3D | undefined,
      cannonBarrel: THREE.Group | undefined,
      active = "",
      wornKey = "",
      lastView = false,
      flightKey = "",
      flightScale = 0.65,
      expectedRange = 1,
      trailCount = 0,
      lastShot = -1,
      lastTrailX = -1,
      projectileGearKey = "reset";
    const parts = new Map<string, THREE.Object3D>();
    const assets = new Map<string, THREE.Group>();
    const foliage: {
      mesh: THREE.InstancedMesh;
      region: number;
      positions: { x: number; z: number; scale: number; rotation: number }[];
    }[] = [];
    const materials = new Set<THREE.Material>(),
      geometries = new Set<THREE.BufferGeometry>();
    const collect = (o: THREE.Object3D) =>
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          geometries.add(c.geometry);
          for (const m of Array.isArray(c.material) ? c.material : [c.material])
            materials.add(m);
        }
      });
    const clone = (name: string) => {
      const source = library?.getObjectByName(name);
      if (!source) return;
      const o = source.clone(true);
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      return o;
    };
    const privateMaterials = (o: THREE.Object3D) =>
      o.traverse((c) => {
        if (!(c instanceof THREE.Mesh)) return;
        const list = (
          Array.isArray(c.material) ? c.material : [c.material]
        ).map((m) => {
          const copy = m.clone();
          if (copy instanceof THREE.MeshStandardMaterial)
            copy.userData.gearBaseColor = copy.color.getHex();
          materials.add(copy);
          return copy;
        });
        c.material = Array.isArray(c.material) ? list : list[0];
      });
    function bake(name: string) {
      if (assets.has(name)) return assets.get(name)!;
      const src = library?.getObjectByName(name);
      const result = new THREE.Group();
      if (!src) return result;
      src.updateWorldMatrix(true, true);
      const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
      src.traverse((c) => {
        if (!(c instanceof THREE.Mesh)) return;
        const m = Array.isArray(c.material) ? c.material[0] : c.material;
        const g = (
          c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()
        ).applyMatrix4(c.matrixWorld);
        for (const key of Object.keys(g.attributes))
          if (!["position", "normal"].includes(key)) g.deleteAttribute(key);
        const list = byMat.get(m) ?? [];
        list.push(g);
        byMat.set(m, list);
      });
      for (const [mat, list] of byMat) {
        const g = mergeGeometries(list);
        for (const item of list) item.dispose();
        if (g) {
          geometries.add(g);
          result.add(new THREE.Mesh(g, mat));
        }
      }
      assets.set(name, result);
      return result;
    }
    let sceneryBiome = 0;
    function scenery(
      name: string,
      count: number,
      offset: number,
      scale = 1,
      near = false,
    ) {
      const src = bake(name);
      const positions = Array.from({ length: count }, (_, i) => ({
        x: (i / count) * 120 + offset,
        z: name.match(/Townhouse|Bakery|Workshop|Apartments|Greenhouse/)
          ? -(8 + (i % 2) * 5)
          : near
            ? -(3.2 + ((i * 7) % 4) * 0.3)
            : -(5 + ((i * 7 + offset) % 15)),
        scale:
          scale *
          (name.match(/Townhouse|Bakery|Workshop|Apartments|Greenhouse/)
            ? 0.95
            : 0.8 + (i % 5) * 0.11),
        rotation: name.match(
          /Townhouse|Bakery|Workshop|Apartments|Greenhouse|StreetLamp|ParkBench/,
        )
          ? 0
          : i * 2.399,
      }));
      for (const c of src.children) {
        if (!(c instanceof THREE.Mesh)) continue;
        const mesh = new THREE.InstancedMesh(c.geometry, c.material, count);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        scene.add(mesh);
        foliage.push({ mesh, positions, region: sceneryBiome });
      }
    }
    function buildBiome(index: number) {
      sceneryBiome = index;
      const name = BIOMES[index].name;
      if (name === "City limits") {
        ["Townhouse", "Bakery", "Workshop", "Apartments", "Greenhouse"].forEach(
          (n, i) => scenery(n, 4, i * 6),
        );
        scenery("StreetLamp", 14, 3, 1, true);
        scenery("Rowan", 12, 5, 0.8);
        scenery("ParkBench", 7, 8, 1, true);
      } else if (name === "Lanternwood trail") {
        scenery("Oak", 15, 0, 1.05);
        scenery("Birch", 22, 3);
        scenery("Spruce", 24, 5, 1.1);
        scenery("Rowan", 12, 8, 0.9);
        scenery("StreetLamp", 10, 2, 0.86, true);
        scenery("FernPatch", 36, 4, 1.1, true);
        scenery("FieldRock", 16, 7, 0.75, true);
      } else if (name === "Open countryside") {
        scenery("Barn", 8, 0);
        scenery("Oak", 14, 4, 1.1);
        scenery("Rowan", 10, 8);
        scenery("FieldRock", 12, 2, 0.7);
      } else if (name === "Redstone desert") {
        scenery("Cactus", 35, 0);
        scenery("Boulder", 28, 5, 1.3);
      } else {
        scenery("SnowPeak", 20, 0, 1.5);
        scenery("Spruce", 24, 5, 0.8);
      }
    }
    const loader = new GLTFLoader();
    Promise.all(
      ["move-world.glb", "move-lab.glb"].map((name) =>
        loader.loadAsync(import.meta.env.BASE_URL + "models/" + name),
      ),
    ).then(
      ([gltf, legacy]) => {
        // Authored character and scenery take precedence; retain later vehicles.
        for (const child of [...legacy.scene.children]) {
          child.name = modelRootName(child);
          if (!gltf.scene.getObjectByName(child.name)) gltf.scene.add(child);
        }
        collect(legacy.scene);
        if (!alive) {
          collect(gltf.scene);
          geometries.forEach((g) => g.dispose());
          materials.forEach((m) => m.dispose());
          return;
        }
        library = gltf.scene;
        collect(library);
        BIOMES.forEach((_, i) => buildBiome(i));
        setLoading(false);
      },
      () => {
        if (alive) {
          setError(
            "The expedition models could not load. Reload to try again.",
          );
          setLoading(false);
        }
      },
    );
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    let measuredFrames = 0,
      measuredTime = 0;
    let last = performance.now(),
      renderDistance = 0,
      renderSpeed = 0,
      gait = 0,
      renderTime = 0,
      wasRunning = false;
    const rotation = new THREE.Quaternion(),
      axis = new THREE.Vector3(0, 1, 0),
      pos = new THREE.Vector3(),
      size = new THREE.Vector3();
    function animate(now: number) {
      if (!alive) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000) * rate.current;
      last = now;
      if (document.hidden) return;
      const s = current.current,
        t = s.trial,
        variant = VARIANTS[s.program].find(
          (v) => v.id === s.progress[s.program].variant,
        )!;
      const ballistics = s.program === "projectile";
      if (ballistics) {
        const config =
          t?.ballistic?.phase === "flight"
            ? (t.ballistic.config ?? projectilePhysics(s))
            : projectilePhysics(s);
        const nextShot =
          t?.ballistic?.phase === "flight"
            ? t.ballistic.shots
            : (t?.ballistic?.shots ?? 0) + 1;
        const chargedShot = config.charged && nextShot % 3 === 0;
        const nextKey = JSON.stringify([
          s.program,
          variant.id,
          config.speed,
          config.angle,
          config.drag,
          config.lift,
          config.skip,
          chargedShot,
        ]);
        if (nextKey !== flightKey) {
          const prediction = predictFlight({
            ...config,
            speed: config.speed * (chargedShot ? 1.18 : 1),
          });
          const envelope = predictFlight({
            ...config,
            speed: config.speed * (config.charged ? 1.18 : 1),
          });
          flightScale = Math.min(0.65, 22 / Math.max(1, envelope.range));
          expectedRange = Math.max(1, prediction.range);
          const origin = ["rock", "plane"].includes(variant.id)
            ? 0.3
            : variant.id === "sling"
              ? 0.05
              : variant.id === "cannon"
                ? -0.4 +
                  Math.hypot(1.6, 0.65) *
                    Math.cos((config.angle * Math.PI) / 180)
                : 1.4;
          predictionLine.geometry.dispose();
          predictionLine.geometry = new THREE.BufferGeometry().setFromPoints(
            prediction.points.map(
              (p) =>
                new THREE.Vector3(
                  origin + p.x * flightScale,
                  p.y * flightScale +
                    config.height *
                      (1 - flightScale) *
                      (1 - p.x / expectedRange),
                  0,
                ),
            ),
          );
          predictionLine.computeLineDistances();
          const sceneRange = envelope.range * flightScale;
          const sceneHeight = envelope.height * flightScale;
          const targetHeight = Math.max(1.5, sceneHeight * 0.5);
          const distanceToFit = Math.max(
            12,
            (sceneRange + 5) /
              (2 * Math.tan(THREE.MathUtils.degToRad(43) / 2) * camera.aspect),
            (sceneHeight + 3) /
              (2 * Math.tan(THREE.MathUtils.degToRad(43) / 2)),
          );
          rangeCamera.set(
            sceneRange * 0.5,
            targetHeight + distanceToFit * 0.28,
            distanceToFit * 1.1,
          );
          rangeTarget.set(sceneRange * 0.45, targetHeight, 0);
          if (!view.current) {
            camera.position.copy(rangeCamera);
            controls.target.copy(rangeTarget);
          }
          flightKey = nextKey;
          trailCount = 0;
          trailGeometry.setDrawRange(0, 0);
        }
      } else flightKey = "";
      if (!!t !== wasRunning) {
        wasRunning = !!t;
        renderDistance = t?.distance ?? 0;
        renderTime = t?.time ?? 0;
      }
      renderSpeed = THREE.MathUtils.lerp(
        renderSpeed,
        t?.speed ?? 0,
        1 - Math.exp(-dt * 10),
      );
      renderDistance += renderSpeed * dt;
      if (t)
        renderDistance +=
          (t.distance - renderDistance) * (1 - Math.exp(-dt * 3));
      renderTime += dt;
      if (t) renderTime += (t.time - renderTime) * dt * 3;
      // A launch station stays planted. Flight distance belongs to the shot,
      // never to the scientist, cannon or scrolling road beneath them.
      if (ballistics) {
        renderDistance = 0;
        renderSpeed = 0;
      }
      const blend = biomeBlend(renderDistance);
      terrain.update(renderDistance);
      const from = BIOMES[blend.from],
        to = BIOMES[blend.to];
      const sky = new THREE.Color(from.sky).lerp(
        new THREE.Color(to.sky),
        blend.mix,
      );
      (scene.background as THREE.Color).lerp(sky, 1 - Math.exp(-dt * 1.4));
      (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
      groundMat.color.lerp(
        new THREE.Color(from.color).lerp(new THREE.Color(to.color), blend.mix),
        1 - Math.exp(-dt * 1.4),
      );
      for (let i = 0; i < 30; i++) {
        const x = (((i * 6 - renderDistance * 0.65) % 180 + 180) % 180) - 90;
        const surface = routeSurface(renderDistance + x / 0.65);
        matrix.makeScale(surface.markings, 1, surface.markings);
        matrix.setPosition(x, 0.013, -1.5);
        marks.setMatrixAt(i, matrix);
      }
      marks.instanceMatrix.needsUpdate = true;
      const visualDistance = renderDistance * 0.65;
      for (const item of foliage) {
        // Roadside objects belong to their physical stretch of the route.
        // Blend density over the boundary; opaque buildings never become ghosts.
        const region = BIOMES[item.region],
          margin = 620;
        item.mesh.visible =
          renderDistance >= region.start - margin &&
          renderDistance <= region.end + margin;
        if (!item.mesh.visible) continue;
        for (let i = 0; i < item.positions.length; i++) {
          const a = item.positions[i];
          pos.set(
            (((a.x - visualDistance) % 120 + 120) % 120) - 60,
            0,
            ballistics ? a.z - 22 : a.z,
          );
          const ahead = biomeBlend(Math.max(0, renderDistance + pos.x / 0.65));
          const weight =
            ahead.from === ahead.to
              ? item.region === ahead.from
                ? 1
                : 0
              : item.region === ahead.from
                ? 1 - ahead.mix
                : item.region === ahead.to
                  ? ahead.mix
                  : 0;
          const noise =
            Math.sin((i + 1) * 12.9898 + item.region * 78.233) * 43758.5453;
          size.setScalar(weight > noise - Math.floor(noise) ? a.scale : 0);
          rotation.setFromAxisAngle(axis, a.rotation);
          matrix.compose(pos, rotation, size);
          item.mesh.setMatrixAt(i, matrix);
        }
        item.mesh.instanceMatrix.needsUpdate = true;
      }
      const key = s.program + variant.id;
      if (library && active !== key) {
        if (scientist) scene.remove(scientist);
        if (vehicle) scene.remove(vehicle);
        if (projectile) scene.remove(projectile);
        parts.clear();
        scientist = clone("Scientist");
        vehicle = undefined;
        projectile = undefined;
        cannonBarrel = undefined;
        projectileGearKey = "reset";
        if (scientist) {
          scene.add(scientist);
          wornKey = "";
          scientist.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            const list = Array.isArray(o.material) ? o.material : [o.material];
            const copies = list.map((m) => {
              // Gear color changes must not recolor scenery or future clones.
              if (!m.name.includes("equipment blue")) return m;
              const copy = m.clone();
              materials.add(copy);
              return copy;
            });
            o.material = Array.isArray(o.material) ? copies : copies[0];
          });
          for (const name of [
            "LegL",
            "LegR",
            "KneeL",
            "KneeR",
            "FootL",
            "FootR",
            "ArmL",
            "ArmR",
            "ElbowL",
            "ElbowR",
            "Torso",
            "HeadRig",
          ]) {
            const part = scientist.getObjectByName(name);
            if (part) parts.set(name, part);
          }
        }
        if (s.program === "wheels") {
          vehicle = clone(
            variant.model[0].toUpperCase() + variant.model.slice(1),
          );
          if (vehicle) scene.add(vehicle);
        }
        if (s.program === "projectile") {
          if (!["rock", "plane"].includes(variant.id)) {
            vehicle = clone(
              variant.model[0].toUpperCase() + variant.model.slice(1),
            );
            if (vehicle) {
              privateMaterials(vehicle);
              vehicle.position.set(0, 0, 0);
              scene.add(vehicle);
              if (variant.id === "cannon") {
                const barrelParts: THREE.Object3D[] = [];
                vehicle.traverse((o) => {
                  if (o.name.startsWith("Barrel")) barrelParts.push(o);
                });
                cannonBarrel = new THREE.Group();
                cannonBarrel.position.set(-0.4, 0.8, 0);
                vehicle.add(cannonBarrel);
                for (const o of barrelParts) {
                  cannonBarrel.add(o);
                  o.position.x += 0.4;
                  o.position.y -= 0.8;
                }
              }
            }
          }
          projectile = clone(variant.id === "plane" ? "Plane" : "Rock");
          if (["cannon", "particle"].includes(variant.id)) {
            projectile = new THREE.Mesh(
              new THREE.SphereGeometry(
                variant.id === "particle" ? 0.12 : 0.16,
                20,
                14,
              ),
              new THREE.MeshStandardMaterial({
                color: variant.id === "particle" ? "#78e7ff" : "#293c42",
                roughness: 0.55,
              }),
            );
            collect(projectile);
          }
          if (projectile) {
            if (projectile instanceof THREE.Mesh) projectile.castShadow = true;
            privateMaterials(projectile);
            if (variant.id === "particle")
              projectile.traverse((o) => {
                if (o instanceof THREE.Mesh) {
                  const m = new THREE.MeshStandardMaterial({
                    color: "#78e7ff",
                    emissive: "#248bcc",
                    emissiveIntensity: 2,
                  });
                  o.material = m;
                  materials.add(m);
                }
              });
            scene.add(projectile);
          }
        }
        active = key;
      }
      if (ballistics && projectile) {
        const fitted = s.inventory.filter(
          (item) =>
            item.program === "projectile" && s.equipped.includes(item.id),
        );
        const gearKey = fitted.map((item) => `${item.id}-${item.upgradeLevel ?? 0}-${item.upgradePath ?? ''}`).join(":");
        if (gearKey !== projectileGearKey) {
          projectileGearKey = gearKey;
          const body = fitted.find((item) => item.slot === "outfit");
          const rig = fitted.find((item) => item.slot === "footwear");
          const palette = {
            Common: "#b07139",
            Uncommon: "#38796b",
            Rare: "#346fa4",
            Epic: "#7755a5",
          };
          projectile.traverse((o) => {
            if (o instanceof THREE.Mesh)
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material])
                if (m instanceof THREE.MeshStandardMaterial)
                  m.color.set(
                    body
                      ? palette[body.rarity]
                      : (m.userData.gearBaseColor ?? "#c4c9bf"),
                  );
          });
          if (vehicle)
            vehicle.traverse((o) => {
              if (o instanceof THREE.Mesh)
                for (const m of Array.isArray(o.material)
                  ? o.material
                  : [o.material])
                  if (
                    m instanceof THREE.MeshStandardMaterial &&
                    m.name.toLowerCase().includes("mint")
                  )
                    m.color.set(
                      rig
                        ? palette[rig.rarity]
                        : (m.userData.gearBaseColor ?? "#619884"),
                    );
            });
          const oldRig = scene.getObjectByName("FittedLaunchRig");
          if (oldRig) scene.remove(oldRig);
          if (rig && !vehicle) {
            const releaseRig = new THREE.Mesh(
              new THREE.BoxGeometry(0.8, 0.55, 0.42),
              new THREE.MeshStandardMaterial({
                color: palette[rig.rarity],
                roughness: 0.5,
              }),
            );
            releaseRig.name = "FittedLaunchRig";
            releaseRig.position.set(-0.9, 0.28, -0.7);
            releaseRig.castShadow = true;
            scene.add(releaseRig);
            collect(releaseRig);
          }
          // An equipped measuring instrument belongs beside the launcher,
          // rather than appearing as a backpack or pair of scientist shoes.
          const instrument = fitted.find((item) => item.slot === "instrument");
          const oldSensor = scene.getObjectByName("FittedLaunchSensor");
          if (oldSensor) scene.remove(oldSensor);
          if (instrument) {
            const sensor = new THREE.Group();
            sensor.name = "FittedLaunchSensor";
            const material = new THREE.MeshStandardMaterial({
              color: palette[instrument.rarity],
              roughness: 0.55,
            });
            const post = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.045, 0.9, 12),
              material,
            );
            post.position.set(-0.7, 0.45, 1.5);
            sensor.add(post);
            const meter = new THREE.Mesh(
              new THREE.BoxGeometry(0.45, 0.28, 0.1),
              material,
            );
            meter.position.set(-0.7, 0.98, 1.5);
            sensor.add(meter);
            scene.add(sensor);
            collect(sensor);
          }
        }
      } else {
        const sensor = scene.getObjectByName("FittedLaunchSensor");
        if (sensor) scene.remove(sensor);
        const releaseRig = scene.getObjectByName("FittedLaunchRig");
        if (releaseRig) scene.remove(releaseRig);
      }
      const moving = !!t && renderSpeed > 0.15;
      // Keep the planted ankle within the two 43 cm leg segments.  The old
      // 38 cm reach forced a deep crouch even at a gentle first-run speed.
      const stride = s.pace === "recover" ? 0.16 : 0.21;
      gait +=
        dt * Math.min(2.8, (renderSpeed * 0.65) / (4 * stride)) * Math.PI * 2;
      if (scientist) {
        const worn = characterEquipment(
          ballistics ? { ...s, equipped: [] } : s,
        );
        if (worn.key !== wornKey) {
          wornKey = worn.key;
          for (const [name, visible] of Object.entries(worn.visible)) {
            const object = scientist.getObjectByName(name);
            if (object) object.visible = visible;
          }
          for (const [name, color] of [
            ["GearShoeL", worn.colors.footwear],
            ["GearShoeR", worn.colors.footwear],
            ["GearOutfit", worn.colors.outfit],
            ["GearInstrument", worn.colors.instrument],
          ])
            scientist.getObjectByName(name)?.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material])
                if (
                  m instanceof THREE.MeshStandardMaterial &&
                  m.name.includes("equipment blue")
                )
                  {m.color.set(color); m.emissive.set(color);m.emissiveIntensity=worn.glow;}
            });
        }
        const launcher = ballistics && !["rock", "plane"].includes(variant.id);
        scientist.position.set(launcher ? -2 : 0, 0.012, launcher ? 1.3 : 0);
        scientist.visible =
          s.program !== "wheels" ||
          variant.id === "board" ||
          variant.id === "bike";
        const running = s.program === "runner" && moving;
        const walk = s.pace === "recover";
        const bob = running
          ? 0.008 * Math.cos(gait * 2)
          : Math.sin(renderTime * 2) * 0.003;
        const hipHeight = (running ? 0.915 : 0.95) + bob;
        scientist.position.y = 0.012 + hipHeight - 0.95;
        const torso = parts.get("Torso"),
          head = parts.get("HeadRig");
        if (torso) {
          torso.rotation.z = running ? -0.045 : 0;
          torso.rotation.y = running ? Math.sin(gait) * 0.04 : 0;
        }
        if (head)
          head.rotation.y = running
            ? -Math.sin(gait) * 0.025
            : Math.sin(renderTime * 0.5) * 0.035;
        for (const side of ["L", "R"]) {
          const leg = parts.get("Leg" + side),
            knee = parts.get("Knee" + side),
            foot = parts.get("Foot" + side),
            arm = parts.get("Arm" + side),
            elbow = parts.get("Elbow" + side);
          const phase = (gait + (side === "R" ? Math.PI : 0)) % (Math.PI * 2);
          const stance = phase < Math.PI;
          const phase01 = phase / Math.PI;
          const footX = running
            ? stance
              ? stride * (1 - 2 * phase01)
              : stride * (-1 + 2 * (phase01 - 1))
            : 0;
          const footY =
            running && !stance
              ? Math.sin((phase01 - 1) * Math.PI) * (walk ? 0.11 : 0.2)
              : 0;
          const dy = hipHeight - 0.09 - footY;
          const pose = solveLeg(footX, dy);
          if (leg) leg.rotation.z = pose.upper;
          if (knee) knee.rotation.z = pose.knee;
          if (foot) foot.rotation.z = pose.foot;
          if (arm)
            arm.rotation.z = running
              ? -Math.cos(phase) * 0.55 - 0.15
              : ballistics && t && !launcher
                ? t.ballistic?.phase === "prepare"
                  ? -0.75
                  : t.ballistic?.phase === "flight" &&
                      t.ballistic.phaseTime < 0.35
                    ? 1.0
                    : 0.15
                : 0;
          if (elbow)
            elbow.rotation.z = running
              ? 1.15
              : s.program === "projectile"
                ? 0.9
                : 0.1;
        }
        if (s.program === "wheels")
          scientist.position.y = variant.id === "board" ? 0.4 : 0.6;
      }
      if (vehicle && s.program === "wheels") {
        vehicle.position.y = 0.01;
        vehicle.traverse((o) => {
          if (o.name.startsWith("Wheel")) o.rotateY(renderSpeed * dt * 1.5);
        });
      }
      if (projectile) {
        const storedFlight = t?.ballistic;
        const b =
          storedFlight?.phase === "flight"
            ? advanceFlight(
                storedFlight,
                Math.max(
                  0,
                  Math.max(0,Math.min(0.12, renderTime - (t?.time ?? renderTime))) * projectileClockRate(t?.ballistic?.config ?? projectilePhysics(s)),
                ),
                storedFlight.config ?? projectilePhysics(s),
              )
            : storedFlight;
        const angle = b?.config?.angle ?? projectilePhysics(s).angle;
        const origin = ["rock", "plane"].includes(variant.id)
          ? 0.3
          : variant.id === "sling"
            ? 0.05
            : variant.id === "cannon"
              ? -0.4 + Math.hypot(1.6, 0.65) * Math.cos((angle * Math.PI) / 180)
              : 1.4;
        if (cannonBarrel)
          cannonBarrel.rotation.z =
            (angle * Math.PI) / 180 - Math.atan2(0.65, 1.6);
        projectile.visible = !!b && b.phase !== "prepare";
        projectileHalo.visible = !!b && b.phase === "flight";
        const height = b?.config?.height ?? projectilePhysics(s).height;
        projectile.position.set(
          origin + (b?.x ?? 0) * flightScale,
          b?.phase === "landed"
            ? 0.12
            : height + ((b?.y ?? height) - height) * flightScale,
          0,
        );
        // Lift must reach the ground at the same scene coordinate as the arc.
        if (b)
          projectile.position.y =
            b.phase === "landed"
              ? 0.12
              : Math.max(
                  0.12,
                  b.y * flightScale +
                    height * (1 - flightScale) * (1 - b.x / expectedRange),
                );
        projectile.rotation.z =
          variant.id === "plane"
            ? Math.atan2(b?.vy ?? 0, b?.vx ?? 1)
            : renderTime * 3;
        projectileHalo.position.copy(projectile.position);
        projectileHalo.quaternion.copy(camera.quaternion);
        flightTrail.visible = !!b;
        trailOutline.visible = !!b;
        trailDots.visible = !!b;
        if (b && b.shots !== lastShot) {
          lastShot = b.shots;
          trailCount = 0;
          lastTrailX = -1;
        }
        if (
          b?.phase === "flight" &&
          Math.abs(b.x - lastTrailX) * flightScale > 0.03 &&
          trailCount < 600
        ) {
          const i = trailCount * 3;
          trailPositions[i] = origin + b.x * flightScale;
          trailPositions[i + 1] = Math.max(
            0.025,
            b.y * flightScale +
              height * (1 - flightScale) * (1 - b.x / expectedRange),
          );
          trailPositions[i + 2] = 0;
          trailCount++;
          lastTrailX = b.x;
          trailGeometry.attributes.position.needsUpdate = true;
          trailGeometry.setDrawRange(0, trailCount);
        }
        landingMarker.visible = !!b && b.completed > 0;
        if (b)
          landingMarker.position.set(
            origin + b.lastRange * flightScale,
            0.025,
            0,
          );
        predictionLine.visible = hasAbility(s, "rangefinder") && !!b;
      } else {
        flightTrail.visible = false;
        trailOutline.visible = false;
        trailDots.visible = false;
        projectileHalo.visible = false;
        predictionLine.visible = false;
        landingMarker.visible = false;
      }
      if (view.current !== lastView) {
        lastView = view.current;
        if (ballistics && !lastView) {
          camera.position.copy(rangeCamera);
          controls.target.copy(rangeTarget);
        } else {
          camera.position.set(
            lastView ? 3.6 : 4.4,
            lastView ? 2.1 : 2.9,
            lastView ? 4.3 : 6.5,
          );
          controls.target.set(lastView ? 0.3 : 1, 1.15, 0);
        }
      }
      controls.update();
      renderer.render(scene, camera);
      measuredFrames++;
      measuredTime += dt;
      if (measuredTime >= 2) {
        renderer.domElement.dataset.fps = String(
          Math.round(measuredFrames / measuredTime),
        );
        renderer.domElement.dataset.drawCalls = String(
          renderer.info.render.calls,
        );
        measuredTime = 0;
        measuredFrames = 0;
      }
    }
    frame = requestAnimationFrame(animate);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      collect(scene);
      trailGeometry.dispose();
      (flightTrail.material as THREE.Material).dispose();
      (trailOutline.material as THREE.Material).dispose();
      (trailDots.material as THREE.Material).dispose();
      predictionLine.geometry.dispose();
      (predictionLine.material as THREE.Material).dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      for (const f of foliage) f.mesh.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="world" ref={host}>
      {loading && (
        <div className="world-message">Preparing the expedition…</div>
      )}
      {error && <div className="world-message error">{error}</div>}
      <button className="camera-switch" onClick={onView}>
        ⊞ {closeup ? "Route camera" : "Close camera"}
      </button>
      <span className="orbit-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
    </div>
  );
}
