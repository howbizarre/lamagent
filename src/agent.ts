import { agent } from '@llamaindex/workflow';
import { ragTool } from './tools/rag.tools';
import { sumNumbers, divideNumbers } from './tools/math.tools';
import * as readline from 'readline';

async function main() {
  console.log(' Begin Thinking...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const agentTools = agent({
    timeout: 30000,
    tools: [sumNumbers, divideNumbers, ragTool],
    verbose: false
  });

  // Създаваме readline интерфейс
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🤖 AI Agent is ready! Type your questions (type "exit" to quit):\n');

  // Функция за задаване на въпроси
  const askQuestion = () => {
    rl.question('🔹 You: ', async (input) => {
      const question = input.trim();
      
      // Проверяваме дали е празно или е "exit"
      if (!question) {
        console.log('⚠️  Empty question, please try again.\n');
        askQuestion();
        return;
      }
      
      if (question.toLowerCase() === 'exit') {
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
      
      // Задаваме следващия въпрос
      askQuestion();
    });
  };

  // Започваме интерактивната сесия
  askQuestion();
}

void main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});