import { art } from './story.js?v=harbour-sign';

export const signLines = {
  markers: ['↑　下层浮台', '↶　上层码头'],
  stairs: ['↑　下层浮台', '当心脚下'],
};

const faces = new Map();

export function signFace(id) {
  if (!faces.has(id)) {
    faces.set(id, drawSign(id).catch((error) => { faces.delete(id); throw error; }));
  }
  return faces.get(id);
}

async function drawSign(id) {
  const image = new Image();
  image.src = art('sign');
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth * 2;
  canvas.height = image.naturalHeight * 2;
  const ink = canvas.getContext('2d');
  ink.scale(2, 2);
  ink.drawImage(image, 0, 0);
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  ink.font = '700 33px sans-serif';
  ink.fillStyle = '#f9dfaa';
  ink.shadowColor = '#172027';
  ink.shadowBlur = 2;
  signLines[id].forEach((line, index) => ink.fillText(line, 244, 217 + index * 52, 241));
  return canvas;
}
