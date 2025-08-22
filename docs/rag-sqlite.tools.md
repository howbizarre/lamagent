# rag-sqlite.tools.ts — JSDoc API Documentation

## English

### Overview

This module implements a comprehensive SQLite-backed vector store system for Retrieval-Augmented Generation (RAG). It provides document indexing, embedding caching, semantic search capabilities, and a high-level tool interface for AI agents to query documentation efficiently.

**Main Components:**
- `SQLiteVectorStore` — Core class managing SQLite database and vector operations
- `getOrCreateVectorStore()` — Singleton factory with incremental indexing
- `ragSQLiteTool` — LlamaIndex tool wrapper for agent integration

**Key Features:**
- Persistent embedding storage in SQLite database
- Incremental document indexing with hash-based change detection
- Semantic similarity search using cosine similarity
- Graceful fallback to text-based search
- Bilingual support (English/Bulgarian)
- Memory-efficient chunking with configurable parameters

---

### SQLiteVectorStore Class

#### Constructor
```typescript
constructor(dbPath: string = 'rag_cache.db')
```
Creates a new vector store instance and initializes the SQLite database with required tables and indexes.

#### Core Methods

##### getEmbeddingModel(): Promise\<HuggingFaceEmbedding\>
**Description:** Gets or initializes the HuggingFace embedding model instance.

This method implements lazy initialization for the embedding model. If the model hasn't been created yet, it initializes a new HuggingFaceEmbedding instance using the BAAI/bge-small-en-v1.5 model (a smaller, more efficient model).

**Returns:** A promise that resolves to the HuggingFaceEmbedding model instance
**Access:** Private

---

##### getFileHash(content: string): string
**Description:** Generates a simple hash string from the provided content.

This method implements a basic hash algorithm to avoid crypto dependencies. It uses a simple polynomial rolling hash function that processes each character in the content string to generate a 32-bit integer hash value.

**Parameters:**
- `content` *(string)* — The string content to generate a hash for

**Returns:** *(string)* — A hexadecimal string representation of the absolute hash value

**Example:**
```typescript
const hash = this.getFileHash("Hello World");
console.log(hash); // "4a17b156"
```

**Access:** Private

---

##### indexDocument(filePath: string, content: string): Promise\<void\>
**Description:** Indexes a document by splitting it into chunks and storing them in the database with embeddings.

This method performs the following operations:
1. Calculates a file hash to detect content changes
2. Checks if the document is already indexed with the same content
3. Removes existing records for the file if content has changed
4. Splits the content into manageable chunks
5. Processes chunks in batches to generate embeddings
6. Stores each chunk with its embedding in the database

**Parameters:**
- `filePath` *(string)* — The absolute path to the file being indexed
- `content` *(string)* — The text content of the file to be indexed

**Returns:** *(Promise\<void\>)* — A promise that resolves when the indexing process is complete

**Error Handling:** Will log errors for individual chunk processing failures but continues with remaining chunks

**Example:**
```typescript
await ragTool.indexDocument('/path/to/document.md', 'Document content here...');
```

**Access:** Public

---

##### searchSimilar(query: string, topK?: number): Promise\<SearchResult[]\>
**Description:** Searches for documents similar to the given query using semantic similarity.

This method generates an embedding for the input query and compares it against all stored document embeddings using cosine similarity. Results are filtered to exclude very low relevance scores and sorted by similarity score in descending order.

**Type Definition:**
```typescript
interface SearchResult {
  text: string;
  score: number;
  metadata: {
    file_name: string;
    file_path: string;
    chunk_index: number;
  };
}
```

**Parameters:**
- `query` *(string)* — The search query string to find similar documents for
- `topK` *(number)* — Maximum number of most similar documents to return (default: 3)

**Returns:** *(Promise\<SearchResult[]\>)* — Promise resolving to an array of similar documents with their similarity scores and metadata

**Behavior:**
- Only returns documents with similarity score > 0.1 to filter out irrelevant results
- Embedding comparison errors are logged and affected documents receive a score of 0
- Results are sorted by similarity score in descending order (highest first)
- Metadata includes file information and chunk index for document traceability

