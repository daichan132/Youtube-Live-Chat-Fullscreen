import * as path from "node:path";

import * as fs from "fs-extra";

const BASE_OUT_DIR = "dist";
const baseOutDir = path.resolve(BASE_OUT_DIR);

if (!fs.existsSync(baseOutDir)) {
  throw Error(
    `${BASE_OUT_DIR} dir does not exist. Please run base build first.`
  );
}

const outDir = `${path.dirname(
  path.basename(baseOutDir)
)}/${BASE_OUT_DIR}-firefox`;

fs.copySync(baseOutDir, outDir);

const manifestPath = path.resolve(outDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

manifest.manifest_version = 3;

fs.writeFileSync(
  `${outDir}/background.html`,
  '<script type="module" src="./service-worker-loader.js"></script>'
);
manifest.background = { page: "background.html" };

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
