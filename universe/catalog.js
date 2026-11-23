export const levels = {
  p2: { label: '二年级', count: 19, accent: 0x7debdc, image: 'p2.webp' },
  p3: { label: '三年级', count: 17, accent: 0xffc479, image: 'p3.webp' },
  p5: { label: '五年级', count: 17, accent: 0xe4a0ff, image: 'p5.webp' },
  p6: { label: '六年级', count: 12, accent: 0x95bcff, image: 'p6.webp' },
};

const playable = {
  p3: {
    1: {
      title: '月桥竞速',
      href: 'p3-lesson1.html',
      art: '../moonbridge/art/cover.webp',
      transition: '穿过月光，驶向月桥。',
    },
  },
  p6: {
    1: {
      title: '暴雨后的温室',
      href: 'p6-lesson1.html',
      art: '../greenhouse/art/storm-cover.webp',
      transition: '穿过雨云，抵达温室。',
    },
    2: {
      title: '影子集市',
      href: 'p6-lesson2.html',
      art: '../shadowmarket/art/market.webp',
      transition: '穿过镜光，抵达影子集市。',
    },
  },
};

export const chineseLesson = (number) => {
  const digits = '零一二三四五六七八九';
  if (number < 10) return '第' + digits[number] + '课';
  return (
    '第' +
    (number >= 20 ? digits[Math.floor(number / 10)] : '') +
    '十' +
    (number % 10 ? digits[number % 10] : '') +
    '课'
  );
};

export function getWorlds(level, isComplete, canSkipFinal = () => false) {
  const { count } = levels[level];
  let prerequisite = true;
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const game = playable[level]?.[number];
    const complete = isComplete(level, number);
    const status =
      prerequisite || complete
        ? game
          ? complete
            ? 'complete'
            : 'open'
          : complete
            ? 'complete'
            : 'building'
        : 'locked';
    prerequisite = prerequisite && (complete || canSkipFinal(level, number));
    return {
      number,
      lesson: chineseLesson(number),
      title: game?.title ?? chineseLesson(number),
      status,
      ...game,
    };
  });
}
