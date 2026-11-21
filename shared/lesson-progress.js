const keyFor = (level, lesson) =>
  'rpg-chinese.completed.' + level + '.' + lesson;
const previousSaves = {
  p3: ['rpg-chinese.p3.l1.moonbridge', 'passed'],
  p6: ['greenhouse-p6-lesson1-v1', 'lessonComplete'],
};

export function markLessonComplete(level, lesson) {
  try {
    localStorage.setItem(keyFor(level, lesson), '1');
  } catch {
    // The lesson can still finish when storage is unavailable.
  }
}

export function lessonCompleted(level, lesson) {
  try {
    if (localStorage.getItem(keyFor(level, lesson)) === '1') return true;
    const previous = lesson === 1 && previousSaves[level];
    if (!previous) return false;
    return (
      JSON.parse(localStorage.getItem(previous[0]))?.[previous[1]] === true
    );
  } catch {
    return false;
  }
}
