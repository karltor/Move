import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { biomeAt, type Save } from "./game";
import { VARIANTS } from "./research";
export default function World({
  game,
  closeup,
  onView,
}: {
  game: Save;
  closeup: boolean;
  onView: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(game),
    view = useRef(closeup);
  current.current = game;
  view.current = closeup;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
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
    camera.position.set(8, 5.5, 10);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(2, 1, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.47;
    scene.add(new THREE.HemisphereLight("#eaf5ed", "#4f5943", 2));
    const sun = new THREE.DirectionalLight("#fff1d2", 2.4);
    sun.position.set(8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
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
    const roadMat = new THREE.MeshStandardMaterial({
      color: "#677575",
      roughness: 1,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(180, 4.8), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.001;
    road.receiveShadow = true;
    scene.add(road);
    const edgeMat = new THREE.MeshStandardMaterial({ color: "#d6d6bd" });
    for (const z of [-2.55, 2.55]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(180, 0.13, 0.3),
        edgeMat,
      );
      edge.position.set(0, -0.04, z);
      edge.receiveShadow = true;
      scene.add(edge);
    }
    const marks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.7, 0.012, 0.07),
      new THREE.MeshStandardMaterial({ color: "#d7ddc5" }),
      30,
    );
    scene.add(marks);
    const matrix = new THREE.Matrix4();
    let library: THREE.Group | undefined,
      scientist: THREE.Object3D | undefined,
      vehicle: THREE.Object3D | undefined,
      projectile: THREE.Object3D | undefined,
      active = "",
      biome = "",
      lastView = false;
    const parts = new Map<string, THREE.Object3D>();
    const assets = new Map<string, THREE.Group>();
    const foliage: {
      mesh: THREE.InstancedMesh;
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
    function scenery(name: string, count: number, offset: number, scale = 1) {
      const src = bake(name);
      const positions = Array.from({ length: count }, (_, i) => ({
        x: (i / count) * 120 - 60 + offset,
        z: -(6.5 + ((i * 7) % 12)),
        scale: scale * (0.8 + (i % 4) * 0.14),
        rotation: i % 2 ? Math.PI : 0,
      }));
      for (const c of src.children) {
        if (!(c instanceof THREE.Mesh)) continue;
        const mesh = new THREE.InstancedMesh(c.geometry, c.material, count);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        scene.add(mesh);
        foliage.push({ mesh, positions });
      }
    }
    function setBiome(name: string) {
      for (const item of foliage) {
        scene.remove(item.mesh);
        item.mesh.dispose();
      }
      foliage.length = 0;
      if (name === "City limits") {
        scenery("CityBlock", 18, 0);
        scenery("TrailLamp", 20, 3);
      } else if (name === "Lanternwood trail") {
        scenery("Pine", 58, 0, 1.3);
        scenery("TrailLamp", 16, 2);
        scenery("Boulder", 15, 4, 0.65);
      } else if (name === "Open countryside") {
        scenery("Barn", 8, 0);
        scenery("Pine", 22, 4, 0.9);
        scenery("Boulder", 12, 2, 0.7);
      } else if (name === "Redstone desert") {
        scenery("Cactus", 35, 0);
        scenery("Boulder", 28, 5, 1.3);
      } else {
        scenery("SnowPeak", 20, 0, 1.5);
        scenery("Pine", 24, 5, 0.8);
      }
      biome = name;
    }
    new GLTFLoader().load(
      import.meta.env.BASE_URL + "models/move-lab.glb",
      (gltf) => {
        if (!alive) {
          collect(gltf.scene);
          geometries.forEach((g) => g.dispose());
          materials.forEach((m) => m.dispose());
          return;
        }
        library = gltf.scene;
        collect(library);
        setLoading(false);
      },
      undefined,
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const s = current.current,
        t = s.trial,
        variant = VARIANTS[s.program].find(
          (v) => v.id === s.progress[s.program].variant,
        )!;
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
      const environment = biomeAt(t?.distance ?? 0);
      scene.background = (scene.background as THREE.Color).lerp(
        new THREE.Color(environment.sky),
        dt * 1.5,
      );
      (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
      groundMat.color.lerp(new THREE.Color(environment.color), dt * 1.5);
      roadMat.color.lerp(
        new THREE.Color(
          environment.short === "Forest"
            ? "#86765a"
            : environment.short === "Desert"
              ? "#736b63"
              : "#647273",
        ),
        dt,
      );
      if (library && environment.name !== biome) setBiome(environment.name);
      for (let i = 0; i < 30; i++) {
        matrix.makeTranslation(
          ((i * 6 - renderDistance * 0.65 + 9000) % 180) - 90,
          0.013,
          -1.5,
        );
        marks.setMatrixAt(i, matrix);
      }
      marks.instanceMatrix.needsUpdate = true;
      marks.visible = environment.short !== "Forest";
      const visualDistance = renderDistance * 0.65;
      for (const item of foliage) {
        for (let i = 0; i < item.positions.length; i++) {
          const a = item.positions[i];
          pos.set(((a.x - visualDistance + 12000000) % 120) - 60, 0, a.z);
          size.setScalar(a.scale);
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
        if (scientist) {
          scene.add(scientist);
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
              vehicle.position.set(-2, 0, 0);
              scene.add(vehicle);
            }
          }
          projectile = clone(variant.id === "plane" ? "Plane" : "Rock");
          if (projectile) {
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
      const moving = !!t && renderSpeed > 0.15;
      gait += dt * Math.min(2.8, renderSpeed * 0.52) * Math.PI * 2;
      if (scientist) {
        scientist.position.set(s.program === "projectile" ? -2 : 0, 0.012, 0);
        scientist.visible =
          s.program !== "wheels" ||
          variant.id === "board" ||
          variant.id === "bike";
        const running = s.program === "runner" && moving;
        const walk = s.pace === "recover";
        const hipHeight = 0.95 - (running ? 0.075 : 0);
        scientist.position.y = 0.012 - (running ? 0.075 : 0);
        for (const side of ["L", "R"]) {
          const leg = parts.get("Leg" + side),
            knee = parts.get("Knee" + side),
            foot = parts.get("Foot" + side),
            arm = parts.get("Arm" + side),
            elbow = parts.get("Elbow" + side);
          const phase = (gait + (side === "R" ? Math.PI : 0)) % (Math.PI * 2);
          const stance = phase < Math.PI;
          const phase01 = phase / Math.PI;
          const stride = running ? (walk ? 0.2 : 0.34) : 0;
          const footX = running
            ? stance
              ? stride * (1 - 2 * phase01)
              : stride * (-1 + 2 * (phase01 - 1))
            : 0;
          const footY =
            running && !stance
              ? Math.sin((phase01 - 1) * Math.PI) * (walk ? 0.13 : 0.3)
              : 0;
          const dy = hipHeight - 0.09 - footY;
          const len = Math.min(0.859, Math.hypot(footX, dy));
          const bend =
            Math.PI -
            Math.acos(
              THREE.MathUtils.clamp(
                (0.43 * 0.43 + 0.43 * 0.43 - len * len) / (2 * 0.43 * 0.43),
                -1,
                1,
              ),
            );
          const upper = Math.atan2(footX, dy) - bend / 2;
          if (leg) leg.rotation.z = upper;
          if (knee) knee.rotation.z = bend;
          if (foot) foot.rotation.z = -upper - bend;
          if (arm)
            arm.rotation.z = running
              ? Math.sin(phase) * 0.6
              : s.program === "projectile" && t
                ? -0.5 + Math.sin(renderTime * 1.2) * 0.9
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
        const f = (renderTime % 5) / 5;
        projectile.visible = !!t;
        projectile.position.set(
          -1 + f * 20,
          0.9 + (variant.id === "particle" ? 0 : Math.sin(f * Math.PI) * 3.5),
          0,
        );
        projectile.rotation.z =
          variant.id === "plane" ? Math.cos(f * Math.PI) * 0.22 : renderTime;
      }
      if (view.current !== lastView) {
        lastView = view.current;
        camera.position.set(
          lastView ? 6 : 8,
          lastView ? 3.3 : 5.5,
          lastView ? 6 : 10,
        );
        controls.target.set(lastView ? 1 : 2, 1, 0);
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
