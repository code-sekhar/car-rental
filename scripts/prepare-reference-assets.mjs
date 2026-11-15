// Extract only original embedded photographs, never complete reference screenshots.
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const assets = [
  ["Booking Success - Delivery.svg", 1, "chevrolet-camaro"],
  ["Booking Success - Delivery.svg", 2, "driver"],
  ["List View.svg", 0, "ferrari-458"],
  ["List View.svg", 2, "bmw-640"],
  ["List View.svg", 4, "ford-explorer"],
];
await mkdir("public/images", { recursive: true });
for (const [file, index, name] of assets) {
  const svg = await readFile(`public/${file}`, "utf8");
  const images = [
    ...svg.matchAll(
      /<image\b[^>]*xlink:href="data:image\/[^;]+;base64,([^"]+)"/g,
    ),
  ];
  if (!images[index])
    throw new Error(`Missing reference image: ${file}, ${index}`);
  await sharp(Buffer.from(images[index][1], "base64"))
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(`public/images/${name}.webp`);
}
