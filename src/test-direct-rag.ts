import { Ollama } from '@llamaindex/ollama';
import { Settings } from 'llamaindex';
import { ragTool } from './rag';

// Set up Ollama LLM
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

async function testDirectRAG() {
  console.log('Testing direct RAG call...');
  
  try {
    const result = await ragTool.call({ query: "What is B2B from GenCloud?" });
    console.log('\n=== RAG RESULT ===');
    console.log(result);
    console.log('=== END RESULT ===\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirectRAG().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
