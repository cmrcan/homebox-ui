import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const build = resolve(root, ".ui5-build");
const target = resolve(root, "public/resources");
// UI5 Tooling compiles Horizon LESS, creates library preloads and version metadata.
// Copying the raw npm src folders would leave themes and preload files unbuilt.
execFileSync(
  process.execPath,
  [
    require.resolve("@ui5/cli/bin/ui5.cjs"),
    "build",
    "--all",
    "--include-task",
    "generateVersionInfo",
    "--clean-dest",
    "--dest",
    build,
  ],
  { cwd: root, stdio: "inherit" },
);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(build, "resources"), target, { recursive: true });
const license = await readFile(
  resolve(root, "public/licenses/openui5.txt"),
  "utf8",
);
await writeFile(
  resolve(target, "THIRD-PARTY-LICENSES.txt"),
  `OpenUI5 1.154.0\n${license}`,
);
await rm(build, { recursive: true, force: true });
console.log("Compiled OpenUI5 resources and licenses prepared locally.");
