import { agent } from '@llamaindex/workflow';
import { ragTool } from './tools/rag.tools';
import { sumNumbers, divideNumbers } from './tools/math.tools';

async function main() {
  console.log(' Begin Thinking...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const agentTools = agent({
    timeout: 30000,
    tools: [sumNumbers, divideNumbers, ragTool],
    verbose: false
  });

  const response = await agentTools.run('What I need to start Image Watermarking App?');
  // const math = await agentTools.run('Calculate 5 + 5, then divide the result by 2.');

  console.log("Call RAG", JSON.parse(JSON.stringify(response.data.result, null, 2)));
  // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // console.log("Call Math", JSON.parse(JSON.stringify(math.data.result, null, 2)));
}

void main().then(() => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Done');
});