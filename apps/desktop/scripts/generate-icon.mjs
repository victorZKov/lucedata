#!/usr/bin/env node
/* eslint-env node */

import process from "node:process";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { PNG } from "pngjs";
import iconGen from "icon-gen";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const assetsDir = resolve(projectRoot, "assets");

const size = 1024;
const png = new PNG({ width: size, height: size });

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(colorA, colorB, t) {
  return [
    Math.round(lerp(colorA[0], colorB[0], t)),
    Math.round(lerp(colorA[1], colorB[1], t)),
    Math.round(lerp(colorA[2], colorB[2], t)),
  ];
}

function setPixel(x, y, color, alpha = 255) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const index = (size * y + x) << 2;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = alpha;
}

function drawGradientBackground() {
  const topColor = [24, 54, 112];
  const bottomColor = [12, 28, 58];

  for (let y = 0; y < size; y += 1) {
    const t = y / (size - 1);
    const rowColor = mixColor(topColor, bottomColor, t);

    for (let x = 0; x < size; x += 1) {
      const shade = 0.98 + 0.02 * Math.cos((x / size) * Math.PI * 2);
      setPixel(x, y, rowColor.map(channel => Math.round(channel * shade)));
    }
  }
}

function drawCylinder() {
  const centerX = size / 2;
  const bodyWidth = size * 0.58;
  const bodyHeight = size * 0.46;
  const bodyTop = size * 0.24;
  const bodyBottom = bodyTop + bodyHeight;
  const radiusX = bodyWidth / 2;
  const topRadiusY = size * 0.085;
  const bottomRadiusY = size * 0.105;

  const left = Math.round(centerX - radiusX);
  const right = Math.round(centerX + radiusX);

  const sideColorLeft = [66, 123, 201];
  const sideColorRight = [200, 229, 255];

  for (let y = Math.round(bodyTop); y <= Math.round(bodyBottom); y += 1) {
    const rowT = (y - bodyTop) / (bodyBottom - bodyTop);
    for (let x = left; x <= right; x += 1) {
      const colT = (x - left) / (right - left);
      const baseColor = mixColor(sideColorLeft, sideColorRight, colT);
      const shade = 0.94 + (1 - Math.abs(colT - 0.5) * 0.22) * 0.08;
      const verticalShade = 1 - rowT * 0.06;
      const finalColor = baseColor.map(channel =>
        Math.min(255, Math.round(channel * shade * verticalShade))
      );
      setPixel(x, y, finalColor);
    }
  }

  const drawEllipse = (centerY, radiusY, colorA, colorB, lift = 0) => {
    for (let y = Math.round(centerY - radiusY); y <= Math.round(centerY + radiusY); y += 1) {
      const normY = (y - centerY) / radiusY;
      const span = radiusX * Math.sqrt(Math.max(0, 1 - normY ** 2));
      const startX = Math.round(centerX - span);
      const endX = Math.round(centerX + span);

      for (let x = startX; x <= endX; x += 1) {
        const colT = (x - startX) / (endX - startX || 1);
        const baseColor = mixColor(colorA, colorB, colT);
        const depthShade = 1 - Math.abs(normY) * 0.18 + lift;
        const shaded = baseColor.map(channel =>
          Math.min(255, Math.round(channel * depthShade))
        );
        setPixel(x, y, shaded);
      }
    }
  };

  drawEllipse(bodyTop, topRadiusY, [230, 242, 255], [205, 233, 255], 0.08);
  drawEllipse(bodyBottom, bottomRadiusY, [80, 136, 214], [160, 198, 240], -0.03);

  const bandCount = 3;
  for (let i = 1; i <= bandCount; i += 1) {
    const t = i / (bandCount + 1);
    const y = Math.round(lerp(bodyTop + topRadiusY * 0.6, bodyBottom - bottomRadiusY * 0.6, t));
    for (let x = left + 8; x <= right - 8; x += 1) {
      const colT = (x - (left + 8)) / (right - left - 16);
      const highlight = 1.05 - Math.abs(colT - 0.5) * 0.08;
      const [r, g, b] = mixColor([190, 220, 255], [160, 200, 245], colT);
      const shaded = [r, g, b].map(channel => Math.min(255, Math.round(channel * highlight)));
      setPixel(x, y, shaded);
      setPixel(x, y + 1, shaded.map(channel => Math.round(channel * 0.92)));
    }
  }

  const gridRows = 4;
  const gridCols = 5;
  const paddingX = size * 0.1;
  const paddingY = size * 0.08;
  const bodyStartY = bodyTop + topRadiusY;
  const bodyEndY = bodyBottom - bottomRadiusY;
  const usableWidth = right - left - paddingX * 2;
  const usableHeight = bodyEndY - bodyStartY - paddingY * 2;

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const cellX = left + paddingX + (usableWidth / (gridCols - 1 || 1)) * col;
      const cellY = bodyStartY + paddingY + (usableHeight / (gridRows - 1 || 1)) * row;
      const glow = 0.9 + (1 - col / (gridCols - 1 || 1)) * 0.1;
      const cellColor = [220, 240, 255].map(channel => Math.round(channel * glow));

      for (let y = -6; y <= 6; y += 1) {
        for (let x = -6; x <= 6; x += 1) {
          if (Math.abs(x) === 6 || Math.abs(y) === 6) continue;
          const dist = Math.sqrt((x / 6) ** 2 + (y / 6) ** 2);
          if (dist <= 1) {
            setPixel(Math.round(cellX + x), Math.round(cellY + y), cellColor);
          }
        }
      }
    }
  }
}

