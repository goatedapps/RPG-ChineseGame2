import { mei } from './radio-messages.js';

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

export const tasks = [
  { title: '走到工作台前', cue: '按方向键或拖动摇杆，向前走几步。' },
  { title: '看看四周', cue: '点击画面后移动鼠标，或用手指拖动画面，看看四周。' },
  { title: '拿起对讲机', cue: '走近右边的工作台，拿起对讲机。', item: 'radio' },
  {
    title: '听听小梅怎么说',
    cue: '打开对讲机，看看新消息。',
    item: 'radio',
    guide: mei.lookoutBriefing,
  },
  {
    title: '拿起火种',
    cue: '回发车站，拿起对讲机桌上的备用火种。',
    item: 'spark',
    guide: mei.sparkBriefing,
  },
  {
    title: '把火种装上灯车',
    cue: '走近米黄色的灯车，把火种放进车尾的架子。',
    item: 'cart',
    guide: mei.cartBriefing,
  },
  {
    title: '拉下试跑杆',
    cue: '到左边的试跑台拉下红色手柄。',
    item: 'lever',
    guide: mei.leverBriefing,
  },
  {
    title: '查找手册里的图',
    cue: '把手册翻到第三页，读一读。',
    item: 'handbook',
    guide: mei.handbookBriefing,
  },
  {
    title: '选一个车扣',
    cue: '到西侧修理坊的零件架，挑一个适合你路线的车扣。',
    item: 'shelf',
    guide: mei.fittingsBriefing,
  },
  {
    title: '装好车扣',
    cue: '回到灯车旁，把车扣装在火种架上。',
    item: 'cart',
    guide: mei.installBriefing,
  },
  {
    title: '再练习一次',
    cue: '回到试跑台。先练习，再出发。',
    item: 'lever',
    guide: mei.retryBriefing,
  },
  {
    title: '上车参加竞速',
    cue: '回到灯车旁。上桥后选近路或平路，把火种送到对岸。',
    item: 'cart',
    guide: mei.raceBriefing,
  },
  {
    title: '把火种交给小梅',
    cue: '走到对岸的高灯旁，放入火种，再转动铜环点亮月桥。',
    item: 'beacon',
    guide: mei.beaconBriefing,
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
