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
  const markdownFiles = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
  
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
    'Use this tool to search for information in the project documentation about the Image Watermarking App (Nuxt 4 + WebAssembly). The tool performs semantic search across markdown files in the docs/ directory and returns the most relevant information. Use it when: 1) the user asks about image watermarking functionality, WASM integration, or Rust implementation; 2) you need specific information about setup, prerequisites (Node.js, Rust, wasm-pack), or build processes; 3) the user wants to know about watermark features like PNG stamps, opacity control, text watermarks, or batch processing; 4) you need answers about development workflow, deployment to Cloudflare, or troubleshooting WASM issues; 5) questions about supported formats (JPG, PNG, WebP), directory saving, or performance optimization.',
  parameters: z.object({
    query: z.string().describe('The query to search for in the documentation.')
  }),
  execute: async ({ query }: { query: string }) => {
    console.log(`RAG Tool SEARCH: Searching for "${query}" in documentation...`);

    const index = await getDataSource();
    const queryEngine = index.asQueryEngine({
      similarityTopK: 5 // Return top 5 most relevant chunks
    });

    const response = await queryEngine.query({ query });
    const responseText = response.toString();

    return responseText;
  }
});