**Example:**
```typescript
const results = await ragTool.searchSimilar("machine learning algorithms", 5);
console.log(results[0].text); // Most similar document text
console.log(results[0].score); // Similarity score (0-1)
console.log(results[0].metadata.file_name); // Source file name
```

**Access:** Public

---

### ragSQLiteTool
**Description:** SQLite-based RAG (Retrieval-Augmented Generation) tool for fast documentation search.

This tool provides optimized search capabilities for AI agent and RAG system documentation using a vector database with persistent embedding caching. It supports queries in both Bulgarian and English and can answer questions about agent architecture, RAG implementation, vector stores, document processing, and other technical details.

**Tool Configuration:**
```typescript
{
  name: 'ragSQLiteTool',
  description: 'Optimized SQLite RAG tool for fast search...',
  parameters: z.object({
    query: z.string().describe('The search query for documentation lookup.')
  })
}
```

**Features:**
- Vector-based similarity search with configurable result count
- Persistent embedding caching for improved performance on repeated queries
- Multilingual support (Bulgarian and English)
- Fallback mechanism to simple text search if vector search fails
- Performance monitoring with execution time and relevance score tracking
- Configurable relevance threshold filtering (default: 0.2)

**Performance:**
- Significantly faster than non-cached approaches on repeated queries
- Returns top 3 most relevant results by default
- Filters results by relevance score to ensure quality

**Fallback Strategy:**
If the primary vector search fails, the tool automatically falls back to:
1. Simple text-based search in markdown files
2. Keyword matching for installation and prerequisite queries
3. Graceful error handling with informative messages

**Parameters:**
- `query` *(string)* — The search query string for documentation lookup

**Returns:** *(string)* — Combined text from the most relevant documentation sections with relevance scores

**Example:**
```typescript
const result = await ragSQLiteTool.execute({ 
  query: "How to install wasm-pack prerequisites?" 
});
```

## Български (Bulgarian)

### Преглед

Този модул реализира цялостна SQLite-базирана векторна система за съхранение за Retrieval-Augmented Generation (RAG). Осигурява индексиране на документи, кеширане на embedding-ове, възможности за семантично търсене и интерфейс на високо ниво за AI агенти за ефективно заявяване на документация.

**Основни компоненти:**
- `SQLiteVectorStore` — Основен клас за управление на SQLite база данни и векторни операции
- `getOrCreateVectorStore()` — Сингълтон фабрика с инкрементално индексиране
- `ragSQLiteTool` — LlamaIndex инструмент обвивка за интеграция с агенти

**Ключови функции:**
- Постоянно съхранение на embedding-ове в SQLite база данни
- Инкрементално индексиране на документи с детекция на промени базирана на hash
- Семантично търсене по подобие използвайки cosine similarity
- Graceful fallback към текстово търсене
- Двуезична поддръжка (английски/български)
- Ефективно по памет chunking с конфигурируеми параметри

---

### SQLiteVectorStore Клас

#### Конструктор
```typescript
constructor(dbPath: string = 'rag_cache.db')
```
Създава нова vector store инстанция и инициализира SQLite базата данни с необходимите таблици и индекси.

#### Основни методи

##### indexDocument(filePath: string, content: string): Promise\<void\>
**Описание:** Индексира документ като го разделя на части и ги съхранява в базата данни с embedding-ове.

Този метод извършва следните операции:
1. Изчислява файлов hash за детекция на промени в съдържанието
2. Проверява дали документът вече е индексиран със същото съдържание
3. Премахва съществуващи записи за файла ако съдържанието се е променило
4. Разделя съдържанието на управляеми части
5. Обработва частите в batches за генериране на embedding-ове
6. Съхранява всяка част с нейния embedding в базата данни

**Параметри:**
- `filePath` *(string)* — Абсолютният път към файла който се индексира
- `content` *(string)* — Текстовото съдържание на файла за индексиране

