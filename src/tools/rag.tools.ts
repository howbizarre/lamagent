import { tool, Settings } from 'llamaindex';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { Ollama } from '@llamaindex/ollama';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import sqliteVss from 'sqlite-vss';

// Configure embedding and LLM models
Settings.embedModel = new HuggingFaceEmbedding();
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

let db: Database.Database | null = null;

function float32ArrayToBuffer(arr: number[]): Buffer {
  return Buffer.from(new Float32Array(arr).buffer);
}

async function initializeDatabase(): Promise<Database.Database> {
  if (db) return db;

  const dbPath = path.join('docs.db');
  db = new Database(dbPath);
  db.loadExtension(sqliteVss.vss_loadable_path);

  db.exec(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY,
    content TEXT
  );`);

  // Determine embedding dimension from a sample embedding
  const sampleEmbedding = await Settings.embedModel.getTextEmbedding('dimension check');
  const dimension = sampleEmbedding.length;
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS doc_embeddings USING vss0(embedding(${dimension}));`);

  // Load markdown documents if not already present
  const count = db.prepare('SELECT COUNT(*) as c FROM documents').get().c as number;
  if (count === 0) {
    const docsDir = 'docs';
    const markdownFiles = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
    const insertDoc = db.prepare('INSERT INTO documents(content) VALUES(?)');
    const insertEmb = db.prepare('INSERT INTO doc_embeddings(rowid, embedding) VALUES(?, ?)');

    for (const mdFile of markdownFiles) {
      const filePath = path.join(docsDir, mdFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      const info = insertDoc.run(content);
      const embedding = await Settings.embedModel.getTextEmbedding(content);
      insertEmb.run(info.lastInsertRowid, float32ArrayToBuffer(embedding));
    }
  }

  return db;
}

export const ragTool = tool({
  name: 'ragTool',
  description: 'Use this tool to search and answer questions about system architecture and documentation. This tool has access to markdown documentation files and should be used for any questions about system architecture, components, features, or technical documentation.',
  parameters: z.object({
    query: z.string().describe('The query to search for in the documentation.'),
  }),
  execute: async ({ query }: { query: string }) => {
    console.log(`RAG Tool SEARCH: Searching for "${query}" in documentation...`);

    const database = await initializeDatabase();
    const queryEmbedding = await Settings.embedModel.getTextEmbedding(query);
    const stmt = database.prepare(`
      SELECT documents.content, doc_embeddings.distance
      FROM doc_embeddings JOIN documents ON documents.id = doc_embeddings.rowid
      WHERE doc_embeddings MATCH vss_search(?, 5)
      ORDER BY distance
    `);

    const rows = stmt.all(float32ArrayToBuffer(queryEmbedding));
    const resultText = rows.map((r: any) => r.content).join('\n---\n');

    return resultText;
  },
});