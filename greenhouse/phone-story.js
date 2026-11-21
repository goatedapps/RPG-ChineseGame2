export const phoneStory = {
  storm: {
    briefing: [
      'Hey! It’s Ah Ning. The science fair opens this morning. Last night’s rain was awful, and I saw a puddle in the greenhouse when I walked past.',
      'I’m helping get the entrance ready. Could you check the greenhouse windows for me? See if you can work out where the water’s coming from.',
    ],
    actions: {},
    checkpoint: [
      'Puddle sorted? Nice! Let’s log what caused it so the next group knows what to check after heavy rain.',
    ],
  },
  equipment: {
    briefing: [
      'One problem down. We still need to move our bean plant to the exhibition room, but its stem’s looking a bit wobbly.',
      'There’s a lamp, bright tape, and a carrying tray in the storeroom. The tape makes our pot easy to spot. Check the picture by the tray before you lift anything.',
    ],
    actions: {},
    checkpoint: [
      'Got the kit? Great. The pot gets really heavy when the soil’s wet. Check how the picture shows us to hold it before we try moving it.',
    ],
  },
  seedling: {
    briefing: [
      'I left the circulation fan on yesterday. If it’s still blowing right at our bean plant, that might be why the poor thing’s bent over.',
      'Let’s move it somewhere sheltered. There’s a spare seed to plant too. It won’t grow in time for today, but the camera has footage from a bean we started last week.',
    ],
    actions: {
      weakPlant: [
        'That sheltered spot is much better. I’m glad we can still show our original plant. The spare seed can be our next experiment.',
      ],
    },
    checkpoint: [
      'The old footage will be great for showing visitors what goes on under the soil. Can you log what we changed to protect today’s plant?',
    ],
  },
  records: {
    briefing: [
      'Next problem: I can’t remember which way everything goes on our display stand! An older student showed us at rehearsal and I recorded it.',
      'I left the recording somewhere on the prep bench. Feel free to check my diary, exercise log, and science quiz. I left them there with the recording, and one of the pages might jog your memory.',
    ],
    actions: {},
    checkpoint: [
      'You found it! Past me actually did us a favour by recording that rehearsal. Can you add the recording to the handover log before we take it to the exhibition room?',
    ],
  },
  exhibit: {
    briefing: [
      'The exhibition room should be empty for a few more minutes. Take a look at the rehearsal recording on the player so we can set things up the way our mentor showed us.',
      'I drew a backup layout while we practised. It’s worth checking that too if you need to see exactly where the pot, label, and lamp go.',
    ],
    actions: {
      rehearsalScreen: [
        'See how easy she makes the demo look? She practised it a little every day. I used to put rehearsing off, but watching her made me want to give it a proper go.',
      ],
    },
    checkpoint: [
      'The display light’s on and the plant’s right where it should be! Let’s log what we used to piece it all back together. That’ll save us time if we ever move the display again.',
    ],
  },
  handover: {
    briefing: [
      'We’re almost there. Keep the final notes at the handover desk so the next group knows what happened with the window and the plant.',
    ],
    actions: {
      exhibitStand: [
        'Can I tell you something? The first time I tried presenting here, I got so nervous that I stopped halfway through.',
        'I kept practising after class, even when I messed it up again. Eventually I made it all the way through. I’m still nervous about today, but I know I can give it a go.',
      ],
    },
    checkpoint: [
      'Thanks for sticking with me through all of this. I can see the first group heading our way. Finish the handover and I’ll meet you at the stand!',
    ],
  },
};

const noteAnswers = new Set([
  '每逢暴雨', '每逢暴雨时', '每逢下暴雨', '每逢下暴雨时',
  '每次下暴雨', '每次下暴雨时', '每一次下暴雨', '每一次下暴雨时',
  '每当下暴雨', '每当下暴雨时', '每当有暴雨',
]);