function drawMagnifier() {
  const centerX = size * 0.72;
  const centerY = size * 0.35;
  const radius = size * 0.12;
  const ringWidth = size * 0.02;
  const handleLength = size * 0.18;
  const handleWidth = size * 0.035;

  for (let y = Math.round(centerY - radius - ringWidth); y <= Math.round(centerY + radius + ringWidth); y += 1) {
    for (let x = Math.round(centerX - radius - ringWidth); x <= Math.round(centerX + radius + ringWidth); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius && distance >= radius - ringWidth) {
        const t = (distance - (radius - ringWidth)) / ringWidth;
        const ringColor = mixColor([240, 246, 255], [160, 206, 255], t);
        setPixel(x, y, ringColor);
      } else if (distance < radius - ringWidth) {
        const fillColor = [190, 220, 255];
        setPixel(x, y, fillColor);
      }
    }
  }

  const angle = Math.PI / 4;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const startX = centerX + (radius - ringWidth * 0.5) * cosAngle;
  const startY = centerY + (radius - ringWidth * 0.5) * sinAngle;

  for (let i = 0; i < handleLength; i += 1) {
    const offsetX = startX + i * cosAngle;
    const offsetY = startY + i * sinAngle;
    for (let w = -handleWidth / 2; w <= handleWidth / 2; w += 1) {
      const x = Math.round(offsetX - w * sinAngle);
      const y = Math.round(offsetY + w * cosAngle);
      const blend = i / handleLength;
      const handleColor = mixColor([140, 180, 240], [90, 130, 210], blend);
      setPixel(x, y, handleColor);
    }
  }
}

async function main() {
  await mkdir(assetsDir, { recursive: true });

  drawGradientBackground();
  drawCylinder();
  drawMagnifier();

  const iconPngPath = resolve(assetsDir, "icon.png");
  await pipeline(png.pack(), createWriteStream(iconPngPath));

  await iconGen(iconPngPath, assetsDir, {
    report: false,
    modes: ["icns", "ico"],
    icns: { name: "icon.icns" },
    ico: { name: "icon.ico" },
  });

  globalThis.console.log(`Icon assets generated in ${assetsDir}`);
}

main().catch(error => {
  globalThis.console.error("Failed to generate icon assets", error);
  process.exitCode = 1;
});
