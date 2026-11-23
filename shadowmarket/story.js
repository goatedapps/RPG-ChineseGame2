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
  trail: { name: '跑远的影子', art: 'shadow', at: [-2, -5.4], height: 1.54 },
  mirror: { name: '歪斜的铜镜', art: 'mirror', at: [-1, -15.4], height: 1.85 },
  crossing: { name: '镜巷的石阶', art: 'festival-lantern', at: [.75, -26], height: 1.34 },
  keepsake: { name: '两枚手印的灯笼', art: 'keepsake', at: [1.4, -39], base: .86, height: 1.1 },
  rooftop: { name: '屋顶的影子', art: 'shadow', at: [26, -41], height: 1.5 },
  reunion: { name: '团圆灯', art: 'keepsake', at: [3.6, 1.4], base: .86, height: 1.15 },
};

const check = (prompt, choices, answer, feedback) => ({ prompt, choices, answer, feedback });
export const chapters = [
  {
    id: 'trail', title: '追上影子', cue: '穿过灯笼广场，到拱门旁找跑远的影子。',
    guide: 'I’m at the far end of the square. Your shadow just ran past me, and Grandma’s went after it! Everyone’s waiting for dinner. I’ll stay with Grandma while you find out where our shadows went. I saw them turn by the arch past the stalls.',
    hint: 'Go past the two rows of stalls. Look for the silhouette to the left of the stone arch.',
    clue: '广场灰蒙蒙的，整个家庭的影子都跑了。我正疑惑它们去了哪里，便用智能手机拨打阿岚的号码。她看见影子往拱门那边跑。',
    words: ['家庭', '智能手机', '拨打', '灰蒙蒙', '疑惑'],
    checks: [check('广场灰蒙蒙的，我为什么要拨打阿岚的号码？', ['请她告诉我影子跑去了哪里。', '请她把灯都熄灭。', '请她在家等我。'], 0, '我有疑惑，便用智能手机打电话问她。')],
  },
  {
    id: 'mirror', title: '照出一条路', cue: '走进镜子巷，找到歪斜的铜镜，把镜架撑稳。',
    guide: 'That alley normally stops at a wall, but I saw the shadows slip through a flash of blue light. I think the old mirror opened a way through. It’s leaning against the left wall. Steady it and see if you can find the path they took.',
    hint: 'The mirror leans on the left side of the narrow alley, just beyond the blue arch.',
    clue: '镜子歪了，镜架向左倾斜。我把底座放平，让它有稳固的基础，再用木块撑住镜架。镜面照亮了前方的石阶。',
    words: ['歪', '倾斜', '基础', '撑'],
    checks: [check('为什么要先把镜架的底座放平？', ['稳固的基础能让镜架站稳。', '这样镜面会变小。', '这样石阶会消失。'], 0, '底座放平，再用木块撑住，镜子才不会向一边倾斜。')],
  },
  {
    id: 'crossing', title: '穿过镜巷', cue: '沿着镜光照亮的石阶走，到尽头查看引路灯。',
    guide: 'I can see the steps now! The mirror lit up a way past the wall. Follow the shadows towards the little lamp at the far end. I’ll stay in the square with Grandma and keep my phone on in case you need me.',
    hint: 'Keep going straight through the blue alley. The low amber lamp marks the last stone.',
    clue: '影子先踩上第一块石阶，再向前一蹦，迅速来到了引路灯旁。我沿着它走过的路，跨过石阶。',
    words: ['踩', '蹦', '迅速'],
    checks: [check('哪一个动作是“蹦”？', ['双脚用力跳过一块石阶。', '用脚踩住一块石阶。', '站在原地看引路灯。'], 0, '“踩”是脚踏住，“蹦”是跳起来，“迅速”说的是动作快。')],
  },
  {
    id: 'keepsake', title: '找出旧灯笼', cue: '在影子集市找到画着一大一小两枚手印的红灯笼。',
    guide: 'A market behind the mirror? So the shadows might have come here looking for something. See what yours is pointing at. Grandma was just telling me about a lantern you made together. She said you left a big handprint and a little one on it.',
    hint: 'Walk through the covered market to the right-hand stall. Look past the painted face and find the red lantern on the counter.',
    clue: '“呀，那是我小时候做的灯笼！”我惊讶地说。摊上有一盏被雨淋得湿透，还有一盏画着苍白的脸和红色的嘴唇。我的影子指着那盏换过提绳、有一大一小两枚手印的红灯笼。原来它是来找我和奶奶一起做的第一盏灯笼。',
    words: ['呀', '惊讶', '湿透', '苍白', '嘴唇', '换'],
    checks: [
      check('哪一盏是我和奶奶一起做的灯笼？', ['换过提绳、有两枚手印的红灯笼。', '被雨淋得湿透的灯笼。', '画着苍白的脸和红嘴唇的灯笼。'], 0, '一大一小两枚手印，是祖孙一起做灯笼时留下的。'),
      check('刚看到影子找回的旧灯笼，我为什么喊了一声“呀”？', ['没想到自己的旧灯笼会出现在这里。', '我早就把灯笼摆在这里。', '我觉得天色和刚才一样。'], 0, '遇到出乎意料的事，人会觉得惊讶。'),
    ],
  },
  {
    id: 'rooftop', title: '带影子回家', cue: '带着旧灯笼从集市右边上屋顶，在背光的长廊找到影子。',
    guide: 'So that’s what they came for! If you carry the lantern back to Grandma, the shadows might follow it home. The sky’s turning pink, and the mirror passage closes at sunrise. Take the right-hand passage to the roofs and hold up the lantern in the shaded corridor so the shadows can see it.',
    hint: 'Turn right at the far end of the covered market. Follow the lantern posts to the shadow by the rooftop gate.',
    clue: '我举起旧灯笼，影子们排成一列，沿着背光的长廊回家。我想起小时候，奶奶牵着我的手带我走夜路。现在，我可以挽着她的胳膊，陪她一起走。',
    words: ['牵', '挽'],
    checks: [check('哪一句把“牵”和“挽”都用对了？', ['奶奶牵着我的手，我挽着奶奶的胳膊。', '奶奶挽着我的手，我牵着奶奶的胳膊。', '我挽着提绳，奶奶牵着石阶。'], 0, '手牵着手，胳膊挽着胳膊。')],
  },
  {
    id: 'reunion', title: '点亮团圆灯', cue: '把旧灯笼放在广场团圆桌上，让影子回到大家脚边。',
    guide: 'You made it! I can see the shadows coming through behind you. Bring the lantern to Grandma at our table. Once we’re all standing in the same light, each shadow can find its way back to its own feet. Then we can finally sit down together.',
    hint: 'Back in the square, face the lantern strings. Look to your right for the reunion table.',
    clue: '旧灯笼亮起来，影子回到了大家脚边。祖孙俩笑眯眯地看着灯笼上的手印。奶奶说，乐于分享是一种美德。说起一起做灯笼的回忆，促进了家人的交流。',
    words: ['祖孙', '笑眯眯', '美德', '促进'],
    checks: [check('哪件事促进了家人的交流？', ['一家人围着灯笼，分享各自记得的事。', '大家把灯笼收好，各自离开。', '所有人只看着影子，一句话也不说。'], 0, '分享回忆让家人更了解彼此。')],
  },
];
