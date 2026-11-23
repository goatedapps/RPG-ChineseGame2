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
      brightLamp: 'Nice, the leak’s sorted. Now we need to get our bean plant from the greenhouse to the science fair display before visitors arrive. Let’s check how it held up in the storm first. Could you grab the inspection lamp from the storeroom? It’s the one with the bright white beam.',
      vividTape: 'The lamp will help us see if the stem’s bent. Once we know which plant to take, we’ll need to mark its pot so it doesn’t get mixed up with the others. Could you grab the bright orange tape?',
      tray: 'That’ll make our pot easy to spot. The soil’s still wet and heavy, so take the carrying tray too. We’ll use it to get the pot to the display without tipping it.',
    },
    checkpoint: 'That’s the whole kit! Check the carrying picture to see how we should hold the pot.',
  },
  seedling: {
    steps: {
      fan: 'We’ve got what we need to move the pot. Before we do, let’s make sure our bean can stand upright for the fair. I can see the fan blowing straight at the seedlings. Could you turn it away?',
      weakPlant: 'That’s better. One of those three seedlings still has a bent stem and needs shelter. Watch which pot it starts in so you can pick it out after the pots move.',
      soilPot: 'Our bean’s out of the draft. For the fair, I want to show how a bean grows from a seed. Could you plant the spare seed the way we planted this one? I can show visitors where it all starts.',
      rootCam: 'Thanks! Nothing will sprout before the fair opens, but we filmed the bean we planted last week. Check the root camera so we can show visitors what happens under the soil.',
    },
    checkpoint: 'That footage will be great for the fair. Can you log what we changed to protect today’s plant?',
  },
  records: {
    steps: {
      diary: 'We’ve got the plant and the root footage. Now we need to put the display back together, and I can’t remember where everything goes. I wrote down what we did at rehearsal somewhere. Could you check my diary on the prep bench?',
      exerciseLog: 'I really did dream our bean grew taller than the school! I did my morning run before rehearsal. I might have jotted something down in the exercise log.',
      testSheet: 'Just my running times, then. Try the science quiz paper. I remember writing myself a note about how we got ready for the fair.',
      rehearsalTape: 'Oh right, we filmed our rehearsal! Pick up the recording marked Exhibit Setup.',
    },
    checkpoint: 'You found it! Could you add the recording to the handover log?',
  },
  exhibit: {
    steps: {
      rehearsalScreen: 'Let’s get the stand ready while the exhibition room is still quiet. Play the rehearsal recording there. Our mentor shows how she arranged the pot, the label and the lamp so visitors could see everything.',
      backupNotes: 'She made that look easy! I drew the setup while we practised. The sketch beside the player will help when you’re standing in front of the display.',
      exhibitStand: 'Now we know where everything goes. Use the sketch to set up the stand so the first group can see the bean clearly and read its label.',
    },
    checkpoint: 'The light’s on and the bean’s in place! Let’s log what helped us put the display back together.',
  },
  handover: {
    steps: {
      exhibitStand: 'The first visitors are nearly here! I’ll give the demo while you finish the handover. Could you check the stand once more for me before they come in?',
      handoverDesk: 'Thanks. I was so nervous at rehearsal I stopped halfway through. I’ve practised since then, and I think I’m ready. Could you leave our notes at the handover desk so tomorrow’s team knows how we set everything up and what to check if it rains?',
    },
    checkpoint: 'The first group’s heading our way! Once you’ve finished the handover, come to the stand. I want you there when I show them what we saved.',
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
  weakPlant: 'Look for three pots by the fan. The one with a bent stem needs shelter.',
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
