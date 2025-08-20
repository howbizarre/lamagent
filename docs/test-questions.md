# Контролни въпроси за тестване на AI Агента

Този файл съдържа набор от въпроси за тестване на функционалността на AI агента и неговата способност да чете и разбира документацията чрез RAG SQLite инструмента.

## Въпроси на български език

### 1. Архитектура на агента
**Въпрос:** Как работи главният файл agent.ts и какви са основните му стъпки при стартиране?

**Очакван отговор:** Трябва да обясни инициализацията на LLM, проверката на аргументи, зареждането на RAG инструмента и създаването на агента.

### 2. RAG функционалност
**Въпрос:** Какво прави RAG SQLite инструментът и как работи векторната база данни?

**Очакван отговор:** Трябва да обясни как се създават embeddings, как се съхраняват в SQLite база данни и как се извършва търсенето.

### 3. Индексиране на документи
**Въпрос:** Как се разделят документите на части (chunks) и защо се прави това?

**Очакван отговор:** Трябва да обясни chunking процеса, размера на частите (~600 символа), overlap-а и причините за разделянето.

### 4. Embedding модели
**Въпрос:** Кой embedding модел се използва и какво представлява "цифровият отпечатък" на текста?

**Очакван отговор:** Трябва да спомене BAAI/bge-small-en-v1.5 модела и да обясни концепцията за embeddings.

### 5. Търсене и similarity
**Въпрос:** Как работи cosine similarity и как агентът намира най-релевантните документи?

**Очакван отговор:** Трябва да обясни математическия процес на сравняване на векторите и избора на топ резултати.

## Въпроси на английски език

### 6. Agent Initialization
**Question:** What happens during the agent initialization process and what tools are loaded?

**Expected answer:** Should explain LLM initialization, tool loading (math tools and RAG SQLite tool), and agent configuration.

### 7. Database Operations
**Question:** How does the SQLite database store and manage document vectors?

**Expected answer:** Should describe table structure, indexing, and how embeddings are stored as BLOBs.

### 8. File Processing
**Question:** What file types are processed and how does the system handle file changes?

**Expected answer:** Should mention .md files, hash-based change detection, and reindexing process.

### 9. Memory Management
**Question:** How does the tool handle memory optimization and batch processing?

**Expected answer:** Should mention batch sizes, memory limits, and garbage collection strategies.

### 10. Search Performance
**Question:** What optimizations are implemented for faster search performance?

**Expected answer:** Should discuss persistent caching, SQLite indexing, and similarity threshold filtering.

## Комбинирани въпроси (двуезични)

### 11. Двуезично тестване
**Въпрос на български:** Обясни ми как да стартирам refresh-index режима.
**Question in English:** How do I start the refresh-index mode?

**Очакван отговор:** Трябва да отговори на същия език като въпроса и да обясни --refresh-index флага.

### 12. Технически детайли
**Question:** What are the technical specifications of the chunking algorithm?
**Въпрос:** Какви са техническите спецификации на алгоритъма за разделяне на текста?

**Очакван отговор:** Трябва да отговори на съответния език с детайли за chunk size, overlap и максимални ограничения.

## Инструкции за тестване

1. **Стартирайте агента:** `npm start`
2. **Задайте въпросите един по един**
3. **Проверете дали отговорите са точни** според документацията
4. **Тествайте двуезичната функционалност**
5. **Уверете се, че RAG инструментът се използва** за въпроси, изискващи документация

## Критерии за успешен тест

- ✅ Агентът отговаря на правилния език
- ✅ Информацията е точна според документацията
- ✅ RAG инструментът се активира автоматично
- ✅ Отговорите са структурирани и ясни
- ✅ Не се показват markdown тагове или излишно форматиране

## Забележки

- Ако някой въпрос не получи правилен отговор, проверете дали документацията е правилно индексирана
- При проблеми със similarity scores, помислете за обновяване на RAG индекса с `npm run refresh-index`
- Тествайте различни варианти на въпросите за да проверите робустността на системата
