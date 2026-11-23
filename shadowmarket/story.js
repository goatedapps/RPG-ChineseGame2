export const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
export const arrival = { x: .25, z: 6, yaw: .10, pitch: -.18 };

export const opening = [
  ['prelude-1', '夜晚的灯笼广场，家人正等着一起吃团圆饭。', '奶奶，我们也去看花灯吧！'],
  ['prelude-2', '我的影子从脚边跑开，家人的影子也跟了上去。', '呀！我们的影子怎么跑了？'],
  ['prelude-3', '影子们钻进镜子巷，消失在一面发光的镜子里。', '等等！你们要去哪儿？'],
].map(([image, alt, caption]) => ({ image: art(image), alt, caption }));

export const ending = [{
  image: art('ending'),
  alt: '旧灯笼照着祖孙俩，影子回到了大家的脚边。',
  caption: '奶奶笑眯眯地说：“你还记得吗？这是我们一起做的第一盏灯笼。”',
}];

export const objects = {
  phone: { name: '智能手机', art: 'phone', at: [0, 2.8], base: .93, height: .46 },
  trail: { name: '跟陈叔交谈', art: 'lantern-keeper', at: [-2, -5.4], height: 1.76 },
  mirror: { name: '歪斜的铜镜', art: 'mirror', at: [-1, -15.4], height: 1.85 },
  crossing: { name: '镜巷的石阶', art: 'festival-lantern', at: [.75, -26], height: 1.34 },
  keepsake: { name: '两枚手印的灯笼', art: 'keepsake', at: [1.4, -39], base: .86, height: 1.1 },
  rooftop: { name: '屋顶的影子', art: 'shadow', at: [26, -41], height: 1.5 },
  reunion: { name: '团圆灯', art: 'keepsake', at: [3.6, 1.4], base: .86, height: 1.15 },
};

