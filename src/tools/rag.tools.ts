import { VectorStoreIndex, tool, Settings, Document } from 'llamaindex';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { Ollama } from '@llamaindex/ollama';
import * as fs from 'fs';
import * as path from 'path';

// Configure embedding and LLM models
Settings.embedModel = new HuggingFaceEmbedding();
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

async function getDataSource() {
  const allDocuments: Document[] = [];

  // Load markdown documents
  const docsDir = 'docs';
  const markdownFiles = fs.readdirSync(docsDir).filter((file) => file.endsWith('.md'));

  for (const mdFile of markdownFiles) {
    const filePath = path.join(docsDir, mdFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const document = new Document({
      text: content,
      metadata: {
        file_name: mdFile,
        file_path: filePath,
        file_type: 'markdown'
      }
    });

    allDocuments.push(document);
  }

  // Create index from documents (in-memory for simplicity)
  const index = await VectorStoreIndex.fromDocuments(allDocuments);

  return index;
}

export const ragTool = tool({
  name: 'ragTool',
  description:
    'Използвай този инструмент за търсене на информация в проектната документация за Image Watermarking App (Nuxt 4 + WebAssembly). Инструментът прави семантично търсене в markdown файловете в docs/ директорията и връща най-релевантната информация. Използвай го когато: 1) потребителят пита за функционалности за watermarking на изображения, WASM интеграция или Rust имплементация; 2) трябва специфична информация за setup, prerequisites (Node.js, Rust, wasm-pack) или build процеси; 3) потребителят иска да знае за watermark възможности като PNG stamps, opacity control, text watermarks или batch processing; 4) трябват отговори за development workflow, deployment към Cloudflare или troubleshooting на WASM проблеми; 5) въпроси за поддържани формати (JPG, PNG, WebP), directory saving или performance optimization.',
  parameters: z.object({
    query: z.string().describe('Заявката за търсене в документацията.')
  }),
  execute: async ({ query }: { query: string }) => {
    console.log(`📚 RAG Търсене: Търсене на "${query}" в документацията...`);

    const index = await getDataSource();
    const queryEngine = index.asQueryEngine({
      similarityTopK: 5 // Return top 5 most relevant chunks
    });

    const response = await queryEngine.query({ query });
    const responseText = response.toString();

    console.log(`✅ Намерена информация: ${responseText.length} символа`);
    return responseText;
  }
});
