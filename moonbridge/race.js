export const FORK = 0.33;
export const MERGE = 0.74;
export const RACE_RIVAL_RATE = 0.044;

export function advanceRace(race, dt, throttle, brake) {
  const target = brake ? 8 : throttle ? 58 : 25;
  const rough =
    race.progress > FORK && race.progress < MERGE && race.route === 'rough';
  const tuned = rough ? race.part === 'stabilizer' : race.part === 'runner';
  const limit = rough ? (tuned ? 56 : 35) : tuned ? 61 : 53;
  const speed =
    race.speed + (Math.min(target, limit) - race.speed) * Math.min(dt * 3, 1);
  const distance =
    race.route === 'smooth' && race.progress > FORK && race.progress < MERGE
      ? 1120
      : 1000;
  return {
    ...race,
    speed,
    progress: Math.min(1, race.progress + (speed * dt) / distance),
    rival: Math.min(1, race.rival + RACE_RIVAL_RATE * dt),
  };
}

export function testPart(test, throttle) {
  if (!test.part) return false;
  if (test.part === 'stabilizer') return true;
  return throttle >= 0.4 && throttle <= 0.72;
}
