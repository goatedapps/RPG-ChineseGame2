import { chapters } from './story.js';

export const recordedGuides = chapters.map(({ id }) => id);
const clues = new Map(chapters.map(({ id, clue }) => [clue, id]));

export function storyRecordingFor(text) {
  const id = clues.get(text);
  return id && new URL('./audio/clue-' + id + '.mp3', import.meta.url).href;
}
