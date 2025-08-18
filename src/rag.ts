import { VectorStoreIndex, tool } from 'llamaindex';
import { PDFReader } from '@llamaindex/readers/pdf';
import { z } from 'zod';
import { ChromaVectorStore } from '@llamaindex/chroma';

const COLLECTION_NAME = 'b2b_rag';
async function getDataSource() {
  const vectorStore = new ChromaVectorStore({ 
    collectionName: COLLECTION_NAME
  });

  // Check if the collection is empty by trying to create an index from existing vector store
  try {
    const existingIndex = await VectorStoreIndex.fromVectorStore(vectorStore);
    // Try to query to see if there's data
    const testQuery = await existingIndex.asQueryEngine().query({ query: "test" });
    console.log('Using existing index.');
    return existingIndex;
  } catch (error) {
    console.log('Collection is empty, creating index...');
    const reader = new PDFReader();
    const documents = await reader.loadData('docs/why_B2B_from_GenCloud.pdf');
    const index = await VectorStoreIndex.fromDocuments(documents);
    console.log('Index created.');
    return index;
  }
}

export const ragTool = tool({
  name: 'ragTool',
  description: 'Use this tool to answer questions about B2B from GenCloud.',
  parameters: z.object({
    query: z.string().describe('The query to search for in the document.'),
  }),
  execute: async ({ query }: { query: string }) => {
    const index = await getDataSource();
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({ query });
    return response.toString();
  },
});