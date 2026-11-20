export function createLabFurniture(kit, obstacle, materials) {
  const { box, plane, imageMaterial } = kit;
  const { floorShadow, counter: tabletop, wood, enamel, metal, trim } = materials;
  const cupboard = imageMaterial('lab/cupboard-front.webp', '#547369', { roughness: .74 });
  const drawer = imageMaterial('lab/drawer-front.webp', '#566f65', { roughness: .74 });
  const shelfRail = imageMaterial('lab/shelf-rail.webp', '#304a46', { roughness: .67, metalness: .2 });
  const crateSlats = imageMaterial('lab/crate-slats.webp', '#80614a', { roughness: .89 });

  function bench(x, z, width, depth, cabinet = false) {
    plane([width * 1.52, depth * 2.62, 1], [x, .008, z], floorShadow, null, [-Math.PI / 2, 0, 0]);
    box([width, .11, depth], [x, .98, z], tabletop);
    box([width - .06, .055, depth - .05], [x, .895, z], wood);
    if (cabinet) {
      box([width - .13, .78, depth - .12], [x, .43, z], enamel);
      box([width - .16, .11, depth - .19], [x, .095, z], trim);
      const count = Math.max(1, Math.round((width - .14) / .62));
      const spacing = (width - .14) / count;
      const panelWidth = spacing - .024;
      const front = z + depth / 2 - .039;
      for (let column = 0; column < count; column += 1) {
        const center = x + (column + .5 - count / 2) * spacing;
        for (const [height, y, finish] of [[.45, .36, cupboard], [.177, .708, drawer]]) {
          box([panelWidth, height, .034], [center, y, front], enamel);
          plane([panelWidth - .005, height - .005, 1], [center, y, front + .018], finish);
        }
      }
    } else {
      for (const sx of [-1, 1]) {
        const legX = x + sx * (width / 2 - .115);
        for (const sz of [-1, 1]) {
          const legZ = z + sz * (depth / 2 - .11);
          box([.095, .88, .095], [legX, .44, legZ], metal);
          box([.123, .032, .121], [legX, .026, legZ], trim);
        }
        box([.064, .055, depth - .15], [legX, .786, z], metal);
      }
      for (const sz of [-1, 1]) {
        box([width - .16, .08, .065], [x, .801, z + sz * (depth / 2 - .11)], metal);
      }
      box([width * .94, .065, depth * .8], [x, .26, z], trim);
      box([width * .92, .016, depth * .76], [x, .299, z], tabletop);
    }
    obstacle(x, z, width, depth);
  }

  function crate(x, y, z, width, height, depth, color = wood) {
    box([width, height, depth], [x, y, z], crateSlats);
    box([width * 1.04, .058, depth * 1.04], [x, y + height * .48, z], color);
    box([width * 1.01, .032, depth * 1.01], [x, y - height * .48, z], color);
    for (const side of [-1, 1]) {
      for (const edge of [-1, 1]) {
        box([.033, height * .83, .026], [x + side * width * .395, y, z + edge * depth * .495], color);
        box([.025, height * .83, .038], [x + edge * width * .494, y, z + side * depth * .398], color);
      }
    }
  }

  function shelves(x, z, width, depth, angle = 0) {
    const a = Math.sin(angle);
    const b = Math.cos(angle);
    const position = (localX, y, localZ) => [x + localX * b + localZ * a, y, z - localX * a + localZ * b];
    const rotation = [0, angle, 0];
    for (const y of [.19, .87, 1.55, 2.23]) {
      box([width, .07, depth], position(0, y, 0), enamel, null, rotation);
      box([width - .025, .014, depth - .037], position(0, y + .035, 0), tabletop, null, rotation);
      for (const side of [-1, 1]) {
        box([width - .036, .075, .023], position(0, y - .008, side * (depth / 2 - .013)), trim, null, rotation);
      }
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const postX = sx * (width / 2 - .036);
        const postZ = sz * (depth / 2 - .036);
        box([.07, 2.35, .07], position(postX, 1.17, postZ), trim, null, rotation);
        for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const face = position(postX + .0357 * Math.sin(facing), 1.17, postZ + .0357 * Math.cos(facing));
          plane([.066, 2.31, 1], face, shelfRail, null, [0, angle + facing, 0]);
        }
        box([.072, .024, .072], position(postX, .025, postZ), metal, null, rotation);
      }
    }
    const alongX = Math.abs(angle) < .4;
    obstacle(x, z, alongX ? width : depth, alongX ? depth : width);
  }

  return { bench, crate, shelves };
}
