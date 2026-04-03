import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();

async function main() {
  const from = path.join(
    projectRoot,
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.min.mjs"
  );
  const toDir = path.join(projectRoot, "public");
  const to = path.join(toDir, "pdf.worker.min.mjs");

  await fs.mkdir(toDir, { recursive: true });
  await fs.copyFile(from, to);
  // eslint-disable-next-line no-console
  console.log(`Copied PDF.js worker to ${path.relative(projectRoot, to)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to copy PDF.js worker:", err);
  process.exitCode = 1;
});

