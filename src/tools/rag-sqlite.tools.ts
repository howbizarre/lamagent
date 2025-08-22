import { tool } from 'llamaindex';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { basename, join } from 'path';
import Database from 'better-sqlite3';

// Глобална конфигурация за verbose режим
const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

function log(message: string) {
  if (isVerbose) {
    console.log(message);
  }
}

function logError(message: string, error?: any) {
  console.error(message, error || '');
}

class SQLiteVectorStore {
  private db: Database.Database;
  private embedModel: HuggingFaceEmbedding | null = null;

  constructor(dbPath: string = 'rag_cache.db') {
    this.db = new Database(dbPath);
    this.initializeDB();
  }

  private initializeDB() {
    // Създаваме таблицата за документите ако не съществува
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        file_name TEXT,
        file_path TEXT,
        file_type TEXT,
        chunk_index INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_hash TEXT
      );
    `);

    // Създаваме индекс за по-бързо търсене
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_hash ON documents(file_hash);
      CREATE INDEX IF NOT EXISTS idx_file_name ON documents(file_name);
    `);

    console.log('✅ SQLite база данни инициализирана');
  }

  /**
   * Gets or initializes the HuggingFace embedding model instance.
   * 
   * This method implements lazy initialization for the embedding model. If the model
   * hasn't been created yet, it initializes a new HuggingFaceEmbedding instance
   * using the BAAI/bge-small-en-v1.5 model (a smaller, more efficient model).
   * 
   * @returns A promise that resolves to the HuggingFaceEmbedding model instance
   * @private
   */
  private async getEmbeddingModel(): Promise<HuggingFaceEmbedding> {
    if (!this.embedModel) {
      log('🔄 Инициализиране на embedding модел...');

      this.embedModel = new HuggingFaceEmbedding({
        modelType: 'BAAI/bge-small-en-v1.5' // По-малък модел
      });
    }

    return this.embedModel;
  }

  /**
   * Generates a simple hash string from the provided content.
   * 
   * This method implements a basic hash algorithm to avoid crypto dependencies.
   * It uses a simple polynomial rolling hash function that processes each character
   * in the content string to generate a 32-bit integer hash value.
   * 
   * @param content - The string content to generate a hash for
   * @returns A hexadecimal string representation of the absolute hash value
   * 
   * @example
   * ```typescript
   * const hash = this.getFileHash("Hello World");
   * console.log(hash); // "4a17b156"
   * ```
   */
  private getFileHash(content: string): string {
    // Използваме прост hash алгоритъм за да избегнем crypto dependencies
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Преобразуваме в 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Splits a large text into smaller chunks for processing, with configurable size and overlap.
   * 
   * This method handles text chunking by first attempting to split on paragraph boundaries,
   * and falling back to character-based splitting if no paragraphs are found. It includes
   * safety limits to prevent memory issues with very large texts.
   * 
   * @param text - The input text to be chunked
   * @param chunkSize - The target size of each chunk in characters (default: 600)
   * @param overlap - The number of characters to overlap between consecutive chunks (default: 50)
   * 
   * @returns An array of text chunks, each trimmed and within the specified size limits
   * 
   * @remarks
   * - Automatically limits input text to 50,000 characters if larger than 100,000
   * - Filters out paragraphs shorter than 20 characters
   * - Individual chunks are limited to a maximum of 2,000 characters
   * - Maximum number of chunks is capped at 500 to prevent memory issues
   * - Falls back to simple character-based chunking if paragraph splitting fails
   * - Returns a fallback chunk if all processing fails
   * 
   * @example
   * ```typescript
   * const chunks = this.chunkText("Long text here...", 500, 25);
   * console.log(`Created ${chunks.length} chunks`);
   * ```
   */
  private chunkText(text: string, chunkSize: number = 600, overlap: number = 50): string[] {
    // По-малки chunks за по-малко памет
    const chunks: string[] = [];

    try {
      // Проверяваме размера на входния текст
      if (text.length > 100000) {
        log(`⚠️ Много голям текст: ${text.length} символа, ограничавам до 50000`);
        text = text.slice(0, 50000);
      }

      const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 20);

      // Ако няма параграфи, разделяме по размер
      if (paragraphs.length === 0) {
        let start = 0;

        while (start < text.length) {
          const end = Math.min(start + chunkSize, text.length);
          const chunk = text.slice(start, end).trim();

          if (chunk.length > 10 && chunk.length <= 2000) {
            // Максимален размер на chunk
            chunks.push(chunk);
          }

          start = end - overlap;

          if (start >= text.length) break;
          if (chunks.length > 500) break; // Максимален брой chunks
        }

        return chunks;
      }

      // Ако параграфът е къс, използваме го директно
      for (const paragraph of paragraphs) {
        if (paragraph.length <= chunkSize) {
          chunks.push(paragraph.trim());
        } else {
          // Разделяме дългите параграфи
          let start = 0;

          while (start < paragraph.length) {
            const end = Math.min(start + chunkSize, paragraph.length);
            const chunk = paragraph.slice(start, end).trim();

            if (chunk.length > 10 && chunk.length <= 2000) {
              // Максимален размер на chunk
              chunks.push(chunk);
            }

            start = end - overlap;

            if (start >= paragraph.length) break;
            if (chunks.length > 500) break; // Максимален брой chunks
          }
        }

        if (chunks.length > 500) break; // Максимален брой chunks
      }

      log(`📝 Създадени ${chunks.length} части от ${text.length} символа`);
      return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)]; // Fallback
    } catch (error) {
      logError('❌ Грешка при chunking:', error);
      // Простичък fallback
      return [text.slice(0, 1000)];
    }
  }

  /**
   * Generates a text embedding vector for the given input text.
   * 
   * @param text - The input text to generate an embedding for
   * @returns A promise that resolves to a numerical vector representing the text embedding
   * @throws Will throw an error if the embedding model cannot be retrieved or if embedding generation fails
   * 
   * @example
   * ```typescript
   * const embedding = await this.getEmbedding("Hello world");
   * console.log(embedding); // [0.1, 0.2, -0.3, ...]
   * ```
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const model = await this.getEmbeddingModel();
      const embedding = await model.getTextEmbedding(text);

      return embedding;
    } catch (error) {
      logError('❌ Грешка при генериране на embedding:', error);
      throw error;
    }
  }

  /**
   * Calculates the cosine similarity between two vectors.
   * 
   * Cosine similarity measures the cosine of the angle between two non-zero vectors
   * in an inner product space. It is a measure of orientation and not magnitude.
   * The result ranges from -1 to 1, where:
   * - 1 indicates vectors point in the same direction (identical orientation)
   * - 0 indicates vectors are orthogonal (perpendicular)
   * - -1 indicates vectors point in opposite directions
   * 
   * @param a - The first vector as an array of numbers
   * @param b - The second vector as an array of numbers
   * @returns The cosine similarity value between -1 and 1, or 0 if vectors have different lengths or zero magnitude
   * 
   * @example
   * ```typescript
   * const similarity = this.cosineSimilarity([1, 2, 3], [4, 5, 6]);
   * console.log(similarity); // 0.9746318461970762
   * ```
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Indexes a document by splitting it into chunks and storing them in the database with embeddings.
   * 
   * This method performs the following operations:
   * 1. Calculates a file hash to detect content changes
   * 2. Checks if the document is already indexed with the same content
   * 3. Removes existing records for the file if content has changed
   * 4. Splits the content into manageable chunks
   * 5. Processes chunks in batches to generate embeddings
   * 6. Stores each chunk with its embedding in the database
   * 
   * @param filePath - The absolute path to the file being indexed
   * @param content - The text content of the file to be indexed
   * @returns A promise that resolves when the indexing process is complete
   * 
   * @throws Will log errors for individual chunk processing failures but continues with remaining chunks
   * 
   * @example
   * ```typescript
   * await ragTool.indexDocument('/path/to/document.md', 'Document content here...');
   * ```
   */
  async indexDocument(filePath: string, content: string): Promise<void> {
    const fileHash = this.getFileHash(content);
    const fileName = basename(filePath);

    // Проверяваме дали файлът вече е индексиран
    const existing = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE file_path = ? AND file_hash = ?').get(filePath, fileHash) as { count: number };

    if (existing.count > 0) {
      console.log(`⏭️ Файлът ${fileName} вече е индексиран (няма промени)`);
      return;
    }

    // Изтриваме стари записи за този файл
    this.db.prepare('DELETE FROM documents WHERE file_path = ?').run(filePath);

    // Разделяме текста на chunks
    const chunks = this.chunkText(content);

    console.log(`📄 Индексиране на ${fileName}: ${chunks.length} части`);

    const insertStmt = this.db.prepare(`
      INSERT INTO documents (id, text, embedding, file_name, file_path, file_type, chunk_index, file_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Batch processing с по-малко chunks наведнъж
    const batchSize = 3; // Обработваме по 3 chunks наведнъж
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Обработка на batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const chunkIndex = i + j;
        const chunkId = `${filePath}_chunk_${chunkIndex}`;

        try {
          // Генерираме embedding за chunk-а
          const embedding = await this.getEmbedding(chunk);
          const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

          insertStmt.run(chunkId, chunk, embeddingBuffer, fileName, filePath, 'markdown', chunkIndex, fileHash);

          console.log(`✅ Chunk ${chunkIndex + 1}/${chunks.length} индексиран`);
        } catch (error) {
          console.error(`❌ Грешка при индексиране на chunk ${chunkIndex}:`, error);
        }
      }

      // Малка пауза между batches за освобождаване на памет
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ ${fileName} индексиран успешно`);
  }

  /**
   * Searches for documents similar to the given query using semantic similarity.
   * 
   * This method generates an embedding for the input query and compares it against
   * all stored document embeddings using cosine similarity. Results are filtered
   * to exclude very low relevance scores and sorted by similarity score in descending order.
   * 
   * @param query - The search query string to find similar documents for
   * @param topK - Maximum number of most similar documents to return (default: 3)
   * @returns Promise resolving to an array of similar documents with their similarity scores and metadata
   * 
   * @example
   * ```typescript
   * const results = await ragTool.searchSimilar("machine learning algorithms", 5);
   * console.log(results[0].text); // Most similar document text
   * console.log(results[0].score); // Similarity score (0-1)
   * console.log(results[0].metadata.file_name); // Source file name
   * ```
   * 
   * @remarks
   * - Only returns documents with similarity score > 0.1 to filter out irrelevant results
   * - Embedding comparison errors are logged and affected documents receive a score of 0
   * - Results are sorted by similarity score in descending order (highest first)
   * - Metadata includes file information and chunk index for document traceability
   */
  async searchSimilar(query: string, topK: number = 3): Promise<Array<{ text: string; score: number; metadata: any }>> {
    console.log(`🔍 Търсене на подобни документи за: "${query}"`);

    // Генерираме embedding за заявката
    const queryEmbedding = await this.getEmbedding(query);

    // Взимаме всички документи
    const documents = this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as Array<{
      id: string;
      text: string;
      embedding: Buffer;
      file_name: string;
      file_path: string;
      file_type: string;
      chunk_index: number;
    }>;

    console.log(`📊 Проверяване на ${documents.length} записа...`);

    // Изчисляваме similarity scores
    const results = documents
      .map((doc) => {
        try {
          const docEmbedding = Array.from(new Float32Array(doc.embedding.buffer));
          const score = this.cosineSimilarity(queryEmbedding, docEmbedding);

          return {
            text: doc.text,
            score,
            metadata: {
              file_name: doc.file_name,
              file_path: doc.file_path,
              file_type: doc.file_type,
              chunk_index: doc.chunk_index
            }
          };
        } catch (error) {
          console.error('❌ Грешка при изчисляване на similarity:', error);
          return {
            text: doc.text,
            score: 0,
            metadata: {
              file_name: doc.file_name,
              file_path: doc.file_path,
              file_type: doc.file_type,
              chunk_index: doc.chunk_index
            }
          };
        }
      })
      .filter((result) => result.score > 0.1); // Филтрираме много слабо релевантните

    // Сортираме по score и връщаме топ K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Retrieves statistical information about the RAG database.
   * 
   * @returns An object containing the total number of documents and the total number of unique files
   * @returns totalDocuments - The total count of all documents in the database
   * @returns totalFiles - The count of distinct file paths in the database
   */
  getStats(): { totalDocuments: number; totalFiles: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
    const files = this.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM documents').get() as { count: number };

    return {
      totalDocuments: total.count,
      totalFiles: files.count
    };
  }

  /**
   * Retrieves a list of all unique file paths that have been indexed in the database.
   * 
   * @returns An array of file paths (strings) representing all files that have been
   *          processed and stored in the documents table, sorted alphabetically by path.
   */
  getIndexedFiles(): string[] {
    const files = this.db.prepare('SELECT DISTINCT file_path FROM documents ORDER BY file_path').all() as Array<{ file_path: string }>;
    return files.map((f) => f.file_path);
  }

  /**
   * Checks for new and modified files in the specified documents directory.
   * 
   * This method scans the directory for markdown files and compares them against
   * the indexed files in the database to identify:
   * - New files that haven't been indexed yet
   * - Existing files that have been modified (based on content hash comparison)
   * 
   * @param docsDir - The directory path to scan for markdown files
   * @returns An object containing:
   *   - `newFiles`: Array of file paths that are new and not yet indexed
   *   - `changedFiles`: Array of file paths that exist in the index but have been modified
   *   - `allFiles`: Array of all markdown file paths found in the directory
   * 
   * @example
   * ```typescript
   * const result = checkForNewFiles('./docs');
   * console.log(`Found ${result.newFiles.length} new files`);
   * console.log(`Found ${result.changedFiles.length} changed files`);
   * ```
   */
  checkForNewFiles(docsDir: string): { newFiles: string[]; changedFiles: string[]; allFiles: string[] } {
    const markdownFiles = readdirSync(docsDir).filter((file) => file.endsWith('.md'));
    const allFiles = markdownFiles.map((file) => join(docsDir, file));
    const indexedFiles = this.getIndexedFiles();

    // Намираме нови файлове
    const newFiles = allFiles.filter((file) => !indexedFiles.includes(file));

    // Проверяваме за променени файлове
    const changedFiles: string[] = [];
    for (const filePath of indexedFiles) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        const currentHash = this.getFileHash(content);

        // Проверяваме дали hash-а е различен
        const stored = this.db.prepare('SELECT file_hash FROM documents WHERE file_path = ? LIMIT 1').get(filePath) as { file_hash: string } | undefined;

        if (stored && stored.file_hash !== currentHash) {
          changedFiles.push(filePath);
        }
      }
    }

    return { newFiles, changedFiles, allFiles };
  }

  /**
   * Forcefully refreshes the RAG (Retrieval-Augmented Generation) index by clearing all existing documents
   * and re-indexing all markdown files from the specified directory.
   * 
   * This method performs a complete rebuild of the document index:
   * 1. Validates that the documents directory exists
   * 2. Scans for all .md files in the directory
   * 3. Clears all existing document records from the database
   * 4. Re-indexes all found markdown files in parallel
   * 5. Logs progress and final statistics
   * 
   * @param docsDir - The directory path containing markdown files to index. Defaults to 'docs'
   * @throws {Error} When the specified directory does not exist
   * @returns A Promise that resolves when the index refresh is complete
   * 
   * @example
   * ```typescript
   * await ragTool.refreshIndex('documentation');
   * // Logs: ✅ Индексът е обновен: 25 документа от 10 файла
   * ```
   */
  async refreshIndex(docsDir: string = 'docs'): Promise<void> {
    // Форсирано обновяване на индекса
    log('🔄 Форсирано обновяване на RAG индекса...');

    if (!existsSync(docsDir)) {
      throw new Error(`Папка ${docsDir} не съществува`);
    }

    const markdownFiles = readdirSync(docsDir).filter((file) => file.endsWith('.md'));
    log(`📁 Намерени ${markdownFiles.length} markdown файла`);

    // Изтриваме всички стари записи
    this.db.prepare('DELETE FROM documents').run();
    log('🗑️ Изчистени стари записи');

    // Реиндексираме всички файлове
    const promises = markdownFiles.map(async (mdFile) => {
      const filePath = join(docsDir, mdFile);
      const content = readFileSync(filePath, 'utf-8');

      await this.indexDocument(filePath, content);
    });

    await Promise.all(promises);
    const stats = this.getStats();
    log(`✅ Индексът е обновен: ${stats.totalDocuments} документа от ${stats.totalFiles} файла`);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Глобална инстанция на vector store
let vectorStore: SQLiteVectorStore | null = null;

/**
 * Gets or creates a singleton vector store instance for document indexing and retrieval.
 * 
 * This function manages a SQLite-based vector store that automatically indexes documents
 * from a 'docs' directory. It performs incremental indexing by detecting new and modified
 * files since the last run.
 * 
 * @returns A promise that resolves to the SQLiteVectorStore instance
 * 
 * @remarks
 * The function performs the following operations:
 * - Creates a new vector store instance if one doesn't exist
 * - Scans the 'docs' directory for new and changed files
 * - Indexes new files and re-indexes modified files
 * - Adds a 200ms delay between file processing to manage memory usage
 * - Logs detailed statistics about the indexing process
 * 
 * @example
 * ```typescript
 * const vectorStore = await getOrCreateVectorStore();
 * const results = await vectorStore.search("query text");
 * ```
 */
async function getOrCreateVectorStore(): Promise<SQLiteVectorStore> {
  if (!vectorStore) {
    vectorStore = new SQLiteVectorStore();

    // Проверяваме дали има индексирани документи
    const stats = vectorStore.getStats();
    log(`📊 Текуща база данни: ${stats.totalDocuments} документа от ${stats.totalFiles} файла`);

    const docsDir = 'docs';
    if (existsSync(docsDir)) {
      // Проверяваме за нови и променени файлове
      const { newFiles, changedFiles, allFiles } = vectorStore.checkForNewFiles(docsDir);

      log(`📁 Намерени файлове: ${allFiles.length} общо`);
      if (newFiles.length > 0) {
        log(`🆕 Нови файлове за индексиране: ${newFiles.map((f) => basename(f)).join(', ')}`);
      }
      if (changedFiles.length > 0) {
        log(`� Променени файлове за реиндексиране: ${changedFiles.map((f) => basename(f)).join(', ')}`);
      }

      // Индексираме нови файлове
      for (const filePath of newFiles) {
        const content = readFileSync(filePath, 'utf-8');
        await vectorStore.indexDocument(filePath, content);

        // Малка пауза между файлове за освобождаване на памет
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Реиндексираме променени файлове
      for (const filePath of changedFiles) {
        const content = readFileSync(filePath, 'utf-8');
        log(`🔄 Реиндексиране на ${basename(filePath)} (открити промени)`);
        await vectorStore.indexDocument(filePath, content);

        // Малка пауза между файлове за освобождаване на памет
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (newFiles.length === 0 && changedFiles.length === 0 && stats.totalFiles > 0) {
        log('✅ Всички файлове са актуални');
      }

      // Показваме финалната статистика
      const finalStats = vectorStore.getStats();
      if (finalStats.totalFiles !== stats.totalFiles || finalStats.totalDocuments !== stats.totalDocuments) {
        log(`📊 Обновена база данни: ${finalStats.totalDocuments} документа от ${finalStats.totalFiles} файла`);
      }
    } else {
      logError('⚠️ Папка docs не съществува');
    }
  }

  return vectorStore;
}

/**
 * SQLite-based RAG (Retrieval-Augmented Generation) tool for fast documentation search.
 * 
 * This tool provides optimized search capabilities for AI agent and RAG system documentation
 * using a vector database with persistent embedding caching. It supports queries in both
 * Bulgarian and English and can answer questions about agent architecture, RAG implementation,
 * vector stores, document processing, and other technical details.
 * 
 * @features
 * - Vector-based similarity search with configurable result count
 * - Persistent embedding caching for improved performance on repeated queries
 * - Multilingual support (Bulgarian and English)
 * - Fallback mechanism to simple text search if vector search fails
 * - Performance monitoring with execution time and relevance score tracking
 * - Configurable relevance threshold filtering (default: 0.2)
 * 
 * @performance
 * - Significantly faster than non-cached approaches on repeated queries
 * - Returns top 3 most relevant results by default
 * - Filters results by relevance score to ensure quality
 * 
 * @fallback
 * If the primary vector search fails, the tool automatically falls back to:
 * 1. Simple text-based search in markdown files
 * 2. Keyword matching for installation and prerequisite queries
 * 3. Graceful error handling with informative messages
 * 
 * @param query - The search query string for documentation lookup
 * @returns Combined text from the most relevant documentation sections with relevance scores
 * 
 * @example
 * ```typescript
 * const result = await ragSQLiteTool.execute({ 
 *   query: "How to install wasm-pack prerequisites?" 
 * });
 * ```
 */
export const ragSQLiteTool = tool({
  name: 'ragSQLiteTool',
  description: 'Optimized SQLite RAG tool for fast search in AI agent and RAG system documentation. Uses vector database with persistent embedding caching for significantly faster performance on repeated queries. Can answer questions in both Bulgarian and English about agent architecture, RAG implementation, vector stores, document processing, and technical details.',
  parameters: z.object({
    query: z.string().describe('The search query for documentation lookup.')
  }),
  execute: async ({ query }: { query: string }) => {
    const startTime = Date.now();
    log(`📚 SQLite RAG Търсене: "${query}"`);

    try {
      const store = await getOrCreateVectorStore();
      const results = await store.searchSimilar(query, 3);

      if (results.length === 0) {
        log('🔍 Няма намерени релевантни резултати');
        return 'Не е намерена релевантна информация в документацията за тази заявка.';
      }

      // Комбинираме най-релевантните резултати
      const combinedText = results
        .filter((r) => r.score > 0.2) // По-нисък threshold за по-добро покритие
        .map((r, i) => {
          const scorePercent = Math.round(r.score * 100);
          return `[${i + 1}] (${scorePercent}% релевантност) ${r.text}`;
        })
        .join('\n\n');

      const duration = Date.now() - startTime;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

      log(`✅ Намерена информация: ${combinedText.length} символа за ${duration}ms`);
      log(`📊 Scores: ${results.map((r) => r.score.toFixed(3)).join(', ')} (avg: ${avgScore.toFixed(3)})`);

      return combinedText || 'Не е намерена достатъчно релевантна информация в документацията.';
    } catch (error) {
      logError('❌ Грешка в SQLite RAG:', error);

      // Fallback към по-прост подход
      log('🔄 Пробваме fallback подход...');
      try {
        const docsDir = 'docs';
        const markdownFiles = readdirSync(docsDir).filter((file) => file.endsWith('.md'));
        let allContent = '';

        for (const mdFile of markdownFiles) {
          const filePath = join(docsDir, mdFile);
          const content = readFileSync(filePath, 'utf-8');
          allContent += `\n\n=== ${mdFile} ===\n${content}`;
        }

        // Прост текстов search като fallback
        const lowerQuery = query.toLowerCase();
        const lowerContent = allContent.toLowerCase();

        if (lowerContent.includes('wasm-pack') || lowerContent.includes('prerequisite') || lowerContent.includes('install')) {
          const lines = allContent.split('\n');
          const relevantLines = lines.filter((line) => line.toLowerCase().includes('install') || line.toLowerCase().includes('prerequisite') || line.toLowerCase().includes('wasm-pack') || line.toLowerCase().includes('node.js') || line.toLowerCase().includes('rust'));

          return relevantLines.slice(0, 10).join('\n');
        }

        return 'Използван е fallback метод. Моля, рестартирайте агента за пълна функционалност.';
      } catch (fallbackError) {
        logError('❌ Fallback също неуспешен:', fallbackError);
        return 'Възникна грешка при търсенето в документацията.';
      }
    }
  }
});

// Cleanup function за затваряне на базата данни
process.on('exit', () => {
  if (vectorStore) {
    console.log('🔒 Затваряне на SQLite база данни...');
    vectorStore.close();
  }
});

process.on('SIGINT', () => {
  if (vectorStore) {
    console.log('🔒 Затваряне на SQLite база данни...');
    vectorStore.close();
  }
  process.exit(0);
});

// Експортиране на класа за външни нужди
export { SQLiteVectorStore };
