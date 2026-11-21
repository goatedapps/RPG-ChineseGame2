import { bank } from './curriculum.js';

const question = (prompt, choices, correct, feedback) => ({ prompt, choices, correct, feedback });

export const fieldwork = {
  4: {
    title: '东侧瞭望台',
    item: 'signal',
    cue: '过东侧木桥，到望远镜旁查看守灯人的记录。',
    guide: 'The storm knocked out both bridge lamps. Without them, the night freight carts can’t see the crossing. Go across the right-hand footbridge to the lookout. My father’s record is beside the telescope. It explains what the last keeper did.',
    hint: 'From the radio table, face the tracks. Take the footbridge on your right, beside the blue lantern, then look for the brass telescope.',
    image: 'lookout',
    clue: '爷爷以前当灯车司机。他希望我将来也能成为一名司机。他教我用科学的方法观察桥灯。风把灯吹灭后，只要把备用火种交给对岸的守灯人，就能重新点灯。',
    words: ['科学', '将来', '当', '司机', '希望', '成为'],
    questions: [
      question('根据记录，怎样才能让月桥重新亮起来？', ['等风停下来。', '把备用火种送到对岸。', '用望远镜照亮木桥。'], '把备用火种送到对岸。', '备用火种要送给对岸的守灯人。'),
      bank[0],
    ],
    writing: ['将来', '司机'],
    done: '从瞭望台回到发车站，拿起备用火种。',
  },
  7: {
    title: '西侧修理坊 · 档案柜',
    item: 'archive',
    cue: '过西侧木桥，查看修理坊的档案柜。',
    guide: 'The spark jumped out on the test track. If that happens on the bridge, we’ll lose it below. Cross the left footbridge to the workshop. The repair crew left a reading slip in the archive. It points to the page you need.',
    hint: 'From the depot, face the tracks. Take the footbridge on your left by the red lantern. The archive panel is along the back rail of the workshop.',
    image: 'archive',
    clue: '师傅请我做一件事：“把司机手册翻到第三页，读一读那篇课文。它讲的是怎样用车扣固定火种。”',
    words: ['讲', '篇', '课文', '做', '件', '翻到', '读'],
    questions: [
      question('按师傅的留言，你应该怎么做？', ['读第一页，找出车灯的位置。', '把第三页撕下来。', '翻到第三页，读固定火种的方法。'], '翻到第三页，读固定火种的方法。', '“翻到”是翻开书，找到指定的一页。'),
      question('“一件事”和“一篇课文”中，哪一个量词和“课文”搭配？', ['件', '篇', '页'], '篇', '用“篇”来数课文，用“件”来数事情。'),
    ],
    writing: ['翻到', '课文'],
    done: '到档案柜旁的工作台，把司机手册翻到第三页。',
  },
  10: {
    title: '发车站 · 试跑记录',
    item: 'lever',
    image: 'workshop',
    clue: '师傅写道：“试跑前先复习车扣的用法。第一次没成功，就再练习一次。只要努力，火种就能稳稳地留在车上。”',
    words: ['练习', '就', '努力', '复习'],
    questions: [
      question('哪一个做法是“复习”？', ['把已经读过的车扣用法再读一遍。', '第一次看见车扣。', '换一辆从没开过的灯车。'], '把已经读过的车扣用法再读一遍。', '把学过的内容再看一遍，是“复习”。反复试跑，是“练习”。'),
      bank[1],
    ],
    writing: ['练习', '复习'],
    done: '火种固定好了。去桥口找到发车牌。',
  },
  11: {
    title: '桥口 · 发车牌',
    item: 'dispatch',
    cue: '沿铁轨走到桥口，查看发车牌。',
    guide: 'Your cart is ready. Meet the other driver at the departure rail and read the sign. You can race, but the lamps need that spark whether you finish first or second.',
    hint: 'Follow the tracks past the parked cream cart toward the mouth of the bridge. The route sign stands just beside the track.',
    image: 'dispatch',
    clue: '车手们举手，表示准备好了。大家互相祝对方马到成功。先到终点的人得第一名，但把火种安全送过桥，才是这次的任务。',
    words: ['马到成功', '第一', '举手'],
    questions: [
      question('对手出发前对你说“马到成功”，他是什么意思？', ['祝你顺利成功。', '要你把马牵过来。', '告诉你已经得了第一名。'], '祝你顺利成功。', '“马到成功”是出发前可以送给对方的祝福。'),
    ],
    writing: ['举手'],
    done: '回到灯车旁，举手示意，准备出发。',
  },
  12: {
    title: '对岸灯台 · 交接簿',
    item: 'arrival',
    cue: '走到高灯前面的桌边，填写交接簿。',
    guide: 'You brought the spark through! The lamps were first built to guide the soldiers who guarded this pass. Read the handover log in front of the tall lamp. Then bring me the spark and we can relight the bridge.',
    hint: 'Step off the tracks to the right. The handover book is on the low table in front of the tall lamp.',
    clue: '两辆灯车在桥上你追我赶，真是一场龙争虎斗！很久以前，军人点亮桥灯，保卫这条山路。现在请把火种交给守灯人。',
    words: ['龙争虎斗', '你追我赶', '军人', '保卫', '交'],
    questions: [
      question('军人点亮桥灯，是为了什么？', ['保卫山路。', '让两辆车比赛。', '庆祝到达终点。'], '保卫山路。', '“保卫”是保护，让地方或人免受伤害。'),
      bank[2],
      bank[3],
    ],
    writing: ['保卫', '交'],
    done: '把火种交给高灯旁的小梅。',
  },
};
