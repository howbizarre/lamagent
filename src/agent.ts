import { agent } from '@llamaindex/workflow';
import { sumNumbers, divideNumbers } from './tools/math.tools';
import { createInterface } from 'readline';

async function main() {
  // check if verbose or refresh index
  const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const refreshIndex = process.argv.includes('--refresh-index');

  console.log(' Begin Thinking...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // if refresh index is used
  if (refreshIndex) {
    console.log('🔄 Форсирано обновяване на RAG индекса...');

    const ragModule = await import('./tools/rag-sqlite.tools');
    const tempStore = new ragModule.SQLiteVectorStore();

    await tempStore.refreshIndex();
    tempStore.close();

    console.log('✅ RAG индексът е обновен успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return; // return without start agent
  }

  // Add RAG tool on demand
  const ragModule = await import('./tools/rag-sqlite.tools');
  const { ragSQLiteTool } = ragModule;

  const agentTools = agent({
    timeout: 30000,
    tools: [sumNumbers, divideNumbers, ragSQLiteTool],
    verbose: isVerbose,
    systemPrompt: `You are a helpful AI assistant that specializes in the Image Watermarking App project. 
Always respond in Bulgarian language. Use the RAG tool to search documentation when users ask about:
- Installation procedures (Node.js, Rust, wasm-pack)
- Project setup and prerequisites
- WASM development and building
- Image watermarking features
- Deployment to Cloudflare
- Troubleshooting issues

Provide clear, accurate answers based on the documentation. Format your responses properly without extra tags or markup.`
  });

  // Console readline communication
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🤖 AI Agent is ready! Type your questions (type "exit" to quit):\n');

  // Ask Questions
  const askQuestion = () => {
    rl.question('🔹 You: ', async (input) => {
      const question = input.trim();

      // Check for "exit" or empty input
      if (!question) {
        console.log('⚠️  Empty question, please try again.\n');

        askQuestion();
        return;
      }

      if (question.toLowerCase() === 'exit' || question.toLowerCase() === 'еьит') {
        console.log('\n👋 Goodbye!');

        rl.close();
        return;
      }

      try {
        console.log('\n🔄 Processing...\n');

        const response = await agentTools.run(question);

        console.log('🤖 Agent:', JSON.parse(JSON.stringify(response.data.result, null, 2)));
        console.log('\n' + '─'.repeat(80) + '\n');
      } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n' + '─'.repeat(80) + '\n');
      }

      // Next Question
      askQuestion();
    });
  };

  // Start Questioning
  askQuestion();
}

// Entry point
void main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});