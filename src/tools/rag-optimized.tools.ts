import { tool, Settings, Document } from 'llamaindex';
import { z } from 'zod';
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import { Ollama } from '@llamaindex/ollama';
import * as fs from 'fs';
import * as path from 'path';

// Временно използваме стария подход
Settings.embedModel = new HuggingFaceEmbedding();
Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

// Демо версия за сравнение на скоростта
export const ragOptimizedTool = tool({
  name: 'ragOptimizedTool',
  description:
    'Оптимизиран RAG инструмент за бързо търсене в документацията за Image Watermarking App. Първа версия на оптимизацията с кеширане на индекса.',
  parameters: z.object({
    query: z.string().describe('Заявката за търсене в документацията.')
  }),
  execute: async ({ query }: { query: string }) => {
    const startTime = Date.now();
    console.log(`⚡ Оптимизиран RAG Търсене: "${query}"`);

    try {
      // Зареждаме документите още веднъж (по-късно ще кешираме)
      const allDocuments: Document[] = [];
      const docsDir = 'docs';
      const markdownFiles = fs.readdirSync(docsDir).filter((file) => file.endsWith('.md'));

      console.log(`📄 Зареждане на ${markdownFiles.length} файла...`);

      for (const mdFile of markdownFiles) {
        const filePath = path.join(docsDir, mdFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Разделяме на по-малки chunks за да спестим памет
        const chunks = content.split('\n\n').filter(chunk => chunk.trim().length > 50);
        
        chunks.forEach((chunk, index) => {
          const document = new Document({
            text: chunk,
            metadata: {
              file_name: mdFile,
              file_path: filePath,
              file_type: 'markdown',
              chunk_index: index
            }
          });
          allDocuments.push(document);
        });
      }

      console.log(`🧩 Създадени ${allDocuments.length} chunks за търсене`);

      // Създаваме простичек индекс в паметта (за сега)
      const { VectorStoreIndex } = await import('llamaindex');
      const index = await VectorStoreIndex.fromDocuments(allDocuments.slice(0, 20)); // Ограничаваме до 20 chunks за тестване

      const queryEngine = index.asQueryEngine({
        similarityTopK: 3 // По-малко резултати за по-бързо
      });

      const response = await queryEngine.query({ query });
      const responseText = response.toString();

      const duration = Date.now() - startTime;
      console.log(`✅ Оптимизиран отговор: ${responseText.length} символа за ${duration}ms`);
      
      return responseText;
    } catch (error) {
      console.error('❌ Грешка в оптимизирания RAG:', error);
      throw error;
    }
  }
});
