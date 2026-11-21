export const opening = [
  {
    image: 'prelude-1.webp',
    description: '两位小车手在月桥边约好比赛。比比谁先到！',
  },
  { image: 'prelude-2.webp', description: '两位车手抬头一看，桥灯全灭了！' },
  {
    image: 'prelude-3.webp',
    description: '守灯人小梅看着熄灭的灯。得把火种送到这边。',
  },
  {
    image: 'prelude-4.webp',
    description: '小车手伸手去拿对讲机。小车手，听得见吗？',
  },
];

export const parts = {
  stabilizer: { name: '稳轮夹', icon: '⬡', line: '夹住火种，适合颠簸的近路。' },
  runner: {
    name: '快轮扣',
    icon: '◎',
    line: '转动轻快，适合平坦的长路。试跑时要慢慢加速。',
  },
};

export const lookoutBriefing =
  'It’s Mei, the keeper across the bridge. The storm knocked out both bridge lamps. The night freight carts won’t see the crossing in the dark. Can you help me relight it? Cross the right-hand footbridge to the lookout. My father’s record is beside the telescope. It explains what the last keeper did.';

export const tasks = [
  { title: '走到工作台前', cue: '按方向键或拖动摇杆，向前走几步。' },
  { title: '看看四周', cue: '拖动画面，看看车站和月桥。' },
  { title: '拿起对讲机', cue: '走近右边的工作台，拿起对讲机。', item: 'radio' },
  {
    title: '听听小梅怎么说',
    cue: '打开对讲机，看看新消息。',
    item: 'radio',
    guide: lookoutBriefing,
  },
  {
    title: '拿起火种',
    cue: '回发车站，拿起对讲机桌上的备用火种。',
    item: 'spark',
    guide:
      'That glowing canister beside the radio sends a new flame across. Bring it to the cart so we can get it over the bridge without it going out.',
  },
  {
    title: '把火种装上灯车',
    cue: '走近米黄色的灯车，把火种放进车尾的架子。',
    item: 'cart',
    guide:
      'The cream cart is yours. Put the spark in its rear holder, then we can try a practice run.',
  },
  {
    title: '拉下试跑杆',
    cue: '到左边的试跑台拉下红色手柄。',
    item: 'lever',
    guide:
      'Pull the red lever across from the cart. We’ll see if the holder can take a bumpy run.',
  },
  {
    title: '查找手册里的图',
    cue: '把手册翻到第三页，读一读。',
    item: 'handbook',
    guide:
      'The record says page three. Check the handbook on the workshop table. The drawing shows where to fit a clasp so the spark stays put.',
  },
  {
    title: '选一个车扣',
    cue: '到西侧修理坊的零件架，挑一个适合你路线的车扣。',
    item: 'shelf',
    guide:
      'The stabilizer is made for the bumpy shortcut. The runner rolls faster on the smooth bend. Take whichever suits the route you want.',
  },
  {
    title: '装好车扣',
    cue: '回到灯车旁，把车扣装在火种架上。',
    item: 'cart',
    guide:
      'Bring the fitting back to your cart and attach it to the spark holder.',
  },
  {
    title: '再练习一次',
    cue: '回到试跑台。先练习，再出发。',
    item: 'lever',
    guide:
      'Let’s try again. The stabilizer can handle a hard run. With the runner, ease the speed up and keep it steady.',
  },
  {
    title: '上车参加竞速',
    cue: '回到灯车旁。上桥后选近路或平路，把火种送到对岸。',
    item: 'cart',
    guide:
      'The spark held! The routes fork past the first ridge. Choose the one that fits your cart. Whatever happens in the race, keep going to the far landing.',
  },
  {
    title: '把火种交给小梅',
    cue: '走到对岸车站的高灯旁，把火种放进去。',
    item: 'beacon',
    guide:
      'You made it! I’m beside the tall lantern. Bring the spark here and I’ll light this end of the bridge.',
  },
];

export const objects = {
  radio: '对讲机',
  spark: '火种',
  cart: '灯车',
  lever: '红色手柄',
  handbook: '司机手册',
  shelf: '零件架',
  signal: '望远镜旁的记录',
  archive: '档案柜',
  dispatch: '发车牌',
  arrival: '交接簿',
  beacon: '月桥灯',
};
