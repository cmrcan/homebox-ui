import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const result = await build({
  stdin: {
    contents: 'export { BrowserMultiFormatReader } from "@zxing/browser";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "iife",
  globalName: "HomeboxBarcode",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "inline",
  write: false,
});
await mkdir("webapp/thirdparty", { recursive: true });
await writeFile(
  "webapp/thirdparty/zxing.js",
  `sap.ui.define([], function () {\n${result.outputFiles[0].text}\nreturn HomeboxBarcode;\n});\n`,
);

await mkdir("webapp/licenses", { recursive: true });
for (const name of ["browser", "library"])
  await writeFile(
    `webapp/licenses/zxing-${name}.txt`,
    await readFile(`node_modules/@zxing/${name}/LICENSE`, "utf8"),
  );
