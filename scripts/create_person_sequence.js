const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceDir = path.resolve('assets/character-motion-transparent');
const outputDir = path.resolve('assets/character-motion-person');
const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.png')).sort();

function polygonContains(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function ellipseContains(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function personPixel(x, y, r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const blueJacket = b - r > 18 && b >= g - 2;
  const skin = r > 125 && g > 120 && r > g + 24 && g > b + 20 && r - b < 125;
  const warmDark = r > g + 5 && g > b + 3 && max < 135;
  const neutralLight = max - min < 20 && max > 120;
  const head = ellipseContains(x, y, 590, 418, 90, 100);
  const torso = polygonContains(x, y, [[535, 446], [660, 430], [744, 548], [772, 748], [734, 850], [535, 842], [500, 628]]);
  const frontArm = polygonContains(x, y, [[285, 560], [485, 548], [602, 622], [548, 746], [365, 720], [260, 650]]);
  const pants = polygonContains(x, y, [[520, 745], [765, 740], [820, 960], [488, 960]]);
  const frontHand = polygonContains(x, y, [[205, 548], [270, 536], [330, 563], [410, 584], [454, 617], [438, 671], [390, 690], [305, 675], [244, 650], [205, 620]]);

  const redPencil = r > g + 35 && g < 155;
  if (head && (!redPencil || x > 540)) return true;
  if (torso && (blueJacket || (x > 555 && y > 510))) return true;
  if (frontArm && blueJacket) return true;
  if (pants) return true;
  if (frontHand && skin) return true;
  return false;
}

async function processFile(file) {
  const { data, info } = await sharp(path.join(sourceDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      const alpha = data[index + 3];
      const keep = alpha > 0 && personPixel(x, y, data[index], data[index + 1], data[index + 2]);
      data[index + 3] = keep ? Math.min(alpha, 245) : 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [index, file] of files.entries()) {
    fs.writeFileSync(path.join(outputDir, file), await processFile(file));
    if ((index + 1) % 20 === 0 || index === files.length - 1) console.log(`processed ${index + 1}/${files.length}`);
  }
  console.log(JSON.stringify({ frames: files.length, outputDir }));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
