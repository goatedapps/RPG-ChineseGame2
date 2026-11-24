export const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
export const title = '追上漂走的剧场';
const board = (image, alt, caption) => ({ image: art(image), alt, caption });
export const opening = [
  board('opening-dock', '姑妈和孩子们在水上剧场挥手。剧场漂离码头。', '姑妈还在船上！剧场怎么漂走了？'),
  board('opening-river', '发条虎跳进河里，咬住剧场拖在水中的绳子。', '前面是瀑布！快沿河追上去！'),
];
export const ending = [
  board('ending-dock', '剧场靠在小码头，姑妈和孩子们平安上岸。', '剧场稳稳地靠了岸，大家都平安。'),
  board('ending-show', '发条虎在灯光下鞠躬，打了个喷嚏。大家都笑了。', '今晚第一个谢幕的是发条虎。它刚一鞠躬，就打了个喷嚏！'),
];

export const tutorial = [
  '用方向键或左下角的摇杆走几步。',
  '移动鼠标或拖动画面，看看码头。',
  '走到箱子旁，拿起对讲机。',
];

export const objects = {
  radio: { label: '拿起对讲机', image: 'radio', x: .3, z: 2.4, y: .94, height: .38 },
  crew: { label: '查看后台名单', image: 'roster', x: -1.8, z: -3.6, y: 1.12, height: .76 },
  rope: { label: '查看救援绳', image: 'rope', x: 1.75, z: -14.7, y: .64, height: .65 },
  tower: { label: '使用回声塔的望远镜', image: 'scope', x: 1.5, z: -27, y: .93, height: 1.05 },
  flag: { label: '看姑妈打旗语', image: 'flag', x: 2.55, z: -39.7, y: 1.28, height: .81 },
  winch: { label: '查看救援绞盘', image: 'winch', x: 2.55, z: -47, y: .55, height: 1.1 },
};

export const chapters = [
  {
    id: 'crew', region: '码头广场', title: '找人打开河边的小门',
    cue: '去广场的后台名单前，找出管钥匙的人。',
    guide: 'Auntie and the children are aboard. The theatre is drifting towards the falls! Find the person with the gate key so you can take the river path.',
    hint: 'The roster hangs above the crate to the left of the striped arch. Match each full name to the crew member’s job.',
    clue: '我姓陈，名叫小树，我拿着钥匙。李小雨带着工具，吴大山负责打信号。',
    words: ['陈', '李', '吴', '姓', '名'],
    lines: ['拿钥匙的人姓陈。', '带工具的人姓李。', '打信号的人姓吴。', '他姓陈，名叫小树。', '钥匙牌上的名是小树。'],
    question: '该请谁打开河边的小门？', choices: ['陈小树', '李小雨', '吴大山'], answer: 0,
    why: '名单写着陈小树拿着钥匙。',
  },
  {
    id: 'rope', region: '道具工坊', title: '清开通道，取救援绳',
    cue: '走进道具工坊，看看哪些道具挡住了救援绳。',
    guide: 'That opens the river gate. The theatre is getting farther away. Get the rescue rope from the prop workshop and take the shortcut to the tower.',
    hint: 'Look for the rope spool under the orange workshop roof. The two matching boxes are marked with a bear.',
    clue: '一双木鞋放在胖熊旁边。瘦猴身后有个矮门，一些箱子挡住了门。搬走两个画着胖熊的箱子，就能取出救援绳。',
    words: ['双', '胖', '瘦', '矮', '一些'],
    lines: ['地上有一双木鞋。', '箱子上画着一只胖熊。', '瘦猴站在门边。', '我们从矮门进去。', '门前堆着一些箱子。'],
    question: '哪两个箱子挡住了取绳的路？', choices: ['画胖熊的箱子', '画瘦猴的箱子', '画木鞋的箱子'], answer: 0,
    why: '工坊留言写着要搬走画胖熊的两个箱子。',
  },
  {
    id: 'tower', region: '回声塔', title: '看清发条虎在做什么',
    cue: '到回声塔，用望远镜看清剧场和河里的发条虎。',
    guide: 'A shout came from the tower. Someone called for Mr Hu, the tiger’s builder. Go up to the telescope and see what he can see.',
    hint: 'Follow the green stone path to the tall tower. Turn the brass wheel on the telescope to focus on the rope.',
    clue: '我姓胡。河水太响，隔着这么远，怎么谈天？姑妈懂旗语。旗语也是一种语言！看，发条虎咬住断绳，正把剧场往回拉。它的意思很清楚：快来帮忙！',
    words: ['胡', '言', '语言', '意思', '谈天'],
    lines: ['修发条虎的人姓胡。', '“说”有言字旁。', '大家用自己的语言打招呼。', '我看懂了这个手势的意思。', '大家常在塔下谈天。'],
    question: '发条虎咬住绳子是为了什么？', choices: ['让剧场慢一点漂走', '把剧场拖向瀑布', '把绳子藏起来'], answer: 0,
    why: '它在逆着水流拉住剧场，给大家争取时间。',
  },
  {
    id: 'flag', region: '瀑布栈道', title: '看旗语，送出救援绳',
    cue: '沿着河边栈道走，找到能看见姑妈的红旗的位置。',
    guide: 'The tiger is holding the theatre back. Auntie is on deck. Watch her flag and send the rope to the side she signals.',
    hint: 'Follow the red pennants along the boardwalk to the flag. The red flag points to the left side of the stage.',
    clue: '姑妈需要一个帮手。她举起一面红旗，这个动作看起来有点奇怪。我想问一个问题：绳子要扔到哪边？姑妈想了个聪明的办法：红旗指向舞台左边。',
    words: ['姑妈', '帮手', '聪明', '奇怪', '问题'],
    lines: ['姑妈在剧场上挥旗。', '姑妈需要一个帮手。', '她想了个聪明的办法。', '旗子的动作有点奇怪。', '我有一个问题想问她。'],
    question: '应该把绳子送到舞台哪边？', choices: ['左边', '右边', '正中间'], answer: 0,
    why: '红旗指向左边。姑妈在那里接绳。',
  },
  {
    id: 'winch', region: '瀑布栈道', title: '把剧场拉进河湾',
    cue: '沿栈道去红色绞盘，和发条虎一起拉住剧场。',
    guide: 'Auntie has tied the rescue line. The falls are close. Turn the winch when the tiger pulls, and bring the theatre into the sheltered bend.',
    hint: 'The red winch sits at the far end of the boardwalk. Step back to the marked position, then turn the wheel as the tiger pulls.',
    clue: '因为水流很急，大家要先退两步。我相信发条虎！大家一齐拉，剧场一定能靠岸。等演出开场，孩子们的梦想就成真了。',
    words: ['因为', '退', '相信', '一定', '梦想成真'],
    lines: ['因为水流很急，绳子绷紧了。', '大家往后退了两步。', '我相信发条虎会帮忙。', '大家一起拉，一定能成功。', '剧场重新开演，孩子们梦想成真了。'],
    question: '水流很急时，该怎么使用绞盘？', choices: ['往后退，配合发条虎一起拉', '往前走，抓着绳子追剧场', '放下绳子，等剧场自己靠岸'], answer: 0,
    why: '先退到线后，再配合发条虎拉绳。',
  },
];