**Връща:** *(Promise\<void\>)* — Promise който се разрешава когато процесът на индексиране завърши

**Обработка на грешки:** Ще логва грешки за индивидуални неуспешни обработки на части но продължава с останалите части

**Пример:**
```typescript
await ragTool.indexDocument('/път/към/документ.md', 'Съдържание на документа тук...');
```

**Достъп:** Public

---

##### searchSimilar(query: string, topK?: number): Promise\<SearchResult[]\>
**Описание:** Търси документи подобни на дадената заявка използвайки семантично подобие.

Този метод генерира embedding за входната заявка и я сравнява срещу всички съхранени document embedding-ове използвайки cosine similarity. Резултатите се филтрират за изключване на много ниски релевантност scores и се сортират по similarity score в низходящ ред.

**Типова дефиниция:**
```typescript
interface SearchResult {
  text: string;
  score: number;
  metadata: {
    file_name: string;
    file_path: string;
    chunk_index: number;
  };
}
```

**Параметри:**
- `query` *(string)* — Низът заявка за намиране на подобни документи
- `topK` *(number)* — Максимален брой най-подобни документи за връщане (по подразбиране: 3)

**Връща:** *(Promise\<SearchResult[]\>)* — Promise разрешаващ се към масив от подобни документи с техните similarity scores и метаданни

**Поведение:**
- Връща само документи с similarity score > 0.1 за филтриране на нерелевантни резултати
- Грешки при сравнение на embedding-ове се логват и засегнатите документи получават score 0
- Резултатите се сортират по similarity score в низходящ ред (най-високи първи)
- Метаданните включват файлова информация и chunk индекс за проследимост на документите

**Пример:**
```typescript
const results = await ragTool.searchSimilar("алгоритми за машинно обучение", 5);
console.log(results[0].text); // Най-подобен документ текст
console.log(results[0].score); // Similarity score (0-1)
console.log(results[0].metadata.file_name); // Име на файла източник
```

**Достъп:** Public

---

### ragSQLiteTool
**Описание:** SQLite-базиран RAG (Retrieval-Augmented Generation) инструмент за бързо търсене в документация.

Този инструмент осигурява оптимизирани възможности за търсене за AI агент и RAG система документация използвайки векторна база данни с постоянно кеширане на embedding-ове. Поддържа заявки както на български, така и на английски език и може да отговаря на въпроси относно архитектура на агенти, RAG имплементация, векторни хранилища, обработка на документи и други технически детайли.

**Конфигурация на инструмента:**
```typescript
{
  name: 'ragSQLiteTool',
  description: 'Оптимизиран SQLite RAG инструмент за бързо търсене...',
  parameters: z.object({
    query: z.string().describe('Заявката за търсене за lookup в документацията.')
  })
}
```

**Функции:**
- Векторно търсене по подобие с конфигурируем брой резултати
- Постоянно кеширане на embedding-ове за подобрена производителност при повторни заявки
- Многоезична поддръжка (български и английски)
- Fallback механизъм към просто текстово търсене ако векторното търсене се провали
- Наблюдение на производителността с време за изпълнение и проследяване на релевантност score
- Конфигурируемо филтриране по праг на релевантност (по подразбиране: 0.2)

**Производителност:**
- Значително по-бързо от не-кеширани подходи при повторни заявки
- Връща топ 3 най-релевантни резултати по подразбиране
- Филтрира резултати по релевантност score за осигуряване на качество

**Fallback стратегия:**
Ако основното векторно търсене се провали, инструментът автоматично се връща към:
1. Просто текстово търсене в markdown файлове
2. Keyword matching за инсталация и prerequisite заявки
3. Graceful обработка на грешки с информативни съобщения

**Параметри:**
- `query` *(string)* — Низът заявка за търсене в документацията

**Връща:** *(string)* — Комбиниран текст от най-релевантните секции документация с релевантност scores

**Пример:**
```typescript
const result = await ragSQLiteTool.execute({ 
  query: "Как да инсталирам wasm-pack prerequisites?" 
});
```
