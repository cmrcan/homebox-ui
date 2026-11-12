import "./build-scanner.mjs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const backend = (process.env.HOMEBOX_URL || "http://localhost:7745").replace(
  /\/$/,
  "",
);
const child = spawn(
  process.execPath,
  [
    require.resolve("@ui5/cli/bin/ui5.cjs"),
    "serve",
    "--port",
    "5173",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      UI5_MIDDLEWARE_SIMPLE_PROXY_BASEURI: `${backend}/api`,
    },
  },
);
child.on("exit", (code) => {
  process.exitCode = code || 0;
});

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