export const noteReply = {
  prompt: 'A note on the sill? Good catch. Can you send me the phrase that means “whenever there’s a downpour”? It’s right at the start of the note. You can copy the Chinese or tell me what it means in English.',
  placeholder: 'Type your reply',
  retry: 'Look at the start of the note again. I’m looking for the words that say how often it happens.',
  success: 'That’s it. So it happens any time there’s a downpour. There’s spare weatherstripping in the storeroom. Press it over the gap in the west window and I’ll flag the leak for the caretaker.',
  validate(answer) {
    const chinese = answer.normalize('NFKC').replace(/[\s\p{P}]/gu, '')
      .replaceAll('時', '时').replaceAll('當', '当').replaceAll('從', '从')
      .replaceAll('縫', '缝').replaceAll('進', '进').replaceAll('來', '来');
    if (noteAnswers.has(chinese) || chinese.startsWith('每逢暴雨雨水就从窗框的缝流进来')) return true;
    const english = answer.normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[.!,?]/g, '').trim().replace(/\s+/g, ' ');
    return /\b(?:when(?:ever)?|every time|each time|any time) (?:it (?:pours|rains (?:hard|heavily))|its (?:pouring|raining (?:hard|heavily))|there(?: is|s) (?:a (?:heavy )?downpour|heavy rain)|the rain is (?:very )?heavy)\b/.test(english)
      || /\b(?:during|in) (?:a |any |every )?(?:downpour|heavy rain)\b/.test(english);
  },
};

export const screenChecks = {
  rootCam: {
    cn: '“埋种子”是什么意思？',
    en: 'What does “bury the seed” mean?',
    choices: [
      { cn: '把种子放在桌上。', en: 'Put the seed on the table.' },
      { cn: '把种子放进土里，再盖上泥土。', en: 'Put the seed in the soil and cover it.' },
      { cn: '把花盆举起来。', en: 'Lift the pot.' },
    ],
    answer: 1,
    feedbackCN: '你打开了根系录像。',
    feedbackEN: 'You unlocked the root recording.',
  },
  rehearsalScreen: {
    cn: '哪一件事表示提早做好了准备？',
    en: 'Which action shows someone prepared ahead of time?',
    choices: [
      { cn: '提前排练，并拍下示范。', en: 'Rehearse in advance and film the demonstration.' },
      { cn: '到最后一刻才开始排练。', en: 'Wait until the last minute to start rehearsing.' },
      { cn: '轮到自己时才找展品。', en: 'Start looking for the exhibit when it is your turn.' },
    ],
    answer: 0,
    feedbackCN: '你打开了排练录像。',
    feedbackEN: 'You unlocked the rehearsal recording.',
  },
};

export const closingMessages = [
  'We did it! The first group wanted to know how the roots grow. I showed them the footage and made it all the way through the demo.',
  'Our little bean’s still standing too. Thanks for saving the display with me. Next time I’m bringing an extra roll of weatherstrip.',
];

export const statusReplies = {
  storm: 'I sealed the gap. The sill is dry now.',
  equipment: 'I found the kit and checked the carrying picture.',
  seedling: 'The plant’s sheltered, and I found the old root footage.',
  records: 'I’ve got the rehearsal recording.',
  exhibit: 'The stand is ready and the light’s on.',
  handover: 'The notes are ready for the next group. See you at the stand!',
};

export const fieldHints = {
  westNote: 'Go into the greenhouse and compare the two windows. At the one with water marks, look along the ledge.',
  seal: 'Look for a small packet on the shelves at the far right of the storeroom. Its label says 密封条.',
  westWindow: 'Take the weatherstrip back to the wet window. Look for the gap near the windowsill.',
  brightLamp: 'Compare the lights on the storeroom workbench. The inspection lamp has the stronger white beam.',
  vividTape: 'Look on the storeroom workbench for a bright orange roll.',
  tray: 'The carrying tray is on the storeroom workbench, next to the picture about moving pots.',
  fan: 'Look at the end of the long greenhouse workbench. There’s a small fan beside the bean plants.',
  weakPlant: 'Compare the two seedlings by the fan. Move the one with the thinner stem.',
  soilPot: 'Look for the wide pot of soil at the end of the workbench. It’s next to the spare seed jar.',
  rootCam: 'Look for the small monitor behind the long greenhouse workbench. It shows roots.',
  diary: 'Check the books on the side workbench in the prep room. My diary has a plant on its cover.',
  exerciseLog: 'The morning exercise log is the dark blue book beside my diary in the prep room.',
  testSheet: 'Look along the same prep-room workbench for the pale science quiz paper.',
  rehearsalTape: 'The recording is on the prep-room workbench with the books and quiz paper.',
  rehearsalScreen: 'Look for the monitor in the exhibition room. Use the recording you picked up in the prep room.',
  backupNotes: 'The layout is on the exhibition-room workbench beside the rehearsal player.',
  exhibitStand: 'The freestanding display in the exhibition room has a plaque that says 种子的力量.',
  handoverDesk: 'Look for the blue logbook on the smaller desk along the far wall of the exhibition room.',
};
