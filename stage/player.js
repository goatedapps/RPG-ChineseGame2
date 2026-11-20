const TOP_SPEED = 346;
const GRAVITY = 1_650;
const JUMP_SPEED = 646;
const FEET_RADIUS = 10;
const COYOTE_TIME = 0.105;
const JUMP_BUFFER = 0.125;

export function createPlayer(x, y) {
  return {
    x, y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    groundGrace: 0,
    jumpBuffer: 0,
    jumped: false,
    landed: false,
    stride: 0,
    squash: 0,
    spray: [],
  };
}

function approach(value, target, maxChange) {
  return value + Math.max(-maxChange, Math.min(maxChange, target - value));
}

function releaseSpray(player, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const arc = i - (count - 1) / 2;
    const life = 0.16 + (i % 3) * 0.04;
    player.spray.push({
      x: player.x + arc * 3,
      y: player.y - 2,
      vx: arc * 30 - player.vx * 0.23,
      vy: -speed - (i % 3) * 13,
      size: 1 + (i % 3) * 0.55,
      life,
      duration: life,
    });
  }
}

function stepSpray(player, dt) {
  for (let i = player.spray.length - 1; i >= 0; i -= 1) {
    const drop = player.spray[i];
    drop.life -= dt;
    if (drop.life <= 0) {
      player.spray.splice(i, 1);
      continue;
    }
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    drop.vy += 420 * dt;
  }
}

function landingSurface(platforms, x0, y0, x1, y1) {
  if (y1 <= y0) return null;

  let surface = null;
  for (const platform of platforms) {
    if (platform.y < y0 || platform.y > y1 || (surface && platform.y >= surface.y)) continue;

    // Standing uses the new feet position so the player can step off a ledge.
    const fraction = platform.y === y0 ? 1 : (platform.y - y0) / (y1 - y0);
    const contactX = x0 + (x1 - x0) * fraction;
    if (contactX + FEET_RADIUS > platform.x && contactX - FEET_RADIUS < platform.x + platform.w) {
      surface = platform;
    }
  }
  return surface;
}

export function stepPlayer(player, input, dt, platforms) {
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const previousX = player.x;
  const previousY = player.y;
  const wasGrounded = player.grounded;
  const previousStride = player.stride;

  player.jumped = false;
  player.landed = false;
  player.squash = approach(player.squash, 0, dt * 1.9);
  player.groundGrace = wasGrounded ? COYOTE_TIME : Math.max(0, player.groundGrace - dt);
  player.jumpBuffer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, player.jumpBuffer - dt);
  stepSpray(player, dt);

  if (direction) player.facing = direction;
  const acceleration = direction ? (wasGrounded ? 2_450 : 1_780) : (wasGrounded ? 2_900 : 450);
  player.vx = approach(player.vx, direction * TOP_SPEED, acceleration * dt);

  if (player.jumpBuffer > 0 && player.groundGrace > 0) {
    if (wasGrounded) releaseSpray(player, 5, 48);
    player.vy = -JUMP_SPEED;
    player.groundGrace = 0;
    player.jumpBuffer = 0;
    player.jumped = true;
    player.squash = -0.12;
  }

  const gravity = !input.jumpHeld && player.vy < 0 ? GRAVITY * 2.85 : GRAVITY;
  player.vy = Math.min(player.vy + gravity * dt, 1_040);
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const surface = landingSurface(platforms, previousX, previousY, player.x, player.y);
  player.grounded = surface !== null;
  if (!surface) return;

  player.y = surface.y;
  player.landed = !wasGrounded && player.vy > 150;
  if (player.landed) {
    player.squash = Math.min(0.24, player.vy / 2_850);
    releaseSpray(player, 8, 72);
  }
  player.vy = 0;
  player.stride += Math.abs(player.vx) * dt / 13;
  if (wasGrounded && Math.abs(player.vx) > 100 && Math.floor(player.stride / Math.PI) !== Math.floor(previousStride / Math.PI)) {
    releaseSpray(player, 3, 32);
  }
}

const INK = '#10232a';
const COAT = '#237575';
const COAT_LIGHT = '#42a498';
const COAT_SHADOW = '#183e49';
const GOLD = '#ffc466';
const GOLD_LIGHT = '#ffeba4';
const GOLD_SHADOW = '#c67233';

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function limb(ctx, points, width, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  ctx.lineTo(points[2], points[3]);
  ctx.lineTo(points[4], points[5]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width + 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = fill;
  ctx.stroke();
}

function drawLeg(ctx, hipX, footX, footY, front) {
  const kneeX = (hipX + footX) * 0.5 + 2;
  limb(ctx, [hipX, -22, kneeX, (footY - 22) * 0.5, footX, footY - 3], 7, front ? '#527a87' : '#294d5d');
  ctx.beginPath();
  ctx.moveTo(footX - 4, footY - 6);
  ctx.quadraticCurveTo(footX + 2, footY - 7, footX + 3, footY - 4);
  ctx.quadraticCurveTo(footX + 10, footY - 4, footX + 7, footY);
  ctx.lineTo(footX - 5, footY);
  ctx.closePath();
  ctx.fillStyle = front ? '#244c52' : '#183840';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ellipse(ctx, footX + 4, footY - 3, 2.7, 0.9, '#70a294');
}

function drawCoat(ctx) {
  ctx.beginPath();
  ctx.moveTo(-9, -42);
  ctx.quadraticCurveTo(4, -46, 11, -39);
  ctx.quadraticCurveTo(11, -31, 14, -21);
  ctx.quadraticCurveTo(6, -15, -12, -18);
  ctx.lineTo(-13, -33);
  ctx.closePath();
  ctx.fillStyle = COAT;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5, -38);
  ctx.lineTo(7, -23);
  ctx.lineTo(11, -22);
  ctx.strokeStyle = COAT_LIGHT;
  ctx.stroke();
  ellipse(ctx, 7, -30, 1.3, 1.25, GOLD_LIGHT);
  ellipse(ctx, 8, -25, 1.3, 1.25, GOLD_LIGHT);
}

