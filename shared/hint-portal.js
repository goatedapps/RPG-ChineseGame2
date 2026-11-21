export function createHintPortal(THREE, scene, targets) {
  const glow = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, reveal: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: `
      varying vec2 portalUv;
      void main() {
        portalUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float reveal;
      varying vec2 portalUv;

      void main() {
        float radius = length(portalUv);
        if (radius < 0.46 || radius > 1.0) discard;

        float turn = atan(portalUv.y, portalUv.x) - time * 1.5;
        float flow = turn + (radius - 0.72) * 3.4;
        float strands = 0.0;
        float glowBands = 0.0;
        for (int i = 0; i < 13; i++) {
          float lane = float(i);
          float phase = lane * 2.39;
          float ring = 0.575 + lane * 0.021;
          ring += 0.031 * sin(2.0 * flow + phase);
          ring += 0.016 * sin(5.0 * flow - phase * 0.65);
          float distanceToRing = abs(radius - ring);
          float width = 0.005 + 0.0015 * mod(lane, 3.0);
          float core = 1.0 - smoothstep(width * 0.35, width, distanceToRing);
          float bloom = 1.0 - smoothstep(width, 0.031, distanceToRing);
          float arc = 0.16 + 0.84 * smoothstep(-0.4, 0.85, cos(flow + phase));
          strands += core * arc;
          glowBands += bloom * arc;
        }

        float aura = 1.0 - smoothstep(0.02, 0.26, abs(radius - 0.725));
        float wisps = pow(max(0.0, cos(8.0 * flow + 2.6 * sin(5.0 * turn))), 10.0);
        wisps *= smoothstep(0.77, 0.88, radius) * (1.0 - smoothstep(0.9, 1.0, radius));
        float alpha = min(1.0, strands * 0.85 + glowBands * 0.25 + aura * 0.16 + wisps * 0.29);
        if (alpha < 0.004) discard;

        vec3 amber = vec3(1.0, 0.255, 0.018);
        vec3 gold = vec3(1.0, 0.57, 0.075);
        vec3 cream = vec3(1.0, 0.90, 0.44);
        vec3 color = mix(amber, gold, min(1.0, glowBands * 0.48 + strands * 0.28));
        color = mix(color, cream, min(0.76, strands * 0.58));
        gl_FragColor = vec4(color, alpha * reveal);
        #include <colorspace_fragment>
      }
    `,
  });
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.08), glow);
  marker.name = 'hint-portal';
  marker.visible = false;
  marker.userData.nonOccluding = true;
  marker.raycast = () => {};
  scene.add(marker);
  const bounds = new THREE.Box3();
  const anchor = new THREE.Vector3();
  let tracked;
  let openedAt = 0;

  return function showHint(id, camera, clock, motion) {
    const target = targets.get(id);
    marker.visible = Boolean(target?.object.visible);
    if (!marker.visible) {
      tracked = null;
      return;
    }
    if (target !== tracked) {
      if (target.hintAnchor) anchor.fromArray(target.hintAnchor);
      else {
        bounds.setFromObject(target.object).getCenter(anchor);
        anchor.y = bounds.max.y + 0.035;
        target.object.worldToLocal(anchor);
      }
      tracked = target;
      openedAt = clock;
    }
    marker.position.copy(anchor);
    target.object.localToWorld(marker.position);
    if (camera) marker.quaternion.copy(camera.quaternion);
    const age = clock - openedAt;
    glow.uniforms.time.value = motion ? age : 0;
    glow.uniforms.reveal.value = motion
      ? THREE.MathUtils.smoothstep(age, 0, 0.24)
      : 1;
  };
}
