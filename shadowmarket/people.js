export function createMarketPeople(THREE, scene, texture, loads, lanternMaterial) {
  const geometryLoader = new THREE.BufferGeometryLoader();
  const cast = [];
  const shadowPixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const radius = Math.hypot((x + .5) / 16 - 1, (y + .5) / 16 - 1);
      shadowPixels[(y * 32 + x) * 4 + 3] = 140 * (1 - Math.min(radius, 1)) ** 1.5;
    }
  }
  const shadowMap = new THREE.DataTexture(shadowPixels, 32, 32);
  shadowMap.magFilter = THREE.LinearFilter;
  shadowMap.minFilter = THREE.LinearFilter;
  shadowMap.needsUpdate = true;
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);

  function dress(atlas) {
    const material = new THREE.MeshStandardMaterial({ roughness: .92 });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.turnaround = { value: atlas };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
        varying vec3 characterPosition;
        varying vec3 characterNormal;
      `).replace('#include <begin_vertex>', `#include <begin_vertex>
        characterPosition = position;
        characterNormal = normal;
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D turnaround;
        varying vec3 characterPosition;
        varying vec3 characterNormal;
        vec3 characterView(float horizontal, float column) {
          vec2 view = vec2(.5 + horizontal / 1.04, (characterPosition.y + .04) / 1.08);
          view = clamp(view, .008, .992);
          return texture2D(turnaround, vec2((column + view.x) / 3.0, view.y)).rgb;
        }
      `).replace('#include <map_fragment>', `
        vec3 viewNormal = normalize(characterNormal);
        float front = viewNormal.z >= 0.0 ? 1.0 : -1.0;
        float sideShare = abs(viewNormal.x) / (abs(viewNormal.x) + abs(viewNormal.z) + .0001);
        vec3 headOn = characterView(characterPosition.x * front, front > 0.0 ? 0.0 : 2.0);
        vec3 profile = characterView(-characterPosition.z, 1.0);
        diffuseColor.rgb *= mix(headOn, profile, smoothstep(.23, .76, sideShare));
      `);
    };
    return material;
  }

  function add(name, x, z, height, yaw) {
    const actor = new THREE.Group();
    actor.name = name;
    actor.position.set(x, 0, z);
    actor.rotation.y = yaw;
    actor.scale.setScalar(height);
    const atlas = texture(new URL(`./art/people/${name}.webp`, import.meta.url).href);
    const body = new THREE.Mesh(new THREE.BufferGeometry(), dress(atlas));
    body.name = `${name}-body`;
    actor.add(body);
    const ground = new THREE.Mesh(shadowGeometry, shadowMaterial);
    ground.position.y = .004;
    ground.scale.set(.86, .6, 1);
    ground.rotation.x = -Math.PI / 2;
    ground.raycast = () => {};
    actor.add(ground);
    scene.add(actor);
    cast.push({ actor, yaw });

    loads.push(fetch(new URL(`./art/people/${name}.json`, import.meta.url)).then((response) => {
      if (!response.ok) throw new Error(`Unable to load character ${name}`);
      return response.json();
    }).then((data) => {
      body.geometry.dispose();
      body.geometry = geometryLoader.parse(data);
      body.geometry.computeVertexNormals();
    }));
    return actor;
  }

  function giveLantern(actor) {
    const lantern = new THREE.Group();
    lantern.position.set(.172, .368, .02);
    actor.add(lantern);
    const metal = new THREE.MeshStandardMaterial({ color: '#6f471d', metalness: .37, roughness: .46 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.076, 16, 12), lanternMaterial);
    globe.scale.set(1, .86, 1);
    lantern.add(globe);
    for (const y of [-.061, .061]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .012, 12), metal);
      cap.position.y = y;
      lantern.add(cap);
    }
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(.077, .002, 4, 16), metal);
      rib.scale.y = .86;
      rib.rotation.y = i * Math.PI / 3;
      lantern.add(rib);
    }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.024, .004, 5, 14), metal);
    handle.position.set(-.016, .084, -.014);
    lantern.add(handle);
  }

  function idle(time, reducedMotion) {
    cast.forEach(({ actor, yaw }, index) => {
      actor.rotation.y = yaw + (reducedMotion ? 0 : Math.sin(time * .78 + index * 2) * .025);
    });
  }

  return { add, giveLantern, idle };
}
