const fract = (value) => value - Math.floor(value);
const noise = (seed) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

export function createKit(THREE, scene) {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tubeGeometry = new THREE.CylinderGeometry(.5, .5, 1, 12);
  const taperedGeometry = new THREE.CylinderGeometry(.5, .36, 1, 14);
  const sphereGeometry = new THREE.SphereGeometry(.5, 12, 8);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const leafGeometry = createLeaf(THREE);
  const paperGeometry = createPaper(THREE);
  const batches = new Map();
  const transform = new THREE.Object3D();
  const images = new THREE.TextureLoader();
  const sources = new Map();

  function material(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: .76, ...options });
  }

  function group(x = 0, y = 0, z = 0, angle = 0, parent = scene) {
    const object = new THREE.Group();
    object.position.set(x, y, z);
    object.rotation.y = angle;
    parent.add(object);
    return object;
  }

  function shape(size, at, mat, parent, rotation, geometry) {
    const [x, y, z] = at;
    const [rx, ry, rz] = rotation ?? [0, 0, 0];
    if (parent || mat.transparent) {
      const part = new THREE.Mesh(geometry, mat);
      part.position.set(x, y, z);
      part.scale.set(...size);
      part.rotation.set(rx, ry, rz);
      (parent ?? scene).add(part);
      return part;
    }
    transform.position.set(x, y, z);
    transform.scale.set(...size);
    transform.rotation.set(rx, ry, rz);
    transform.updateMatrix();
    if (!batches.has(geometry)) batches.set(geometry, new Map());
    const materials = batches.get(geometry);
    if (!materials.has(mat)) materials.set(mat, []);
    materials.get(mat).push(transform.matrix.clone());
    return null;
  }

  function finish() {
    for (const [geometry, materials] of batches) {
      for (const [mat, matrices] of materials) {
        const mesh = new THREE.InstancedMesh(geometry, mat, matrices.length);
        matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        scene.add(mesh);
      }
    }
    batches.clear();
  }

  function texture(draw, width = 384, height = 384) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    draw(context, width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }

  function imageTexture(file, ready) {
    let source = sources.get(file);
    if (!source) {
      const url = new URL('./art/' + file, import.meta.url);
      source = new Promise((resolve) => {
        images.load(url.href, (map) => {
          map.colorSpace = THREE.SRGBColorSpace;
          map.anisotropy = 4;
          resolve(map);
        }, undefined, () => {
          sources.delete(file);
          resolve(null);
        });
      });
      sources.set(file, source);
    }
    // Clones share decoded pixels but keep their own UV transforms and sampler settings.
    void source.then((map) => {
      if (map) ready(map.clone());
    });
  }

  function imageMaterial(file, fallback, options) {
    const surface = material(fallback, options);
    imageTexture(file, (map) => {
      surface.map = map;
      surface.color.set('#ffffff');
      surface.needsUpdate = true;
    });
    return surface;
  }

  function metricSurface(file, fallback, tint, tilesPerMeter, options) {
    const surface = material(fallback, options);
    imageTexture(file, (map) => {
      map.wrapS = THREE.MirroredRepeatWrapping;
      map.wrapT = THREE.MirroredRepeatWrapping;
      map.repeat.set(...tilesPerMeter);
      surface.map = map;
      surface.color.set(tint);
      surface.onBeforeCompile = (shader) => {
        // Unit boxes share one geometry; project in local meters so instanced faces retain the same texel density.
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
          #include <uv_vertex>
          #ifdef USE_MAP
            mat4 surfaceModel = modelMatrix;
            #ifdef USE_INSTANCING
              surfaceModel = surfaceModel * instanceMatrix;
            #endif
            vec3 extent = vec3(length(surfaceModel[0].xyz), length(surfaceModel[1].xyz), length(surfaceModel[2].xyz));
            vec3 meters = (position + 0.5) * extent;
            vec2 faceUv = abs(normal.y) > 0.5 ? meters.xz : (abs(normal.x) > 0.5 ? meters.zy : meters.xy);
            vMapUv = (mapTransform * vec3(faceUv, 1.0)).xy;
          #endif
        `);
      };
      surface.needsUpdate = true;
    });
    return surface;
  }

  function flooring(color, grout, repeat = 1) {
    function draw(ctx, w, h, art) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      if (art) {
        ctx.globalAlpha = .78;
        ctx.drawImage(art, 0, 0, w, h);
        ctx.globalAlpha = 1;
      } else {
        for (let i = 0; i < 2600; i += 1) {
          const opacity = noise(i + 19) * .10;
          ctx.fillStyle = i % 2 ? 'rgba(19,26,30,' + opacity + ')' : 'rgba(238,240,211,' + opacity + ')';
          ctx.fillRect(noise(i + 1223) * w, noise(i + 284) * h, 1 + noise(i + 26) * 2, 1 + noise(i + 101) * 2);
        }
      }
      ctx.strokeStyle = grout;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.strokeStyle = '#f0e5c239';
      ctx.lineWidth = 1;
      ctx.strokeRect(3.5, 3.5, w - 7, h - 7);
    }
    const map = texture(draw, 256, 256);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, repeat);
    return {
      surface: material('#ffffff', { map }),
      setImage(image) {
        const canvas = map.image;
        draw(canvas.getContext('2d'), canvas.width, canvas.height, image);
        map.needsUpdate = true;
      },
    };
  }

  function plate(text, width, height, at, angle = 0, options = {}) {
    const { color = '#e5f0df', bg = '#162f31', accent = '#d2d9a0', size = 37, secondary = '', parent, art } = options;
    function draw(ctx, w, h, backing) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (backing) ctx.drawImage(backing, 0, 0, w, h);
      else {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 7, h);
        ctx.strokeStyle = '#e5edcf3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 3, w - 8, h - 6);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + size + 'px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2 + 3, secondary ? h * .39 : h / 2, w - 20);
      if (secondary) {
        ctx.font = '600 ' + Math.max(16, size * .46) + 'px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText(secondary, w / 2 + 3, h * .72, w - 22);
      }
    }
    const map = texture(draw, 400, Math.max(90, Math.round(400 * height / width)));
    if (art) {
      imageTexture(art, (source) => {
        const { image: canvas } = map;
        draw(canvas.getContext('2d'), canvas.width, canvas.height, source.image);
        map.needsUpdate = true;
        source.dispose();
      });
    }
    const mat = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    return shape([width, height, 1], at, mat, parent, [0, angle, 0], planeGeometry);
  }

  return {
    group, material, texture, imageTexture, imageMaterial, metricSurface, plate, flooring, finish,
    ready: () => Promise.all(sources.values()),
    box: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, boxGeometry),
    tube: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, tubeGeometry),
    pot: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, taperedGeometry),
    round: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, sphereGeometry),
    leaf: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, leafGeometry),
    plane: (size, at, mat, parent = null, rotation) => shape(size, at, mat, parent, rotation, planeGeometry),
    crumpledPaper: (size, at, mat, parent) => shape(size, at, mat, parent, undefined, paperGeometry),
  };
}

function createPaper(THREE) {
  const folds = [
    [0.13, .07, .21, .11, .36],
    [0.09, .52, .27, .62, .12],
    [0.28, .26, .79, .32, .23],
    [0.15, .48, .30, .58, .16],
    [0.36, .07, .29, .12, .18],
  ];
  const positions = [];
  const shades = [];
  const uv = [];
  const indices = [];
  for (let row = 0; row < folds.length; row += 1) {
    for (let column = 0; column < folds.length; column += 1) {
      const i = row * folds.length + column;
      const u = column / (folds.length - 1);
      const v = row / (folds.length - 1);
      positions.push(u - .5 + (noise(i + 69) - .5) * .115, folds[row][column], v - .5 + (noise(i + 33) - .5) * .115);
      const shade = .66 + folds[row][column] * .40;
      shades.push(shade, shade * .98, shade * .9);
      uv.push(u, 1 - v);
      if (row && column) {
        const a = i - folds.length - 1;
        const b = i - folds.length;
        const d = i - 1;
        if ((row + column) % 2) indices.push(a, d, i, a, i, b);
        else indices.push(a, d, b, b, d, i);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const facets = geometry.toNonIndexed();
  facets.computeVertexNormals();
  return facets;
}

function createLeaf(THREE) {
  const positions = [];
  const uv = [];
  const shades = [];
  const indices = [];
  for (let i = 0; i <= 10; i += 1) {
    const u = i / 10;
    const profile = Math.sin(Math.PI * u) ** .87;
    for (const across of [-1, -.06, .06, 1]) {
      positions.push(u - .5, profile * (.095 + (.5 - Math.abs(across)) * .13) - .22 * u * u, .5 * profile * across);
      uv.push(u, .5 - .5 * profile * across);
      const vein = Math.abs(across) < .1;
      const shade = (vein ? .95 : .68) + (across > 0 ? .13 : .04) + Math.sin(u * Math.PI) * .15;
      shades.push(shade, shade, shade * .94);
    }
    if (i === 0) continue;
    for (let j = 0; j < 3; j += 1) {
      const a = (i - 1) * 4 + j;
      const b = a + 4;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