const check = (prompt, choices, answer, feedback) => ({ prompt, choices, answer, feedback });
export const chapters = [
  {
    id: 'trail', title: '打听影子的去向', cue: '穿过灯笼广场，去拱门旁找提着灯笼的陈叔。',
    guide: 'Grandma and I are by the dinner table. Your shadow ran right past us! Uncle Chen was tending the lanterns near the arch. Find him and ask which way the shadows went. I’ll stay here with Grandma.',
    hint: 'Go past the stalls. Uncle Chen is holding a lantern to the left of the stone arch.',
    beats: [
      ['陈叔', '阿岚说你在找影子。刚才是你用智能手机拨打她的号码吗？'],
      ['我', '嗯。今晚是家庭聚餐，可我们一家人的影子都跑了。'],
      ['陈叔', '广场灰蒙蒙的。我正疑惑呢，怎么只有影子在跑，一个人都没有？'],
      ['我', '您看见它们往哪儿跑了吗？'],
      ['陈叔', '往那道拱门里去了。刚才巷子里还闪了一下蓝光。'],
    ],
    words: ['家庭', '智能手机', '拨打', '灰蒙蒙', '疑惑'],
    checks: [check('陈叔为什么感到疑惑？', ['他只看到影子在跑，却没看到人。', '他找不到自己的智能手机。', '他不知道今晚要不要点灯笼。'], 0, '陈叔从没见过影子自己跑。')],
  },
  {
    id: 'mirror', title: '照出一条路', cue: '走进镜子巷，找到歪斜的铜镜，把镜架撑稳。',
    guide: 'Uncle Chen saw blue light? There’s an old mirror in that alley, leaning against the left wall. Maybe that’s where the light came from. Steady the mirror and see if it shows where the shadows went.',
    hint: 'The mirror leans on the left side of the narrow alley, just beyond the blue arch.',
    beats: [
      ['我', '铜镜歪了，连镜架都向左倾斜。'],
      ['我', '底座松了。我先把它放平，给镜架一个稳固的基础。'],
      ['我', '木块能撑住镜架。旁边这张图，画的是怎么修铜镜吧？'],
    ],
    words: ['歪', '倾斜', '基础', '撑'],
    checks: [check('为什么要先把镜架的底座放平？', ['稳固的基础能让镜架站稳。', '这样镜面会变小。', '这样石阶会消失。'], 0, '底座放平，再用木块撑住，镜子才不会向一边倾斜。')],
  },
  {
    id: 'crossing', title: '穿过镜巷', cue: '沿着镜光照亮的石阶走，到尽头查看引路灯。',
    guide: 'So the mirror lit up a path past the wall? Follow the steps to the little lamp at the far end. I’ll stay in the square with Grandma and keep my phone on.',
    hint: 'Keep going straight through the blue alley. The low amber lamp marks the last stone.',
    beats: [
      ['我', '先踩稳这块石阶。咦，影子在前面！', 'shadow'],
      ['我', '它朝引路灯一蹦，迅速钻过了门缝。', 'shadow'],
      ['我', '门里面还有灯笼！我过去看看。'],
    ],
    words: ['踩', '蹦', '迅速'],
    checks: [check('哪一个动作是“蹦”？', ['双脚用力跳过一块石阶。', '用脚踩住一块石阶。', '站在原地看引路灯。'], 0, '“踩”是脚踏住，“蹦”是跳起来，“迅速”说的是动作快。')],
  },
  {
    id: 'keepsake', title: '找出旧灯笼', cue: '在影子集市找到画着一大一小两枚手印的红灯笼。',
    guide: 'A market behind the mirror? The shadows might have come here looking for something. Ask the stallholder what they were pointing at. Grandma remembers making a lantern with you. It has one big handprint and one little one.',
    hint: 'Walk through the covered market to the right-hand stall. Look past the painted face and find the red lantern on the counter.',
    beats: [
      ['摊主', '你在找灯笼吗？左边那盏刚被雨淋得湿透，得先晾一晾。', 'vendor'],
      ['我', '旁边这盏画着苍白的脸，嘴唇倒是红红的。', 'painted-lantern'],
      ['摊主', '你的影子指的是这盏红灯笼。提绳断了，我给它换了一根。'],
      ['我', '呀，一大一小两个手印！'],
      ['摊主', '你怎么这么惊讶？认得这盏灯笼吗？', 'vendor'],
      ['我', '认得！这是我和奶奶一起做的第一盏灯笼。'],
      ['摊主', '那就带它回去吧。风把几根灯绳吹缠在一起了，小心别拽断。', 'vendor'],
    ],
    words: ['呀', '惊讶', '湿透', '苍白', '嘴唇', '换'],
    checks: [
      check('哪一盏是我和奶奶一起做的灯笼？', ['换过提绳、有两枚手印的红灯笼。', '被雨淋得湿透的灯笼。', '画着苍白的脸和红嘴唇的灯笼。'], 0, '一大一小两枚手印，是祖孙一起做灯笼时留下的。'),
      check('刚看到影子找回的旧灯笼，我为什么喊了一声“呀”？', ['没想到自己的旧灯笼会出现在这里。', '我早就把灯笼摆在这里。', '我觉得天色和刚才一样。'], 0, '遇到出乎意料的事，人会觉得惊讶。'),
    ],
  },
  {
    id: 'rooftop', title: '带影子回家', cue: '带着旧灯笼从集市右边上屋顶，在背光的长廊找到影子。',
    guide: 'So that’s what they came for! If you carry the lantern back to Grandma, the shadows might follow it home. The mirror passage closes at sunrise, and we haven’t got long. Take the right-hand passage to the roofs and hold the lantern up in the shaded corridor.',
    hint: 'Turn right at the far end of the covered market. Follow the lantern posts to the shadow by the rooftop gate.',
    beats: [
      ['我', '我把灯笼举高一点……你们看见了吗？', 'keepsake'],
      ['我', '别怕。小时候走夜路，奶奶总是牵着我的手。'],
      ['我', '跟我来！回到广场，我就能挽着奶奶的胳膊，和她一起回家了。'],
    ],
    words: ['牵', '挽'],
    checks: [check('哪一句把“牵”和“挽”都用对了？', ['奶奶牵着我的手，我挽着奶奶的胳膊。', '奶奶挽着我的手，我牵着奶奶的胳膊。', '我挽着提绳，奶奶牵着石阶。'], 0, '手牵着手，胳膊挽着胳膊。')],
  },
  {
    id: 'reunion', title: '点亮团圆灯', cue: '把旧灯笼放在广场团圆桌上，让影子回到大家脚边。',
    guide: 'You made it! I can see the shadows coming through behind you. Bring the lantern to Grandma at our table. Once we’re all standing in the same light, each shadow can find its way back to its own feet. Then we can finally sit down together.',
    hint: 'Back in the square, face the lantern strings. Look to your right for the reunion table.',
    beats: [
      ['我', '奶奶，我把灯笼带回来了！您瞧，影子都回到大家脚边了。'],
      ['奶奶', '这两个手印是咱们祖孙俩印的。那天隔壁的小妹妹也在呢。', 'grandma'],
      ['我', '难怪您笑眯眯的。她没带红纸，我分给她半张。', 'grandma'],
      ['奶奶', '是呀。那天她也做成了一盏灯。愿意跟别人分享，是一种美德。', 'grandma'],
      ['团圆桌留言', '旧灯笼有新故事。下回请大家带一盏旧灯来，分享回忆，促进交流。', null],
    ],
    words: ['祖孙', '笑眯眯', '美德', '促进'],
    checks: [check('为什么留言请大家下回带一盏旧灯来？', ['让大家借着旧灯笼分享回忆。', '请大家把灯笼收好，各自离开。', '让每个人静静地看自己的影子。'], 0, '灯笼的故事能促进家人的交流。')],
  },
];
