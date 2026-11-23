export const phoneStory = {
  storm: {
    steps: {
      westNote: 'Hey! It’s Ah Ning. The fair opens this morning, and I spotted a puddle in the greenhouse after last night’s rain. Could you check the greenhouse windows for me?',
      seal: 'That explains the puddle. Could you grab the spare weatherstripping from the storeroom?',
      westWindow: 'You’ve got the tape. Match the Chinese word on each strip to the English meaning at the leak.',
    },
    checkpoint: 'The window’s sealed! Can you log what caused the leak so the next group knows what to look for?',
  },
  equipment: {
    steps: {
      brightLamp: 'Nice, the leak’s sorted. Can you grab the inspection lamp with the dazzling beam from the storeroom?',
      vividTape: 'The pots all look alike from a distance. Grab a roll of brightly coloured tape so we can mark ours.',
      tray: 'Our pot’s heavy with all that wet soil. Grab the carrying tray.',
    },
    checkpoint: 'That’s the whole kit! Check the carrying picture to see how we should hold the pot.',
  },
  seedling: {
    steps: {
      fan: 'I think the fan’s blowing right at our bean plant. Could you turn the fan away?',
      weakPlant: 'That’s better. Use the tray to move the seedling with the thin stem somewhere sheltered.',
      soilPot: 'Our bean’s out of the draft now. Bury the spare seed in the soil pot for our next experiment.',
      rootCam: 'Today’s seed will take a while to sprout. Check the root camera for footage of the bean we started last week.',
    },
    checkpoint: 'That footage will be great for the fair. Can you log what we changed to protect today’s plant?',
  },
  records: {
    steps: {
      diary: 'I can’t remember how our display was set up. Could you check my diary on the prep bench for a clue?',
      exerciseLog: 'I really did dream our bean grew taller than the school! See if I wrote anything useful in the morning exercise log.',
      testSheet: 'Looks like the exercise log is all about running. Check the note I left on my science quiz paper.',
      rehearsalTape: 'Oh right, we filmed our rehearsal! Pick up the recording marked Exhibit Setup.',
    },
    checkpoint: 'You found it! Could you add the recording to the handover log?',
  },
  exhibit: {
    steps: {
      rehearsalScreen: 'The exhibition room’s still quiet. Play the rehearsal recording to see how our mentor set things up.',
      backupNotes: 'She made that look easy! I sketched the setup while we practised. Could you check the layout beside the player?',
      exhibitStand: 'Now we know where everything goes. Use the sketch to set up our display stand.',
    },
    checkpoint: 'The light’s on and the bean’s in place! Let’s log what helped us put the display back together.',
  },
  handover: {
    steps: {
      exhibitStand: 'The first visitors are nearly here. Could you give the display stand one last check?',
      handoverDesk: 'Thanks. I was so nervous at rehearsal that I stopped halfway through, but I kept practising until I could finish. Could you leave our notes at the handover desk?',
    },
    checkpoint: 'The first group’s heading our way! Wrap up the handover and I’ll meet you at the stand.',
  },
};

export const noteReply = {
  prompt: 'A note on the sill? Good catch! Can you write and send me the first four Chinese characters? They mean “whenever there’s a downpour.”',
  characters: '每逢暴雨',
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
  'We did it! I showed the first group the root footage and made it all the way through the demo. Our little bean’s still standing too. Thanks for saving the display with me.',
];

export const statusReplies = {
  storm: '我封好了窗框的缝，窗台已经干了。',
  equipment: '我找齐了工具，也看过搬运图。',
  seedling: '幼苗已经避开了风，我找到了根系录像。',
  records: '我拿到了排练录像。',
  exhibit: '展台布置好了，展灯也亮了。',
  handover: '交接记录准备好了。展台见！',
};

export const fieldHints = {
  westNote: 'Go into the greenhouse and compare the two windows. At the one with water marks, look along the ledge.',
  seal: 'Look for a small packet on the shelves at the far right of the storeroom. Its label says 密封条.',
  westWindow: 'Take the tape to the west window. Look for four dripping gaps.',
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
