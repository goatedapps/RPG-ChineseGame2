import { words } from '../stage/curriculum.js';
import { bank } from '../stage/bank.js';

const definitions = {
  克服: '想办法战胜困难、恐惧或坏习惯。',
  锻炼: '通过运动或训练，让身体更强健。',
  梦: '睡觉时在脑海里出现的情景。',
  测验: '用题目或练习检查学会了多少。',
  严格: '要求很严，必须按规定去做。',
  懒惰: '不愿花力气做该做的事。',
  临时抱佛脚: '平时不准备，事情快到了才匆匆准备。',
  缝: '两个物体或两个部分之间细窄的空隙。',
  每逢: '每次遇到某种情况或到了某个时候。',
  鲜艳: '颜色明亮，十分显眼。',
  耀眼: '光线很强，亮得让眼睛不舒服。',
  托: '从下面把东西承住或举起来。',
  优雅: '动作、举止或样子自然大方、好看。',
  扎根: '植物长出根，根伸进泥土里。',
  柔弱: '纤细而不结实，经不起较大的力量。',
  产生: '使某种东西、现象或想法出现。',
  埋: '把东西放进土里，再用土盖住。',
  暴雨: '短时间内下得很大、很急的雨。',
  不屈不挠: '遇到困难和挫折也不放弃，继续努力。',
  坚强: '遇到困难或打击时能撑住，继续面对。',
  恶劣: '非常不好。形容天气时，指天气条件很差。',
  凭: '依靠或借助某种东西、方法或本领。',
  意志: '为了达到目标而坚持下去的决心。',
  榜样: '值得别人学习的人或做法。',
};

const wordOverrides = {
  缝: { spoken: '门缝的缝' },
  凭: { example: '我们凭这张布置图找到了展灯的位置。' },
};

export const lexicon = Object.fromEntries(words.map(({ word, pinyin, meaning, example }) => [
  word, { pinyin, en: meaning, cn: definitions[word], example, ...wordOverrides[word] },
]));

const translations = {
  'P6-CH-AUTHORED-L1-Q03': {
    en: 'Xiaowen used to be afraid of speaking in front of others. After practising again and again, he finally ___ that fear.',
    choices: ['Kept', 'Deepened', 'Overcame', 'Created'],
    feedbackCN: '克服恐惧是指想办法战胜心里的害怕。',
    feedbackEN: 'To overcome a fear is to find a way to get past it.',
  },
  'P6-CH-2026-ACSJ-Q10': {
    en: '___ the weather is bad this weekend, we ___ skip the picnic by the sea.',
    choices: ['Only if … then', 'Besides … also', 'If … then', 'No matter … still'],
    feedbackCN: '前半句提出一个条件，后半句说明结果，所以用“要是……就”。',
    feedbackEN: 'The first half sets a condition and the second gives its result, so use “if … then”.',
  },
  'P6-CH-AUTHORED-L1-Q02': {
    en: 'Every Friday, Dad goes to the library with me to borrow books. Choose the correct pinyin for the highlighted Chinese word.',
    choices: ['měi fèng', 'mèi féng', 'mèi fèng', 'měi féng'],
    feedbackCN: '“每”读第三声，“逢”读第二声。',
    feedbackEN: 'The first character has the third tone. The second has the second tone.',
  },
  'P6-CH-AUTHORED-L1-Q09': {
    en: 'This delicate seedling cannot withstand strong winds. Choose what the highlighted word means.',
    choices: [
      'Weak and unable to withstand much force',
      'Thick and sturdy enough to withstand strong winds',
      'Hard and difficult to snap or bend',
      'Tall enough to block all the sunlight',
    ],
    feedbackCN: '柔弱的幼苗经不起强风，容易被吹弯。',
    feedbackEN: 'A delicate seedling cannot stand up to a strong wind and bends easily.',
  },
  'P6-CH-2026-ACSJ-Q4': {
    en: 'We should treasure our time and use it wisely. Choose the character that completes the Chinese word.',
    choices: ['系', '席', '惜', '悉'],
    feedbackCN: '“珍惜”指看重并善加利用。珍惜时间，就是不浪费时间。',
    feedbackEN: 'The completed word means to value something and make good use of it. Here it means making good use of time.',
  },
  'P6-CH-AUTHORED-L1-Q11': {
    en: 'Which sentence uses 托, “support from below”, correctly?',
    choices: [
      'My little sister moved the box along the floor, leaving a long trail.',
      'We cannot put off finishing our homework until tomorrow.',
      'My older sister supported the bottom of the pot with her palm so it would not fall.',
      'He took his shoes off and changed into slippers.',
    ],
    feedbackCN: '只有用手掌承住花盆底部是“托”。在地上拉是“拖”，把事情推迟也可以用“拖”；把鞋除下是“脱”。',
    feedbackEN: 'Only the pot is supported from below. The other sentences need different Chinese characters for dragging, delaying, and taking off shoes.',
  },
};

export const practiceBank = bank.map(({ id, prompt, choices, correct }) => {
  const translation = translations[id];
  return {
    cn: prompt,
    en: translation.en,
    choices: choices.map((cn, index) => ({ cn, en: translation.choices[index] })),
    answer: choices.indexOf(correct),
    feedbackCN: translation.feedbackCN,
    feedbackEN: translation.feedbackEN,
  };
});
