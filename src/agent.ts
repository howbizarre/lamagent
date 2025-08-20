import { agent } from '@llamaindex/workflow';
import { sumNumbers, divideNumbers, multiplyNumbers, subtractNumbers } from './tools/math.tools';
import { initLLM, defaultLLMConfig } from './tools/llm.settings';
import { createInterface } from 'readline';

async function main() {
  // Initialize LLM settings first
  initLLM(defaultLLMConfig);
  console.log('🔧 LLM инициализиран:', defaultLLMConfig);

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
    tools: [sumNumbers, divideNumbers, multiplyNumbers, subtractNumbers, ragSQLiteTool],
    verbose: isVerbose,
    systemPrompt: `You are a helpful AI assistant that specializes in AI agent development and RAG (Retrieval-Augmented Generation) tools. 
You can respond in both Bulgarian and English - automatically detect the user's language and respond accordingly.

Use the RAG tool to search documentation when users ask about:
- How the AI agent works and its architecture
- Agent initialization and configuration
- RAG SQLite tool functionality and implementation
- Vector stores and embedding models
- Document indexing and search capabilities
- Tool integration and management
- Agent communication and response handling
- Technical implementation details

The documentation includes detailed explanations of:
- Agent workflow and main components (agent.ts)
- RAG SQLite tool implementation and how it processes documents
- Vector database operations and similarity search
- Document chunking and embedding generation

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