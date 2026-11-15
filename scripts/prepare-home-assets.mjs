// Prepare design-preview assets. Publication rights still need verification.
// Usage: node scripts/prepare-home-assets.mjs /absolute/path/to/download-directory
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
const inputDirectory = process.argv[2];
if (!inputDirectory) throw new Error("Provide the source asset directory.");
const assets = {
  "car-right.png": "hero-suv.webp",
  "banner.jpg": "hero-background.webp",
  "price-plan.png": "pricing-car.webp",
  "app-car.png": "app-car.webp",
  "bg-facts-left.png": "facts-car.webp",
  "bg-facts-right.png": "facts-accent.webp",
  "bg-count-bg.jpg": "stat-background.webp",
  "bg-choose-left.png": "choose-dots.webp",
  "bg-about-testimonial.jpg": "testimonial-background.webp",
  "bg-service-right.svg": "service-dots.svg",
  "bg-title-head.png": "heading-underline.webp",
  "footer-left.png": "footer-left.webp",
  "footer-right.png": "footer-right.webp",
  "cars-car-01.jpg": "toyota-camry.webp",
  "cars-car-02.jpg": "kia-soul.webp",
  "cars-car-03.jpg": "audi-a3.webp",
  "cars-car-04.jpg": "ferrari-458.webp",
  "cars-car-05.jpg": "chevrolet-camaro.webp",
  "cars-car-07.jpg": "chevrolet-pickup.webp",
  "cars-car-08.jpg": "toyota-tacoma.webp",
  "cars-car-13.jpg": "ford-mustang.webp",
  "cars-rental-car-01.jpg": "rental-bmw.webp",
  "cars-rental-car-02.jpg": "rental-ferrari.webp",
  "cars-rental-car-03.jpg": "rental-mercedes.webp",
  "blog-blog-4.jpg": "journal-mercedes.webp",
  "blog-blog-3.jpg": "journal-driving.webp",
  "blog-blog-10.jpg": "journal-ford.webp",
};
for (let i = 1; i <= 5; i++)
  assets[`cars-mp-vehicle-0${i}.svg`] = `category-${i}.svg`;
for (let i = 1; i <= 3; i++)
  assets[`icons-services-icon-0${i}.svg`] = `step-${i}.svg`;
for (let i = 1; i <= 6; i++)
  assets[`icons-car-icon-0${i}.svg`] = `brand-${i}.svg`;
for (const i of [2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 15])
  assets[`profiles-avatar-${String(i).padStart(2, "0")}.jpg`] =
    `avatar-${i}.webp`;
await mkdir("public/images/home", { recursive: true });
const manifest = [];
for (const [source, output] of Object.entries(assets)) {
  const bytes = await readFile(resolve(inputDirectory, source));
  if (output.endsWith(".svg")) {
    if (
      !bytes.toString().includes("<svg") ||
      /<script|<foreignObject|\bonload=/i.test(bytes.toString())
    )
      throw new Error(`Unsafe or invalid SVG: ${source}`);
    await writeFile(`public/images/home/${output}`, bytes);
  } else
    await sharp(bytes)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(`public/images/home/${output}`);
  const sourcePath = source.replace(/^(cars|bg|icons|profiles|blog)-/, "$1/");
  manifest.push({
    file: `/images/home/${output}`,
    source: `https://dreamsrent.dreamstechnologies.com/html/template/assets/img/${sourcePath}`,
    usage: "Local design preview; publication license unverified",
  });
}
await writeFile(
  "docs/home-asset-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
