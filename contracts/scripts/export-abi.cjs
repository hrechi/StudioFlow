/** Copies the compiled ABIs to the Reframe app, so the UI and the contracts cannot drift apart. */
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT_DIR = path.join(__dirname, "..", "..", "src", "modules", "snapseal", "abi");

for (const name of ["SelectionRegistry", "DeliveryReceipt"]) {
  const artifact = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${name}.sol`,
    `${name}.json`,
  );
  const { abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));
  fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.json`), `${JSON.stringify(abi, null, 2)}\n`);
  console.log(`Exported ${name}.json`);
}
