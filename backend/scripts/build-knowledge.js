import fs from "fs";
import { createRequire } from "module";
import { pipeline } from "@xenova/transformers";

const PDF_PATH = "./data/regulamento.pdf";
const CHUNKS_PATH = "./data/chunks.json";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

function chunkText(text, maxLen = 1200) {
  const paras = text.replace(/\r/g, "").split(/\n\s*\n+/);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    const cand = buf ? `${buf}\n\n${p}` : p;
    if (cand.length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = cand;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.map((t, i) => ({ id: i + 1, text: t }));
}

async function main() {
  const raw = (await pdf(fs.readFileSync(PDF_PATH))).text.trim();
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  const chunks = chunkText(raw, 1200);
  const withEmb = [];
  for (const c of chunks) {
    const emb = await extractor(c.text, { pooling: "mean", normalize: true });
    withEmb.push({ ...c, embedding: Array.from(emb.data) });
  }
  fs.writeFileSync(CHUNKS_PATH, JSON.stringify(withEmb, null, 2));
  console.log(`OK: ${withEmb.length} chunks salvos em ${CHUNKS_PATH}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
