import { missions } from './story.js';

export const radioLines = [
  ...missions.flatMap((mission) => [
    [mission.id, mission.cn],
    ...mission.actions.map((action, index) => [mission.id + '-' + (index + 1), action.cn]),
  ]),
  ['a-ning-message', missions.at(-1).actions[0].resultCN],
];
