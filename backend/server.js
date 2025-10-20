import express from "express";
import cors from "cors";
import fs from "fs";
import cosine from "cosine-similarity";
import { pipeline } from "@xenova/transformers";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const CHUNKS = JSON.parse(fs.readFileSync("./data/chunks.json", "utf-8"));
const PORT = 3000;

async function loadModels() {
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  let qa = null;
  try {
    qa = await pipeline(
      "question-answering",
      "Xenova/distilbert-base-uncased-distilled-squad"
    );
  } catch {}
  return { embedder, qa };
}

const topK = (qEmb, k = 3) =>
  CHUNKS.map((c) => ({ ...c, score: cosine(qEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

const { embedder, qa } = await loadModels();

app.post("/ask", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (question.length < 3)
      return res.status(400).json({ error: "Pergunta muito curta." });
    const q = await embedder(question, { pooling: "mean", normalize: true });
    const qEmb = Array.from(q.data);
    const cands = topK(qEmb, 3);
    let best = { answer: "", score: -Infinity, source: null };
    if (qa) {
      for (const c of cands) {
        try {
          const out = await qa({ question, context: c.text });
          if (out.score > best.score)
            best = { answer: out.answer, score: out.score, source: c.id };
        } catch {}
      }
    }
    if (!best.answer) {
      best = {
        answer: cands[0]?.text || "(sem resposta encontrada)",
        score: 0,
        source: cands[0]?.id || null,
      };
    }
    res.json({
      answer: best.answer,
      sources: cands.map((c) => ({ id: c.id, sim: c.score })),
      score: best.score,
    });
  } catch {
    res.status(500).json({ error: "Falha ao processar a pergunta." });
  }
});

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
