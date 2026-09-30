import * as THREE from "three";
import { biomeBlend, BIOMES } from "./game";

/** Ground is evaluated along the route, not recoloured all at once at a boundary. */
export function routeSurface(distance: number) {
  const b = biomeBlend(Math.max(0, distance));
  const forest = (b.from === 1 ? 1 - b.mix : 0) + (b.to === 1 ? b.mix : 0);
  const city = (b.from === 0 ? 1 - b.mix : 0) + (b.to === 0 ? b.mix : 0);
  const snow = (b.from === 4 ? 1 - b.mix : 0) + (b.to === 4 ? b.mix : 0);
  return {
    b,
    forest,
    city,
    snow,
    halfWidth: 2.4 - forest * 0.85,
    markings: 1 - forest - snow,
  };
}

export function createTerrain() {
  const geometry = new THREE.BufferGeometry();
  const rows = 161,
    columns = 11;
  const positions = new Float32Array(rows * columns * 3);
  const colors = new Float32Array(rows * columns * 3);
  const surface = new Float32Array(rows * columns);
  const normals = new Float32Array(rows * columns * 3);
  const indices: number[] = [];
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < columns; j++) {
      normals[(i * columns + j) * 3 + 1] = 1;
      if (i < rows - 1 && j < columns - 1) {
        const a = i * columns + j;
        indices.push(
          a,
          a + 1,
          a + columns,
          a + 1,
          a + columns + 1,
          a + columns,
        );
      }
    }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("surface", new THREE.BufferAttribute(surface, 1));
  geometry.setIndex(indices);
  const travel = { value: 0 };
  // A repeating mipmapped texture stays stable in motion and at oblique angles.
  // Unfiltered, per-fragment hashes previously produced crawling/moiré on gravel.
  const pixels = new Uint8Array(256 * 256 * 4);
  let seed = 7719;
  for (let i = 0; i < 256 * 256; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 150 + (seed % 80);
    pixels.set([value, value, value, 255], i * 4);
  }
  const grainTexture = new THREE.DataTexture(pixels, 256, 256);
  grainTexture.wrapS = grainTexture.wrapT = THREE.RepeatWrapping;
  grainTexture.magFilter = THREE.LinearFilter;
  grainTexture.minFilter = THREE.LinearMipmapLinearFilter;
  grainTexture.generateMipmaps = true;
  grainTexture.anisotropy = 8;
  grainTexture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
  });
  material.addEventListener("dispose", () => grainTexture.dispose());
  material.onBeforeCompile = (shader) => {
    shader.uniforms.routeTravel = travel;
    shader.uniforms.routeGrain = { value: grainTexture };
    shader.vertexShader =
      `attribute float surface; varying float vSurface; varying vec2 vGround; uniform float routeTravel;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vSurface = surface; vGround = vec2(position.x + routeTravel, position.z);`,
    );
    shader.fragmentShader =
      `varying float vSurface; varying vec2 vGround; uniform sampler2D routeGrain;
      \n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float gravel = 1.0 - smoothstep(0.1,0.6,abs(vSurface-1.0));
      float grass = smoothstep(1.5,1.95,vSurface) * (1.0-smoothstep(2.1,2.5,vSurface));
      float paving = smoothstep(2.5,2.95,vSurface);
      float fine = texture2D(routeGrain,vGround*.22).r;
      float coarse = texture2D(routeGrain,vGround*.027).r;
      float grain = mix(.91+fine*.12, .65+fine*.42+coarse*.12, gravel);
      grain = mix(grain,.80+coarse*.26,grass);
      vec2 slabs = abs(fract(vGround*vec2(1.3,1.8))-.5);
      float joint = max(smoothstep(.475,.49,slabs.x),smoothstep(.475,.49,slabs.y));
      grain *= 1.0-paving*joint*.20;
      diffuseColor.rgb *= grain;`,
    );
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const asphalt = new THREE.Color("#616866"),
    gravel = new THREE.Color("#b1a083"),
    pavement = new THREE.Color("#b7b3a4"),
    white = new THREE.Color("#dce0d9"),
    grass = new THREE.Color(),
    road = new THREE.Color(),
    c = new THREE.Color();
  let lastOrigin = -Infinity;
  function update(distance: number) {
    // Translate complete route cells. Their edges never morph sideways between frames.
    const origin = Math.floor(distance * 0.65);
    mesh.position.x = origin - distance * 0.65;
    travel.value = origin;
    if (origin === lastOrigin) return;
    lastOrigin = origin;
    for (let i = 0; i < rows; i++) {
      const x = i - 80,
        actual = (origin + x) / 0.65;
      const s = routeSurface(actual);
      grass
        .set(BIOMES[s.b.from].color)
        .lerp(new THREE.Color(BIOMES[s.b.to].color), s.b.mix);
      road.copy(asphalt).lerp(gravel, s.forest).lerp(white, s.snow);
      const irregular =
        s.forest *
        (0.11 * Math.sin(actual * 0.9) + 0.06 * Math.sin(actual * 2.7));
      const edge = s.halfWidth + irregular;
      const zs = [
        -18,
        -5,
        -edge - 0.35,
        -edge - 0.07,
        -edge,
        0,
        edge,
        edge + 0.07,
        edge + 0.35,
        5,
        18,
      ];
      for (let j = 0; j < columns; j++) {
        const k = i * columns + j,
          inside = j >= 4 && j <= 6,
          rim = j === 3 || j === 7;
        positions[k * 3] = x;
        positions[k * 3 + 1] = inside ? 0.003 : rim ? 0.001 : -0.004;
        positions[k * 3 + 2] = zs[j];
        c.copy(inside ? road : grass);
        if (rim) c.lerp(road, 0.75);
        if (!inside && j > 0 && j < 10) c.lerp(pavement, s.city);
        colors[k * 3] = c.r;
        colors[k * 3 + 1] = c.g;
        colors[k * 3 + 2] = c.b;
        surface[k] = inside ? s.forest : rim ? 1 : 2 + s.city;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.surface.needsUpdate = true;
  }
  update(0);
  return { mesh, update };
}
