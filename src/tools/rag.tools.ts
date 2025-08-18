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
  description: 'Use this tool to search and answer questions about system architecture and documentation. This tool has access to markdown documentation files and should be used for any questions about system architecture, components, features, or technical documentation.',
  parameters: z.object({
    query: z.string().describe('The query to search for in the documentation.'),
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
  },
});