import * as path from "node:path";
import fs from "fs-extra";
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
manifest.manifest_version = 2;
fs.writeFileSync(
  `${outDir}/background.html`,
  '<script type="module" src="./service-worker-loader.js"></script>'
);
manifest.background = { page: "background.html" };
manifest.browser_action = manifest.action;
manifest.action = undefined;
for (const permission of manifest.host_permissions) {
  manifest.permissions.push(
    permission === "<all_urls>" ? "*://*/*" : permission
  );
}
manifest.host_permissions = undefined;
const tempResources = [];
for (const obj of manifest.web_accessible_resources) {
  for (const resource of obj.resources) {
    tempResources.push(resource);
  }
}
manifest.web_accessible_resources = tempResources;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
