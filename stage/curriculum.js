function term(word, pinyin, meaning, example, distractors, mode = 'meaning') {
  return { word, pinyin, meaning, example, distractors, mode };
}

function sector(id, title, terms) {
  return {
    id,
    title,
    words: terms.map(({ distractors, ...entry }, index) => {
      const choices = [...distractors];
      choices.splice(index % (choices.length + 1), 0, entry.meaning);
      return { ...entry, choices, prompt: entry.example };
    }),
  };
}

export const sectors = [
  sector('storm-walk', 'Storm Walk', [
    term('耀眼', 'yào yǎn', 'Dazzling', '一道耀眼的闪电照亮了整座楼。', [
      'Pitch-black',
      'Softly lit',
    ]),
    term('缝', 'fèng', 'A narrow gap', '冷风从门缝里吹进来。', [
      'A round window',
      'A tall fence',
    ], 'trace'),
    term('托', 'tuō', 'Support from below', '我用手托住花盆的底部。', [
      'Drop from above',
      'Pull to one side',
    ]),
    term('恶劣', 'è liè', 'Harsh or extremely bad', '天气十分恶劣，狂风把窗户吹开了。', [
      'Calm and mild',
      'Pleasant and comfortable',
    ]),
    term('暴雨', 'bào yǔ', 'Torrential rain', '一场暴雨过后，屋顶上到处都是积水。', [
      'A light drizzle',
      'A long drought',
    ], 'dictation'),
    term('严格', 'yán gé', 'Strict', '温室有严格的规定，进入前必须换鞋。', [
      'Easy-going',
      'Careless',
    ]),
    term('测验', 'cè yàn', 'A test or quiz', '老师用一个小测验来检查大家对植物的了解。', [
      'A field trip',
      'A group discussion',
    ]),
    term('克服', 'kè fú', 'Overcome', '她深吸一口气，努力克服对雷声的恐惧。', [
      'Give in to',
      'Make worse',
    ]),
  ]),
  sector('growing-bay', 'Growing Bay', [
    term('埋', 'mái', 'Bury in the ground', '他把种子埋在湿润的泥土里。', [
      'Lift into the air',
      'Take out of the soil',
    ]),
    term('扎根', 'zhā gēn', 'Take root', '小树在泥土里扎根后，渐渐长出了新叶。', [
      'Shed its leaves',
      'Dry up',
    ], 'trace'),
    term('每逢', 'měi féng', 'Whenever', '每逢下雨，管理员都会检查温室的窗户。', [
      'Only once',
      'Almost never',
    ]),
    term('鲜艳', 'xiān yàn', 'Brightly coloured', '温室里开满了颜色鲜艳的花。', [
      'Faded in colour',
      'Colourless',
    ]),
    term('柔弱', 'róu ruò', 'Delicate or frail', '这株幼苗十分柔弱，轻轻一碰就弯了。', [
      'Tough and sturdy',
      'Hard and stiff',
    ], 'dictation'),
    term('产生', 'chǎn shēng', 'Produce or give rise to', '植物在阳光下能产生氧气。', [
      'Remove completely',
      'Cover up',
    ]),
    term('优雅', 'yōu yǎ', 'Elegant or graceful', '她的动作十分优雅，像在跳舞一样。', [
      'Awkward and clumsy',
      'Hurried and messy',
    ]),
    term('梦', 'mèng', 'A dream during sleep', '昨晚，我做了一个在天空中飞翔的梦。', [
      'A real event',
      'An alarm clock',
    ]),
  ]),
  sector('recovery-beacon', 'Recovery Beacon', [
    term('锻炼', 'duàn liàn', 'Exercise or train the body', '管理员每天早晨到楼下的公园锻炼身体。', [
      'Rest the body',
      'Treat an injury',
    ]),
    term('懒惰', 'lǎn duò', 'Lazy', '他很懒惰，连收好工具也不愿意。', [
      'Hard-working',
      'Full of energy',
    ]),
    term('临时抱佛脚', 'lín shí bào fó jiǎo', 'Cram at the last minute', '他平时不复习，到了考试前一晚才临时抱佛脚。', [
      'Prepare well in advance',
      'Practise a little every day',
    ]),
    term('凭', 'píng', 'Rely on or by means of', '她凭着自己的经验，很快找到了漏水的地方。', [
      'Even without',
      'In spite of',
    ]),
    term('坚强', 'jiān qiáng', 'Strong or resilient', '遇到挫折后，她依然很坚强，继续照料幼苗。', [
      'Easily discouraged',
      'Physically tired',
    ], 'dictation'),
    term('意志', 'yì zhì', 'Willpower', '他靠坚定的意志完成了这项艰难的工作。', [
      'Good luck',
      'A sudden impulse',
    ]),
    term('不屈不挠', 'bù qū bù náo', 'Persevere without giving in', '尽管多次失败，她仍然不屈不挠地尝试。', [
      'Quit at the first setback',
      'Wait for someone else to act',
    ]),
    term('榜样', 'bǎng yàng', 'A role model', '她每天照料幼苗，是大家学习的榜样。', [
      'A warning sign',
      'A rival',
    ], 'trace'),
  ]),
];

export const words = sectors.flatMap(({ words }) => words);
