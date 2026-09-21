import { copyFileSync, existsSync } from "node:fs";

const source = "dist/index.html";
const target = "dist/404.html";

if (!existsSync(source)) {
  throw new Error("Vite build output dist/index.html was not found.");
}

copyFileSync(source, target);
console.log("Created dist/404.html for SPA fallback.");