function drawHood(ctx) {
  ctx.beginPath();
  ctx.moveTo(-11, -40);
  ctx.quadraticCurveTo(-22, -47, -16, -59);
  ctx.quadraticCurveTo(-12, -68, -1, -66);
  ctx.quadraticCurveTo(12, -65, 20, -54);
  ctx.quadraticCurveTo(22, -52, 17, -49);
  ctx.quadraticCurveTo(17, -42, 8, -40);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(15, -54);
  ctx.quadraticCurveTo(10, -60, 4, -57);
  ctx.quadraticCurveTo(-1, -52, 1, -46);
  ctx.quadraticCurveTo(6, -39, 13, -44);
  ctx.quadraticCurveTo(17, -46, 17, -50);
  ctx.lineTo(19, -51);
  ctx.closePath();
  ctx.fillStyle = '#ed9d68';
  ctx.fill();
  ctx.strokeStyle = GOLD_SHADOW;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ellipse(ctx, 12.2, -52, 1.35, 2, INK);
  ellipse(ctx, 10.5, -47.2, 2.1, 1, '#f7b88d');

  ctx.beginPath();
  ctx.moveTo(-14, -56);
  ctx.quadraticCurveTo(-10, -65, 0, -63);
  ctx.quadraticCurveTo(9, -62, 14, -57);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.stroke();
}

function drawScarf(ctx, waving) {
  ctx.beginPath();
  ctx.moveTo(-5, -42);
  ctx.quadraticCurveTo(-18, -40, -33, -48 + waving);
  ctx.lineTo(-39, -44 + waving);
  ctx.quadraticCurveTo(-24, -34 + waving * 0.35, -7, -36);
  ctx.closePath();
  ctx.fillStyle = '#e9a947';
  ctx.fill();
  ctx.strokeStyle = '#81523c';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-11, -42);
  ctx.quadraticCurveTo(-2, -39, 9, -43);
  ctx.quadraticCurveTo(13, -41, 10, -38);
  ctx.quadraticCurveTo(2, -34, -12, -37);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.strokeStyle = GOLD_SHADOW;
  ctx.stroke();
}

export function drawPlayer(ctx, player, time, reducedMotion = false) {
  if (!reducedMotion) {
    for (const drop of player.spray) {
      ctx.save();
      ctx.globalAlpha *= (drop.life / drop.duration) * 0.8;
      ellipse(ctx, drop.x, drop.y, drop.size, drop.size * 0.65, '#a1eee4');
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.grounded) ellipse(ctx, 0, -1, 17, 3.7, '#0b283d75');
  ctx.scale(player.facing, 1);

  const speed = Math.abs(player.vx) / TOP_SPEED;
  const stride = Math.sin(player.stride);
  const bob = player.grounded
    ? Math.abs(stride) * speed * -2 + (reducedMotion ? 0 : Math.sin(time * 4) * (1 - speed))
    : 0;
  const squash = reducedMotion ? 0 : player.squash;
  ctx.scale(1 + squash * 0.64, 1 - squash);
  const frontFoot = player.grounded
    ? [3 + stride * 17 * speed, -Math.max(0, Math.cos(player.stride)) * 9 * speed]
    : [10 + speed * 5, player.vy < 0 ? -9 : -4];
  const rearFoot = player.grounded
    ? [-3 - stride * 17 * speed, -Math.max(0, -Math.cos(player.stride)) * 9 * speed]
    : [-11, player.vy < 0 ? -3 : -9];
  const nearArm = player.grounded ? -stride * 10 * speed : 7;
  const farArm = player.grounded ? stride * 10 * speed : -9;
  const wave = reducedMotion ? 0 : Math.sin(time * 13) * (2.4 + speed * 4.7);
  drawLeg(ctx, -6, rearFoot[0], rearFoot[1], false);
  drawLeg(ctx, 4, frontFoot[0], frontFoot[1], true);

  ctx.translate(speed * 2, bob);
  ctx.rotate(player.grounded ? speed * 0.1 : Math.max(-0.14, Math.min(0.13, player.vy / 3_000)));
  limb(ctx, [3, -37, 10 + farArm, -30, 12 + farArm, -27], 7.5, COAT_SHADOW);
  drawCoat(ctx);
  limb(ctx, [-6, -38, -9 + nearArm, -30, -3 + nearArm, -26], 8, COAT_LIGHT);
  ellipse(ctx, -2 + nearArm, -26, 3.7, 3, '#f5b584');
  drawScarf(ctx, wave - speed * 5);
  drawHood(ctx);
  ctx.restore();
}
