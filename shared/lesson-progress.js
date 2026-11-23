const keyFor = (level, lesson) =>
  'rpg-chinese.completed.' + level + '.' + lesson;
const lessonSaves = {
  p3: {
    1: { key: 'rpg-chinese.p3.l1.moonbridge', passed: 'passed', reachedFinal: (save) => save.storyFinished === true },
  },
  p6: {
    1: { key: 'greenhouse-p6-lesson1-v1', passed: 'lessonComplete', reachedFinal: (save) => save.finalStarted === true },
    2: { key: 'rpg-chinese.p6.l2.shadowmarket', passed: 'passed', reachedFinal: (save) => save.phase === 'final' },
  },
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
    const lessonSave = lessonSaves[level]?.[lesson];
    return Boolean(lessonSave && JSON.parse(localStorage.getItem(lessonSave.key))?.[lessonSave.passed] === true);
  } catch {
    return false;
  }
}

export function lessonReachedFinal(level, lesson) {
  try {
    const lessonSave = lessonSaves[level]?.[lesson];
    const save = lessonSave && JSON.parse(localStorage.getItem(lessonSave.key));
    return Boolean(save && lessonSave.reachedFinal(save));
  } catch {
    return false;
  }
}
