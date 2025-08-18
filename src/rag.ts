import { VectorStoreIndex, tool, Settings } from 'llamaindex';
import { PDFReader } from '@llamaindex/readers/pdf';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { Ollama } from '@llamaindex/ollama';

// Configure embedding and LLM models
Settings.embedModel = new HuggingFaceEmbedding();
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

async function getDataSource() {
  console.log('Loading PDF documents...');
  const reader = new PDFReader();
  const documents = await reader.loadData('docs/why_B2B_from_GenCloud.pdf');
  console.log(`Loaded ${documents.length} documents from PDF`);
  
  // Debug: Show content of first few documents
  for (let i = 0; i < Math.min(3, documents.length); i++) {
    const content = documents[i].getText();
    console.log(`Document ${i + 1} preview (${content.length} chars): ${content.substring(0, 200)}...`);
  }
  
  // Create index from documents (in-memory for simplicity)
  console.log('Creating vector index...');
  const index = await VectorStoreIndex.fromDocuments(documents);
  console.log('Vector index created successfully');
  
  return index;
}

export const ragTool = tool({
  name: 'ragTool',
  description: 'Use this tool to search and answer questions about B2B services from GenCloud using the company PDF documentation. This tool has access to the complete B2B GenCloud documentation and should be used for any questions about GenCloud B2B services, features, pricing, or capabilities.',
  parameters: z.object({
    query: z.string().describe('The query to search for in the B2B GenCloud documentation.'),
  }),
  execute: async ({ query }: { query: string }) => {
    console.log(`RAG Tool: Searching for "${query}" in B2B GenCloud documentation...`);
    const index = await getDataSource();
    const queryEngine = index.asQueryEngine({
      similarityTopK: 5 // Return top 5 most relevant chunks
    });
    const response = await queryEngine.query({ query });
    console.log(`RAG Tool: Found relevant information for query "${query}"`);
    
    // Debug: Show first part of response
    const responseText = response.toString();
    console.log(`RAG Response preview: ${responseText.substring(0, 200)}...`);
    
    return responseText;
  },
});