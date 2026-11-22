export const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
export const arrival = { x: .78, z: 3.8, yaw: .5, pitch: -.18 };

export const opening = [
  ['prelude-1', '雾港的灯亮了。奶奶和我正要回家吃团圆饭。', '奶奶，大家都在等我们呢！'],
  ['prelude-2', '雾越来越浓。渡船擦过下层浮台，奶奶伸手拉住一个小孩。', '别怕，牵住我的手！'],
  ['prelude-3', '渡船带动了浮台。奶奶和小孩顺着浮台漂到低处，红伞消失在雾里。', '奶奶！我去找你！'],
].map(([image, alt, caption]) => ({ image: art(image), alt, caption }));

export const ending = [{
  image: art('ending'), alt: '两家人在灯火下围坐吃饭，远处的渡船平稳地靠着码头。',
  caption: '奶奶笑眯眯地说：“来，一起吃团圆饭吧！”',
}];

export const labels = {
  phone: '智能手机', markers: '码头路牌', stairs: '浮梯踏板',
  coat: '干外套', escort: '奶奶和小男孩', winch: '渡船绞盘', handover: '团圆留言簿',
};

const check = (prompt, choices, answer, feedback) => ({ prompt, choices, answer, feedback });
export const chapters = [
  {
    id: 'markers', title: '雾里的电话', cue: '查看桌边的码头路牌，找出通往下层浮台的方向。',
    guide: 'It’s Lan. Grandma was helping a little boy when their landing drifted away. I just spotted her red umbrella on the lower landing. Look for the hanging sign on the right as you leave our dinner table. It’ll point you to the right landing.',
    hint: 'Head out from the dinner table towards the harbour. Look for the dark blue hanging sign on your right.',
    clue: '雾港灰蒙蒙的，我正疑惑该往哪儿走，便用智能手机拨打阿岚的号码。她说，奶奶和小男孩在下层浮台。小男孩的家庭也在等他回去。',
    words: ['家庭', '拨打', '智能手机', '灰蒙蒙', '疑惑'],
    checks: [
      check('按照路牌，要去奶奶所在的下层浮台，该怎么走？', ['沿着栈道往前走。', '掉头回上层码头。', '留在团圆桌旁。'], 0, '路牌指向前方。沿着栈道走，就能找到通往下层浮台的浮梯。'),
      check('雾港灰蒙蒙的，我对路线有疑惑时，是怎么弄清楚的？', ['用智能手机拨打阿岚的号码。', '在上层码头等雾散去。', '跟着小男孩的家庭回家。'], 0, '我拨打阿岚的号码，得知奶奶和小男孩在下层浮台。'),
    ],
  },
  {
    id: 'stairs', title: '越过浮梯', cue: '走到浮梯旁，等踏板对齐再跃过去，检查下层斜坡。',
    guide: 'The upper landing will lift at dawn. Take the floating steps down one at a time. The last ramp looks crooked from here. Check what’s supporting it before bringing Grandma back that way.',
    hint: 'The floating steps start beneath the amber frame at the far end of the market dock.',
    paper: '浮梯 · 检查记录',
    clue: '看准踏板，迅速踩稳，再向前一蹦。下层斜坡向一边倾斜，旁边的路牌也挂歪了。先检查支架的基础，再用木柱撑住斜坡，回程才稳当。',
    words: ['基础', '倾斜', '蹦', '迅速', '踩', '歪', '撑'],
    checks: [
      check('为什么要先检查基础，再用木柱撑住斜坡？', ['让斜坡稳住，好让奶奶走过。', '让路牌向另一边歪。', '让踏板蹦得更高。'], 0, '基础要牢固，木柱才能把倾斜的斜坡撑稳。'),
      check('哪一种动作是“蹦”？', ['双脚一起用力跳到下一块踏板。', '用脚轻轻踩住已经对齐的踏板。', '迅速伸手扶正路牌。'], 0, '“踩”是脚踏住，“蹦”是跳起来。“迅速”说的是速度。'),
    ],
  },
  {
    id: 'coat', title: '找一件干外套', cue: '到候船室的衣架旁，取一件干外套给奶奶。',
    guide: 'You made it down! They’re in the little waiting room. Grandma gave the boy the dry corner of the umbrella, so her coat is soaked. There’s a spare coat on the peg.',
    hint: 'Follow the warm lights into the waiting room. The ochre coat hangs to the left of the bench.',
    paper: '候船室 · 见面记录',
    clue: '“呀，你真的找到我们了！”小男孩惊讶地睁大眼睛。奶奶的外套湿透了，脸色苍白，嘴唇也在发抖。她需要换一件干外套。',
    words: ['呀', '惊讶', '湿透', '苍白', '换', '嘴唇'],
    checks: [
      check('奶奶为什么要换外套？', ['原来的外套从里到外都湿了。', '她的嘴唇沾了点茶。', '小男孩想看看外套的颜色。'], 0, '衣服从里到外都湿了，就叫“湿透”。'),
      check('哪项最能看出小男孩感到惊讶？', ['他睁大眼睛说：“呀，你真的来了！”', '他低头安静地整理外套。', '他看见奶奶的脸色苍白。'], 0, '出乎意料时，人会感到惊讶，也可能脱口说“呀”。'),
    ],
  },
  {
    id: 'escort', title: '扶他们上渡船', cue: '把干外套带到长椅旁，牵住小男孩的手，再挽着奶奶的胳膊。',
    guide: 'The return ramp is braced and the ferry’s waiting. Give Grandma the coat first. The boy will take your hand, and Grandma needs someone to walk beside her and support her arm.',
    hint: 'Grandma is next to the boy on the far side of the same waiting room, by the amber lamp.',
    paper: '下层浮台 · 登船记录',
    clue: '小男孩怕走上浮台，我牵住他的手。奶奶走得慢，我走在她身边，挽着她的胳膊。',
    words: ['牵', '挽'],
    checks: [
      check('怎样说最贴合刚才的动作？', ['牵着小男孩的手，挽着奶奶的胳膊。', '挽着小男孩的手，牵着奶奶的胳膊。', '牵着小男孩的围巾，挽着奶奶的外套。'], 0, '牵住的是手，挽住的是胳膊。'),
    ],
  },
  {
    id: 'winch', title: '把渡船拉回家', cue: '去泊位旁转动绞盘。等渡船摆到标记之间，再收紧缆绳。',
    guide: 'They’re aboard. I’ll steady the line from the other end. Pull when the ferry swings between the two amber markers, and we can bring it in without bumping the dock.',
    hint: 'Take the lantern-lined passage out of the waiting room. The big copper winch faces the ferry berth.',
    words: [], checks: [],
  },
  {
    id: 'handover', title: '团圆留言', cue: '到团圆桌旁翻开留言簿，记下两家人怎样互相帮助。',
    guide: 'You did it. The boy’s family is already at the table with ours. Grandma saved you a seat. Before we eat, leave a note for the next ferry crew about how everyone helped.',
    hint: 'Look for the low table under the lanterns beyond the winch. The reunion book is on it.',
    paper: '团圆留言簿',
    clue: '祖孙终于团圆了，奶奶笑眯眯地招呼大家坐下。互相帮助是一种美德。两家人一起接渡船、准备晚饭，也促进了彼此的交流。',
    words: ['祖孙', '美德', '促进', '笑眯眯'],
    checks: [
      check('哪件事既表现出互助的美德，又促进了两个家庭的交流？', ['两家人分工帮渡船靠岸，后来一起吃饭。', '各自回家，谁也没说话。', '只把灯都打开。'], 0, '互相帮助让两家人有机会了解彼此。'),
      check('哪句话写出了祖孙团圆时的样子？', ['奶奶和孙辈坐到一起，她笑眯眯地招呼大家。', '两个小男孩在码头比谁走得快。', '阿岚在电话里提醒大家看路牌。'], 0, '祖父母和孙辈是祖孙。笑眯眯写出了奶奶高兴的神情。'),
    ],
  },
];
