# What Happens When an AI Agent Uses the RAG SQLite Tool

## Introduction - What is RAG?

Imagine you have a personal assistant who needs to answer questions about your company. The problem is that AI models have limited memory and don't know the specific details about your projects. This is where **RAG** (Retrieval-Augmented Generation) comes in - a technology that allows AI to "read" and search information in your documents before responding.

## Step 1: When Does the Tool Activate?

When a user asks questions like:
- "How do I install WASM-pack?"
- "What are the project prerequisites?"
- "Show me the watermarking documentation"

The AI model understands it needs specific information from the documentation and decides to use the `ragSQLiteTool`.

## Step 2: First Run - Setting Up the "Library"

### 🏗️ Creating the "Smart Library" (SQLite Database)

When the tool starts for the first time, it does the following:

1. **Creates a database** (`rag_cache.db`) - this is like an electronic filing cabinet
2. **Scans the `docs` folder** - looks for all `.md` files (documentation)
3. **For each file**:
   - Reads the content
   - Splits it into small chunks - like pages in a book
   - Converts each chunk into a "digital fingerprint" (embedding) using an AI model
   - Saves everything to the database

### 📚 How Are Documents Split into Chunks?

Imagine you have a long book. To make it easier to search:
- You divide it into pages of ~600 characters
- Each page overlaps with the previous one by ~50 characters (for smoothness)
- If there are paragraphs, they are respected as natural boundaries

### 🧠 What is an "Embedding" (Digital Fingerprint)?

This is like a unique code for each piece of text. If two pieces talk about similar things, their "fingerprints" will be mathematically close to each other.

## Step 3: The Search - When a Question Arrives

### 🔍 The Search Process

When a user asks something:

1. **The question becomes a "fingerprint"** - the same type of code as the documents
2. **Comparison with all records** - the system compares the question's "fingerprint" with all stored chunks
3. **Calculating similarity** - uses a mathematical formula (cosine similarity) to find how "close" each document is to the question
4. **Selecting the best ones** - takes the top 3 most suitable chunks

### 📊 How Does the Scoring Work?

- Each result gets a score from 0 to 1 (0% to 100% similarity)
- Results below 10% are discarded as irrelevant
- The rest are sorted from highest to lowest score

## Step 4: Assembling the Answer

### 🔧 Combining the Information

The system takes the best results and assembles them into one text:
```
[1] (85% relevance) Information about installing WASM-pack...
[2] (73% relevance) Project prerequisites...
[3] (62% relevance) Additional setup steps...
```

## Step 5: Performance Optimizations

### ⚡ Caching and Smart Updates

- **Change detection**: Before reindexing a file, the system checks if its content has changed (via hash)
- **Incremental updates**: Only new or changed files are processed again
- **Batch processing**: Files are processed in small groups to avoid overloading memory

### 🛡️ Error Handling

If something goes wrong:
1. **Fallback system** - the system tries a simpler search method
2. **Error logging** - all problems are recorded for debugging
3. **Graceful degradation** - even with errors, the user gets some response

## Step 6: Cleanup and Shutdown

When the program ends:
- The database is properly closed
- All resources are freed
- Files remain ready for the next startup

## Technical Details for the Curious

### 🔧 Technologies Used
- **HuggingFace Embedding Model**: `BAAI/bge-small-en-v1.5` - AI model for creating "fingerprints"
- **SQLite Database**: Fast, local database for storage
- **Cosine Similarity**: Mathematical formula for comparing similarity

### 📈 Performance
- First startup: ~2-5 seconds for document indexing
- Subsequent searches: ~100-500 milliseconds
- Memory is carefully managed with batch processing

## Conclusion

The RAG SQLite tool is like a smart librarian who:
1. Organizes all your documents in an easily searchable form
2. Understands your questions at a "conceptual" level
3. Finds the most relevant information lightning-fast
4. Provides context to the AI for more accurate answers

This allows the AI agent to answer specific questions about your project with current and accurate information, instead of trying to "guess" or use only general knowledge.
