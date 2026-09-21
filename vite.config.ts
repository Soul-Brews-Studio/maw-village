import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CalVer plus the commit that produced it. A deployed page that cannot say
// which build it is turns every "it still does not work" into a guess about
// browser cache; this makes it a fact you can read off the screen.
function buildId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
    + `.${pad(now.getHours())}${pad(now.getMinutes())}`;
  let sha = "nogit";
  try { sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); } catch { /* not a checkout */ }
  return `${stamp}+${sha}`;
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  build: { outDir: "dist", sourcemap: false },
});
