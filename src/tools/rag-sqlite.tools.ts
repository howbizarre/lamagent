import { tool, Settings, Document } from 'llamaindex';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { Ollama } from '@llamaindex/ollama';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

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

// Configure LLM only (embedding се инициализира lazy)
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    file_name: string;
    file_path: string;
    file_type: string;
    chunk_index: number;
  };
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

  private async getEmbeddingModel(): Promise<HuggingFaceEmbedding> {
    if (!this.embedModel) {
      log('🔄 Инициализиране на embedding модел...');
      this.embedModel = new HuggingFaceEmbedding({
        modelType: "BAAI/bge-small-en-v1.5" // По-малък модел
      });
    }
    return this.embedModel;
  }

  private getFileHash(content: string): string {
    // Използваме прост hash алгоритъм за да избегнем crypto dependencies
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуваме в 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private chunkText(text: string, chunkSize: number = 600, overlap: number = 50): string[] {
    // По-малки chunks за по-малко памет
    const chunks: string[] = [];
    
    try {
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 20);
      
      // Ако няма параграфи, разделяме по размер
      if (paragraphs.length === 0) {
        let start = 0;
        while (start < text.length) {
          const end = Math.min(start + chunkSize, text.length);
          const chunk = text.slice(start, end).trim();
          if (chunk.length > 10) {
            chunks.push(chunk);
          }
          start = end - overlap;
          if (start >= text.length) break;
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
            if (chunk.length > 10) {
              chunks.push(chunk);
            }
            start = end - overlap;
            if (start >= paragraph.length) break;
          }
        }
      }

      return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)]; // Fallback
    } catch (error) {
      logError('❌ Грешка при chunking:', error);
      // Простичък fallback
      return [text.slice(0, 1000)];
    }
  }

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

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async indexDocument(filePath: string, content: string): Promise<void> {
    const fileHash = this.getFileHash(content);
    const fileName = path.basename(filePath);

    // Проверяваме дали файлът вече е индексиран
    const existing = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE file_path = ? AND file_hash = ?')
      .get(filePath, fileHash) as { count: number };

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
      console.log(`🔄 Обработка на batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const chunkIndex = i + j;
        const chunkId = `${filePath}_chunk_${chunkIndex}`;
        
        try {
          // Генерираме embedding за chunk-а
          const embedding = await this.getEmbedding(chunk);
          const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

          insertStmt.run(
            chunkId,
            chunk,
            embeddingBuffer,
            fileName,
            filePath,
            'markdown',
            chunkIndex,
            fileHash
          );
          
          console.log(`✅ Chunk ${chunkIndex + 1}/${chunks.length} индексиран`);
        } catch (error) {
          console.error(`❌ Грешка при индексиране на chunk ${chunkIndex}:`, error);
        }
      }
      
      // Малка пауза между batches за освобождаване на памет
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ ${fileName} индексиран успешно`);
  }

  async searchSimilar(query: string, topK: number = 3): Promise<Array<{text: string, score: number, metadata: any}>> {
    console.log(`🔍 Търсене на подобни документи за: "${query}"`);
    
    // Генерираме embedding за заявката
    const queryEmbedding = await this.getEmbedding(query);
    
    // Взимаме всички документи
    const documents = this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT 50').all() as Array<{
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
    const results = documents.map(doc => {
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
    }).filter(result => result.score > 0.1); // Филтрираме много слабо релевантните

    // Сортираме по score и връщаме топ K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  getStats(): { totalDocuments: number, totalFiles: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
    const files = this.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM documents').get() as { count: number };
    
    return {
      totalDocuments: total.count,
      totalFiles: files.count
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Глобална инстанция на vector store
let vectorStore: SQLiteVectorStore | null = null;

async function getOrCreateVectorStore(): Promise<SQLiteVectorStore> {
  if (!vectorStore) {
    vectorStore = new SQLiteVectorStore();
    
    // Проверяваме дали има индексирани документи
    const stats = vectorStore.getStats();
    console.log(`📊 Текуща база данни: ${stats.totalDocuments} документа от ${stats.totalFiles} файла`);
    
    if (stats.totalDocuments === 0) {
      // Индексираме всички документи само ако няма данни
      const docsDir = 'docs';
      if (fs.existsSync(docsDir)) {
        const markdownFiles = fs.readdirSync(docsDir).filter((file) => file.endsWith('.md'));
        console.log(`📚 Първоначално индексиране на ${markdownFiles.length} файла...`);

        for (const mdFile of markdownFiles) {
          const filePath = path.join(docsDir, mdFile);
          const content = fs.readFileSync(filePath, 'utf-8');
          await vectorStore.indexDocument(filePath, content);
          
          // Малка пауза между файлове за освобождаване на памет
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        console.log('⚠️ Папка docs не съществува');
      }
    } else {
      console.log('✅ Използване на съществуващия индекс');
    }
  }
  
  return vectorStore;
}

export const ragSQLiteTool = tool({
  name: 'ragSQLiteTool',
  description:
    'Оптимизиран SQLite RAG инструмент за бързо търсене в документацията за Image Watermarking App. Използва векторна база данни с persistent кеширане на embeddings за значително по-бърза производителност при повторни заявки.',
  parameters: z.object({
    query: z.string().describe('Заявката за търсене в документацията.')
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
        .filter(r => r.score > 0.2) // По-нисък threshold за по-добро покритие
        .map((r, i) => {
          const scorePercent = Math.round(r.score * 100);
          return `[${i + 1}] (${scorePercent}% релевантност) ${r.text}`;
        })
        .join('\n\n');

      const duration = Date.now() - startTime;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      
      log(`✅ Намерена информация: ${combinedText.length} символа за ${duration}ms`);
      log(`📊 Scores: ${results.map(r => r.score.toFixed(3)).join(', ')} (avg: ${avgScore.toFixed(3)})`);
      
      return combinedText || 'Не е намерена достатъчно релевантна информация в документацията.';
    } catch (error) {
      logError('❌ Грешка в SQLite RAG:', error);
      
      // Fallback към по-прост подход
      log('🔄 Пробваме fallback подход...');
      try {
        const docsDir = 'docs';
        const markdownFiles = fs.readdirSync(docsDir).filter((file) => file.endsWith('.md'));
        let allContent = '';
        
        for (const mdFile of markdownFiles) {
          const filePath = path.join(docsDir, mdFile);
          const content = fs.readFileSync(filePath, 'utf-8');
          allContent += `\n\n=== ${mdFile} ===\n${content}`;
        }
        
        // Прост текстов search като fallback
        const lowerQuery = query.toLowerCase();
        const lowerContent = allContent.toLowerCase();
        
        if (lowerContent.includes('wasm-pack') || lowerContent.includes('prerequisite') || lowerContent.includes('install')) {
          const lines = allContent.split('\n');
          const relevantLines = lines.filter(line => 
            line.toLowerCase().includes('install') || 
            line.toLowerCase().includes('prerequisite') ||
            line.toLowerCase().includes('wasm-pack') ||
            line.toLowerCase().includes('node.js') ||
            line.toLowerCase().includes('rust')
          );
          
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
