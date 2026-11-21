import { words } from '../stage/curriculum.js';

// This runtime copy of the lesson's Tingxie sentenceBank needs no browser YAML parser.
const sentenceBankUrl = new URL('./lesson-test-sentences.json', import.meta.url);
let bankRequest;

export function loadLessonTest() {
  bankRequest ??= fetch(sentenceBankUrl).then(async (response) => {
    if (!response.ok) throw new Error('Lesson test sentences unavailable');
    const bank = await response.json();
    if (Object.keys(bank).length !== words.length || words.some(({ word }) => !hasSentences(bank[word], word))) {
      throw new Error('Incomplete lesson test sentence bank');
    }
    return bank;
  }).catch((error) => {
    bankRequest = null;
    throw error;
  });
  return bankRequest;
}

function hasSentences(sentences, word) {
  return Array.isArray(sentences) && sentences.length >= 2
    && new Set(sentences).size === sentences.length
    && sentences.every((sentence) => typeof sentence === 'string' && sentence.split(word).length === 2);
}

export function createLessonTest(bank, seed = Math.floor(Math.random() * 0x100000000)) {
  let random = seed >>> 0;
  function pick(count) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return Math.floor(random / 0x100000000 * count);
  }

  const queue = Object.entries(bank).map(([word, sentences]) => ({
    word, sentenceIndex: pick(sentences.length), review: false,
  }));
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const other = pick(index + 1);
    [queue[index], queue[other]] = [queue[other], queue[index]];
  }
  return { seed, queue, revealed: false };
}

export function restoreLessonTest(bank, saved) {
  const queue = saved?.queue;
  if (!Number.isInteger(saved?.seed) || saved.seed < 0 || saved.seed > 0xffffffff
      || !Array.isArray(queue) || typeof saved.revealed !== 'boolean'
      || queue.some((question) => !validQuestion(bank, question))
      || new Set(queue.map(({ word }) => word)).size !== queue.length) {
    return createLessonTest(bank);
  }
  return saved;
}

function validQuestion(bank, question) {
  return question && Object.hasOwn(bank, question.word)
    && Number.isInteger(question.sentenceIndex)
    && question.sentenceIndex >= 0 && question.sentenceIndex < bank[question.word].length
    && typeof question.review === 'boolean';
}

export function currentLessonQuestion(bank, state) {
  const question = state.queue[0];
  if (!question) return null;
  const { word, sentenceIndex, review } = question;
  const [before, after] = bank[word][sentenceIndex].split(word);
  const total = Object.keys(bank).length;
  return { word, before, after, review, revealed: state.revealed, total, mastered: total - state.queue.length };
}

export function revealLessonWord(state) {
  if (!state.queue.length || state.revealed) return state;
  return { ...state, revealed: true };
}

export function completeLessonQuestion(bank, state) {
  if (!state.queue.length) return state;
  const [question, ...queue] = state.queue;
  if (state.revealed) {
    const sentenceIndex = (question.sentenceIndex + 1) % bank[question.word].length;
    queue.push({ ...question, sentenceIndex, review: true });
  }
  return { ...state, queue, revealed: false };
}
