const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceDir = '/Users/liuchang/Desktop/作品集/png序列/人物大方自然微笑微动态';
const outputDir = path.resolve('assets/character-motion-transparent');
const files = fs.readdirSync(sourceDir)
  .filter((file) => file.toLowerCase().endsWith('.png'))
  .sort();

function colorDistance(data, offset, background) {
  const dr = data[offset] - background[0];
  const dg = data[offset + 1] - background[1];
  const db = data[offset + 2] - background[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function estimateBackground(data, width, height) {
  const samples = [];
  const margin = Math.max(4, Math.floor(Math.min(width, height) * 0.03));
  for (let y = 0; y < height; y += margin) {
    for (let x = 0; x < width; x += margin) {
      if (x < margin * 2 || x >= width - margin * 2 || y < margin * 2 || y >= height - margin * 2) {
        const offset = (y * width + x) * 4;
        samples.push([data[offset], data[offset + 1], data[offset + 2]]);
      }
    }
  }
  const channel = (index) => samples.map((sample) => sample[index]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  return [channel(0), channel(1), channel(2)];
}

function removeBackground(data, width, height) {
  const background = estimateBackground(data, width, height);
  const size = width * height;
  const backgroundMask = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const threshold = 32;

  function enqueue(index) {
    if (backgroundMask[index]) return;
    const offset = index * 4;
    if (colorDistance(data, offset, background) > threshold) return;
    backgroundMask[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const alpha = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    if (!backgroundMask[index]) alpha[index] = 255;
  }

  // Soften only the retained pixels immediately adjacent to the removed background.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (backgroundMask[index]) continue;
      const adjacentBackground = backgroundMask[index - 1] || backgroundMask[index + 1] || backgroundMask[index - width] || backgroundMask[index + width];
      if (adjacentBackground) alpha[index] = 150;
    }
  }
  return alpha;
}

async function processFile(file) {
  const input = path.join(sourceDir, file);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = removeBackground(data, info.width, info.height);
  for (let index = 0; index < alpha.length; index += 1) data[index * 4 + 3] = alpha[index];
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [index, file] of files.entries()) {
    const output = await processFile(file);
    fs.writeFileSync(path.join(outputDir, file), output);
    if ((index + 1) % 20 === 0 || index === files.length - 1) console.log(`processed ${index + 1}/${files.length}`);
  }
  console.log(JSON.stringify({ frames: files.length, outputDir }));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
