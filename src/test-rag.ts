import { VectorStoreIndex, Settings } from 'llamaindex';
import { PDFReader } from '@llamaindex/readers/pdf';
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

async function testRAG() {
  console.log('Testing RAG functionality...');
  
  try {
    // Test 1: PDF Reading
    console.log('Step 1: Reading PDF...');
    const reader = new PDFReader();
    const documents = await reader.loadData('docs/why_B2B_from_GenCloud.pdf');
    console.log(`✓ Successfully loaded ${documents.length} documents from PDF`);
    console.log(`First document preview: ${documents[0].getText().substring(0, 200)}...`);
    
    // Test 2: Create index with HuggingFace embeddings
    console.log('\nStep 2: Creating vector index with HuggingFace embeddings...');
    const index = await VectorStoreIndex.fromDocuments(documents);
    console.log('✓ Vector index created successfully');
    
    // Test 3: Query the index
    console.log('\nStep 3: Testing query...');
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({ query: "What is B2B from GenCloud?" });
    console.log('✓ Query executed successfully');
    console.log('Response:', response.toString());
    
  } catch (error) {
    console.error('❌ Error during RAG testing:', error);
  }
}

// Run the test
testRAG().then(() => {
  console.log('\n✓ RAG test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ RAG test failed:', error);
  process.exit(1);
});
