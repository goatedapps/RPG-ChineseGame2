import { playLessonComic } from '../shared/comic.js';

const openingPanels = [
  {
    dialogue: ['明天就是', '科学展！'],
    alt: '阿宁捧着幼苗，另一名同学正把科学展的彩旗挂起来。',
    bubble: [25, 18.6, 34],
  },
  {
    dialogue: ['小心！'],
    alt: '夜里，一道闪电划过天空。暴雨打在窗户上，雨水流向幼苗。',
    bubble: [65.3, 29.5, 31],
    effect: { chinese: '轰隆！', bubble: [86, 10.3, 18] },
  },
  {
    dialogue: ['糟了！', '温室漏水了！'],
    alt: '第二天早上，阿宁发现花盆旁积了水，幼苗的叶子耷拉着。',
    bubble: [28.7, 21.1, 39],
  },
  {
    dialogue: ['科学展快开门了！', '手机有新消息！'],
    alt: '桌上的手机振动起来，屏幕亮起。一名同学伸手去拿。',
    bubble: [63.2, 23.4, 33],
    effect: { chinese: '叮！', bubble: [86, 11.1, 17] },
  },
];

const closingPanels = [
  {
    dialogue: ['雨停了！', '来参观吧！'],
    alt: '阳光照进温室。窗户修好了，同学们打开门迎接参观者。',
    bubble: [25, 18.2, 36],
  },
  {
    dialogue: ['快看！', '豆苗又挺起来了！'],
    alt: '展灯照亮救回来的豆苗，阿宁向参观者介绍植物的根。',
    bubble: [69.4, 18, 36],
  },
  {
    dialogue: ['科学展成功了！', '多亏有你！'],
    alt: '阿宁和伙伴在豆苗旁击掌，庆祝科学展顺利开幕。',
    bubble: [24, 18.4, 36],
  },
];

export function playComic(container, onFinish, { onPage = () => {}, ending = false } = {}) {
  const panels = (ending ? closingPanels : openingPanels).map((panel, index) => {
    const base = './art/comic-' + (ending ? 'ending-' : 'storm-') + (index + 1);
    const image = new URL(base + '.webp', import.meta.url).href;
    const small = new URL(base + '-small.webp', import.meta.url).href;
    return { ...panel, image, srcset: small + ' 768w, ' + image + ' 1050w' };
  });
  return playLessonComic(container, onFinish, {
    panels, onPage, ending,
    titleText: ending ? '暴雨后的温室结局' : '暴雨后的温室序幕',
    lastLabel: ending ? '回到温室' : '进入科学楼',
  });
}
