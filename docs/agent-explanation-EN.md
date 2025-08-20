# How the AI Agent Works - A Story About the Main File

## Introduction - What is an AI Agent?

Imagine you're creating a robot assistant that can talk to people and answer their questions. This robot needs a "brain" (AI model), "tools" it can use, and "ears and mouth" (communication interface). Our `agent.ts` file is exactly that - the main "dispatcher" that manages the entire AI agent.

## Step 1: Starting the Program - Awakening the Agent

### 🌅 Initialization (function `main()`)

When you start the program, the first thing that happens is:

1. **Awakening the AI brain** - The LLM (Large Language Model) is initialized
```typescript
initLLM(defaultLLMConfig);
```
This is like "turning on" the agent's brain with specific settings.

2. **Checking command arguments** - The program checks what special options you've provided:
   - `--verbose` or `-v` = "talk more" (detailed messages)
   - `--refresh-index` = "update documentation" (reindex all files)

### 🔄 Special Mode: Documentation Update

If you started with `--refresh-index`:
1. **Loads the RAG tool** - Imports SQLite vector store
2. **Deletes old information** - Cleans the database
3. **Reads all documents again** - Reindexes all .md files
4. **Closes the database** - Finishes safely
5. **Shuts down the program** - Job done, doesn't start the agent

## Step 2: Preparing the "Tools"

### 🛠️ Loading the RAG Tool

```typescript
const ragModule = await import('./tools/rag-sqlite.tools');
const { ragSQLiteTool } = ragModule;
```

This is like giving your assistant access to a library with books. The agent can now:
- Search for information in documentation
- Answer questions about the project
- Provide current information

### ⚙️ Creating the Agent

```typescript
const agentTools = agent({
  timeout: 30000,
  tools: [sumNumbers, divideNumbers, ragSQLiteTool],
  verbose: isVerbose,
  systemPrompt: `...`
});
```

Here the agent itself is created with:
- **Timeout**: 30 seconds maximum for response
- **Tools**: Mathematical operations + documentation
- **Verbose mode**: Whether to show details
- **System instruction**: How the agent should behave

## Step 3: The System Instruction - The Agent's "Personality"

### 🧠 Programming the Behavior

The system instruction tells the agent:

1. **Basic role**: "You are a helpful AI assistant specialized in the Image Watermarking App project"
2. **Language**: "Always respond in Bulgarian language"
3. **When to use RAG**: For questions about:
   - Installation procedures
   - Project setup
   - WASM development
   - Watermarking features
   - Cloudflare deployment
   - Troubleshooting
4. **Format**: "Answer clearly and accurately, without extra tags"

## Step 4: The Communication Interface

### 💬 Creating Console Chat

```typescript
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
```

This creates the agent's "ears and mouth" - it can:
- Listen to what you type in the console
- Respond back in the console

### 🎯 The `askQuestion()` Function - Heart of the Conversation

This function works as an endless loop for questions:

1. **Waits for a question** - The program stops and waits for you to type something
2. **Checks the input**:
   - Empty line → "Please try again"
   - "exit" or "еьит" → Shuts down the program
   - Normal question → Continues

3. **Processes the question**:
   ```typescript
   const response = await agentTools.run(question);
   ```
   Here the magic happens - the agent:
   - Analyzes the question
   - Decides which tools to use
   - Calls RAG tool if needed
   - Generates a response

4. **Shows the result** - Prints the answer nicely formatted

5. **Starts again** - Asks for the next question

## Step 5: Error Handling

### 🛡️ Graceful Error Handling

The program is prepared for various problems:

1. **Errors when processing questions**:
   ```typescript
   try {
     const response = await agentTools.run(question);
   } catch (error) {
     console.error('❌ Error:', error);
   }
   ```
   If something goes wrong, it shows the error but continues working.

2. **Fatal errors**:
   ```typescript
   void main().catch((error) => {
     console.error('❌ Fatal error:', error);
     process.exit(1);
   });
   ```
   If there's a critical error during startup, the program shuts down safely.

## Step 6: The Workflow - From Question to Answer

### 🔄 The Complete Cycle

1. **User types a question** → "How do I install wasm-pack?"
2. **Agent receives the question** → Analyzes it
3. **Agent decides** → "This is an installation question, I need documentation"
4. **Calls RAG tool** → Searches the database for "wasm-pack" and "install"
5. **RAG returns information** → Most relevant parts from documentation
6. **Agent generates response** → Combines information into readable text
7. **User receives answer** → Structured, accurate information
8. **Cycle starts again** → Waits for the next question

## Technical Details for the Curious

### ⚙️ Asynchronous Programming

The program uses `async/await` everywhere because:
- AI models take time to respond
- Database may load slowly
- User may wait between questions

### 🎛️ Configuration Options

- **Timeout**: 30 seconds to avoid hanging forever
- **Verbose**: Shows details for debugging
- **Tools array**: Easy addition of new tools
- **System prompt**: Easy behavior modification

### 🔧 Modular Architecture

Everything is divided into modules:
- `llm.settings.ts` - AI model settings
- `math.tools.ts` - mathematical operations
- `rag-sqlite.tools.ts` - documentation searcher
- `agent.ts` - main orchestrator

## Conclusion

The AI agent is like a smart secretary who:

1. **Wakes up** with the right settings and tools
2. **Listens carefully** to what you tell them
3. **Decides intelligently** which tools to use
4. **Searches for information** in documentation when needed
5. **Responds accurately** in Bulgarian
6. **Waits patiently** for the next question
7. **Handles errors** without breaking

This makes it possible to have an interactive conversation with AI that "knows" everything about your project and can help you with specific, current answers.
