export const roofHeight = 3.15;
const roofColumns = [19.7, 24.05, 28.4, 32.75];
const roofSides = [-47.4, -39.45];
export const roofCorridorPosts = roofColumns.flatMap((x) => roofSides.map((z) => [x, z]));

// Fixed architectural meshes share a unit box and are drawn in material batches.
export function buildArchitecture(THREE, scene, materials) {
  const { timber, roofTile, plaster, lattice, cloth, brick, lantern, violet } = materials;
  const batches = new Map();
  const transform = new THREE.Object3D();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const lamps = [];

  function box(material, x, y, z, width, height, depth, rz = 0, ry = 0, rx = 0) {
    transform.position.set(x, y, z);
    transform.scale.set(width, height, depth);
    transform.rotation.set(rx, ry, rz, 'YXZ');
    transform.updateMatrix();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(transform.matrix.clone());
  }

  const hangingLanterns = [];
  function light(x, y, z, color = 'amber', size = 1) {
    box(timber, x, y + .34 * size, z, .045 * size, .38 * size, .045 * size);
    box(timber, x, y + .21 * size, z, .22 * size, .065 * size, .22 * size);
    box(timber, x, y - .23 * size, z, .22 * size, .07 * size, .22 * size);
    hangingLanterns.push({ x, y, z, size, color });
    lamps.push({ x, y, z, color });
  }

  function roof(x, y, z, width, depth, turn = 0, material = roofTile) {
    const sin = Math.sin(turn);
    const cos = Math.cos(turn);
    const rise = Math.min(depth * .26, 1.25);
    const half = depth / 2;
    const angle = Math.atan2(rise, half);
    const diagonal = Math.hypot(half, rise);
    for (const side of [-1, 1]) {
      const offset = side * half / 2;
      box(material, x + offset * sin, y + rise / 2, z + offset * cos,
        width, .14, diagonal, 0, turn, side * angle);
      const edge = side * half;
      box(timber, x + edge * sin, y - .04, z + edge * cos, width + .11, .13, .16, 0, turn);
    }
    box(timber, x, y + rise + .06, z, width + .2, .17, .17, 0, turn);
    for (const end of [-1, 1]) {
      const offset = end * width * .48;
      box(roofTile, x + offset * cos, y + rise + .19, z - offset * sin, .24, .33, .23, 0, turn);
    }
  }

  function pavilion(x, floor, z, width, depth, height, accent = lattice) {
    const top = floor + height;
    box(brick, x, floor + .17, z, width + .22, .34, depth + .23);
    box(plaster, x, floor + height / 2, z, width, height, depth);
    for (const side of [-1, 1]) {
      for (const edge of [-1, 1]) {
        box(timber, x + side * width / 2, floor + height / 2, z + edge * depth / 2, .21, height, .21);
      }
      box(timber, x, top - .17, z + side * depth / 2, width + .2, .27, .19);
      box(timber, x + side * width / 2, top - .17, z, .19, .27, depth + .2);
      box(accent, x, floor + height * .56, z + side * (depth / 2 + .025), width * .69, height * .49, .04);
      box(accent, x + side * (width / 2 + .025), floor + height * .56, z, .04, height * .49, depth * .64);
    }
    roof(x, top, z, width + .76, depth + .74);
  }

  function arch(x, floor, z, width, turn = 0, blue = false) {
    const sideX = Math.cos(turn);
    const sideZ = -Math.sin(turn);
    for (const side of [-1, 1]) {
      const offset = side * (width / 2 + .19);
      box(brick, x + offset * sideX, floor + .3, z + offset * sideZ, .75, .6, .92, 0, turn);
      box(timber, x + offset * sideX, floor + 1.74, z + offset * sideZ, .48, 3.03, .57, 0, turn);
      const bracket = side * (width / 2 - .17);
      box(timber, x + bracket * sideX, floor + 2.79, z + bracket * sideZ, .84, .19, .42, -side * Math.PI / 4, turn);
      const lampOffset = side * (width / 2 - .24);
      light(x + lampOffset * sideX, floor + 2.48, z + lampOffset * sideZ, blue ? 'blue' : 'amber', .82);
    }
    box(timber, x, floor + 3.1, z, width + 1.12, .35, .69, 0, turn);
    box(lattice, x, floor + 3.4, z, width + .48, .33, .52, 0, turn);
    roof(x, floor + 3.58, z, width + 1.58, 2.05, turn);
  }

  function stall(x, z, width, facing = 0) {
    const sin = Math.sin(facing);
    const cos = Math.cos(facing);
    const local = (material, u, y, v, w, h, d) =>
      box(material, x + u * cos + v * sin, y, z - u * sin + v * cos, w, h, d, 0, facing);
    local(timber, 0, .41, .02, width, .76, 1.48);
    local(lattice, 0, .43, .78, width * .87, .43, .08);
    local(timber, 0, .85, .03, width + .18, .16, 1.69);
    for (const side of [-1, 1]) {
      for (const depth of [-.68, .67]) local(timber, side * width * .47, 1.39, depth, .15, 2.78, .15);
      local(timber, side * width * .47, 2.62, 0, .12, .18, 1.67);
    }
    local(cloth, 0, 2.55, .82, width + .2, .28, .055);
    roof(x, 2.74, z, width + .29, 1.97, facing, cloth);
    light(x + .61 * cos + .81 * sin, 2.23, z - .61 * sin + .81 * cos, 'amber', .76);
  }

  function table(x, z, width, depth) {
    box(timber, x, .84, z, width, .16, depth);
    for (const offsetX of [-.39, .39]) {
      for (const offsetZ of [-.36, .36]) {
        box(timber, x + offsetX * width, .4, z + offsetZ * depth, .13, .8, .13);
      }
    }
    box(lattice, x, .68, z + depth / 2 - .1, width * .88, .14, .09);
  }

  function stringLights(z, start, end, height) {
    const pieces = 10;
    const span = end - start;
    const yAt = (fraction) => height - .66 * Math.sin(fraction * Math.PI);
    for (let i = 0; i < pieces; i++) {
      const y1 = yAt(i / pieces);
      const y2 = yAt((i + 1) / pieces);
      const segment = span / pieces;
      const x = start + (i + .5) * segment;
      box(timber, x, (y1 + y2) / 2, z, Math.hypot(segment, y2 - y1) + .015, .026, .026, Math.atan2(y2 - y1, segment));
      if (i % 2 === 0) light(x, (y1 + y2) / 2 - .43, z, 'amber', .71 + (i % 3) * .08);
    }
  }

  // The square is open to the sky, enclosed by shop fronts and timber stalls.
  for (const side of [-1, 1]) {
    for (const z of [-6.1, -.5, 5.2]) {
      pavilion(side * 10.4, 0, z, 3.95, 5.24, 4.4);
      stall(side * 6, z + .08, 2.56, -side * Math.PI / 2);
    }
    pavilion(side * 6, 0, -10.3, 5.1, 3.4, 3.33);
    pavilion(side * 5.95, 0, 9.75, 5.3, 2.5, 3.85);
  }
  arch(0, 0, 8.56, 5.1);
  arch(0, 0, -8.63, 5.25, 0, true);
  stringLights(3.3, -8.7, 8.7, 4.43);
  stringLights(-3.6, -8.7, 8.7, 4.35);
  table(0, 2.78, 1.48, 1.04);
  table(3.6, 1.26, 1.82, 1.31);

  // The blue alley has deep piers and inset windows along both sides.
  for (const side of [-1, 1]) {
    for (const z of [-11.65, -15.18, -18.72, -22.26, -25.8]) {
      box(plaster, side * 3.26, 1.76, z, .56, 3.52, 3.56);
      box(brick, side * 3.02, .33, z, .19, .66, 3.48);
      box(lattice, side * 2.93, 1.94, z, .075, 1.23, 1.96);
      box(timber, side * 2.91, 1.78, z + 1.64, .24, 3.56, .29);
      box(timber, side * 2.97, 3.22, z, .38, .24, 3.5);
      roof(side * 3.44, 3.46, z, 3.82, 1.85, Math.PI / 2);
    }
    for (const z of [-12.5, -19.3, -24.5]) light(side * 2.63, 2.69, z, 'blue', .72);
  }
  arch(0, 0, -28.87, 5.45, 0, true);

  // Beams, awnings and actual shop bays line the covered market.
  for (const side of [-1, 1]) {
    for (const z of [-33.4, -40, -46.5]) {
      if (side === -1 || z !== -46.5) pavilion(side * 10.9, 0, z, 2.8, 6.25, 4.1);
      if (side === -1 || z !== -46.5) stall(side * 7, z + .25, 3.22, -side * Math.PI / 2);
    }
    for (const z of [-31, -38, -44.6, -49.45]) {
      box(timber, side * 4.5, 2.42, z, .26, 4.85, .27);
      box(brick, side * 4.5, .25, z, .49, .5, .49);
      light(side * 3.98, 3.7, z, 'amber', 1.05);
    }
    pavilion(side * 5.9, 0, -52.25, 6.25, 2.35, 5);
  }
  for (const z of [-31, -38, -44.6, -49.45]) box(timber, 0, 4.73, z, 9.3, .25, .31);
  for (const [z, width] of [[-33.95, 9.4], [-41.3, 9.4], [-47.05, 9.4]]) {
    roof(0, 4.94, z, width, 7.2);
  }
  arch(0, 0, -50.38, 4.1);
  pavilion(0, 0, -54.7, 4.3, 4.1, 4.15);
  table(1.95, -39.19, 3.6, 1.25);
  arch(10, 0, -44, 5.35, Math.PI / 2);

  // The ramp climbs from the market to a genuinely elevated roof terrace.
  const slope = Math.atan2(roofHeight, 7);
  const rampLength = Math.hypot(7, roofHeight);
  for (const side of [-1, 1]) {
    const z = -44 + side * 2.85;
    box(timber, 13.5, roofHeight / 2 + .78, z, rampLength, .15, .14, slope);
    box(brick, 13.5, roofHeight / 2 + .15, z, rampLength, .27, .32, slope);
    for (const x of [10.2, 11.8, 13.7, 15.4, 16.85]) {
      const y = roofHeight * (x - 10) / 7;
      box(timber, x, y + .4, z, .15, .81, .15);
    }
  }
  for (const z of [-49.74, -34.25]) {
    box(brick, 29, roofHeight + .3, z, 23.6, .59, .28);
    box(timber, 29, roofHeight + .65, z, 23.7, .15, .35);
    for (const x of [17.7, 21.5, 25.4, 29.3, 33.2, 37.1, 40.4]) {
      box(brick, x, roofHeight + .39, z, .31, .79, .33);
    }
  }
  arch(17.75, roofHeight, -44, 5.1, Math.PI / 2, true);
  arch(37.2, roofHeight, -43.3, 5.5, Math.PI / 2);
  for (const [x, z] of roofCorridorPosts) {
    box(brick, x, roofHeight + .21, z, .47, .42, .47);
    box(timber, x, roofHeight + 1.63, z, .22, 3.18, .24);
  }
  for (const x of roofColumns) {
    box(timber, x, roofHeight + 3.04, -43.43, .23, .24, 8.18);
  }
  for (const z of roofSides) {
    box(timber, 26.25, roofHeight + 3.2, z, 13.3, .24, .27);
  }
  roof(26.25, roofHeight + 3.32, -43.42, 14.15, 8.96);
  for (const x of [19.9, 24.3, 28.7, 33.1, 39.2]) {
    box(timber, x, roofHeight + .99, -47.35, .23, 1.98, .23);
    light(x, roofHeight + 1.94, -47.1, 'amber', .78);
  }
  for (const x of [20.05, 26.6, 33.15, 39.7]) {
    pavilion(x, -3.5, -54, 6.15, 5.1, 4.2);
    pavilion(x + .95, -4.2, -30.05, 5.7, 4.0, 4.05);
  }
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const x = 12.2 + i * 5.85 + row * 2.75;
      pavilion(x, -3.5 - row, -59 - row * 8, 4.5, 4.45, 6.25 + (i % 3) * .65);
    }
  }
  for (const [x, z] of [[48, -52], [53, -33], [36, -65]]) {
    pavilion(x, -3.4, z, 6.2, 5.65, 4.5);
    pavilion(x, .96, z, 4.4, 4.1, 2.48);
    pavilion(x, 3.35, z, 2.9, 2.75, 1.85);
  }

  for (const [material, list] of batches) {
    const mesh = new THREE.InstancedMesh(unit, material, list.length);
    list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.computeBoundingSphere();
    // Walkway boundaries and functional furniture provide collision and targeting.
    mesh.raycast = () => {};
    scene.add(mesh);
  }
  const paper = new THREE.SphereGeometry(1, 12, 8);
  for (const [color, material] of [['amber', lantern], ['blue', violet]]) {
    const lights = hangingLanterns.filter((item) => item.color === color);
    const globes = new THREE.InstancedMesh(paper, material, lights.length);
    lights.forEach(({ x, y, z, size }, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(.2 * size, .25 * size, .2 * size);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      globes.setMatrixAt(index, transform.matrix);
    });
    globes.computeBoundingSphere();
    globes.raycast = () => {};
    scene.add(globes);
  }
  return lamps;
}
