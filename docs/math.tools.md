# math.tools.ts — JSDoc API Documentation

## English

### Overview

This module exports four mathematical operation tools built with LlamaIndex's `tool()` function and Zod schema validation. Each tool accepts two numeric parameters via an object and returns the calculated result as a string. All tools include console logging for debugging purposes.

**Exported Tools:**
- `sumNumbers` — Addition operation
- `divideNumbers` — Division operation with zero-division protection  
- `multiplyNumbers` — Multiplication operation
- `subtractNumbers` — Subtraction operation

---

### sumNumbers

**Description:** A tool for adding two numbers together.

This tool provides addition functionality and should always be used when performing sum or addition operations. It accepts two numeric parameters and returns their sum as a string.

**Type Signature:**
```typescript
sumNumbers.execute({ a: number, b: number }): string
```

**Parameters:**
- `a` *(number)* — The first number to add
- `b` *(number)* — The second number to add

**Returns:** *(string)* — The sum of the two numbers as a string

**Example:**
```typescript
const result = sumNumbers.execute({ a: 5, b: 3 });
console.log(result); // "8"
```

---

### divideNumbers

**Description:** A tool for dividing one number by another with error handling for division by zero.

This tool should always be used when division operations are required. It includes built-in validation to prevent division by zero errors and returns results as strings.

**Type Signature:**
```typescript
divideNumbers.execute({ a: number, b: number }): string
```

**Parameters:**
- `a` *(number)* — The dividend (number to be divided)
- `b` *(number)* — The divisor (number to divide by)

**Returns:** *(string)* — The result of the division as a string, or an error message if division by zero is attempted

**Examples:**
```typescript
// Valid division
divideNumbers.execute({ a: 10, b: 2 }); // Returns "5"

// Division by zero
divideNumbers.execute({ a: 10, b: 0 }); // Returns "Error: Cannot divide by zero"
```

---

### multiplyNumbers

**Description:** A tool for multiplying two numbers together.

This tool provides a standardized way to perform multiplication operations with proper parameter validation and logging. It should always be used when multiplication is required.

**Type Signature:**
```typescript
multiplyNumbers.execute({ a: number, b: number }): string
```

**Parameters:**
- `a` *(number)* — The first number to multiply
- `b` *(number)* — The second number to multiply

**Returns:** *(string)* — The result of the multiplication as a string

**Example:**
```typescript
const result = multiplyNumbers.execute({ a: 5, b: 3 });
console.log(result); // "15"
```

---

### subtractNumbers

**Description:** A tool for performing subtraction operations between two numbers.

This tool subtracts the second number (subtrahend) from the first number (minuend) and returns the result as a string. It includes logging for debugging purposes.

**Type Signature:**
```typescript
subtractNumbers.execute({ a: number, b: number }): string
```

**Parameters:**
- `a` *(number)* — The minuend (number to subtract from)
- `b` *(number)* — The subtrahend (number to be subtracted)

**Returns:** *(string)* — The result of the subtraction as a string

**Example:**
```typescript
// Subtract 5 from 10
const result = subtractNumbers.execute({ a: 10, b: 5 });
console.log(result); // "5"
```

---

### Implementation Details

**Schema Validation:**
- All tools use `z.coerce.number()` for automatic type coercion and validation
- Parameters are validated at runtime before execution
- Invalid inputs will throw Zod validation errors

**Return Format:**
- All mathematical results are converted to strings using `.toString()`
- This ensures consistent output format across all tools
- Error messages are also returned as strings

**Logging:**
- Each tool logs its operation to console for debugging
- Format: `MATH Tool [OPERATION]: Calculating [operation] of [a] and [b]`


## Български (Bulgarian)

### Преглед

Този модул експортира четири инструмента за математически операции, построени с LlamaIndex `tool()` функцията и Zod схемна валидация. Всеки инструмент приема два числови параметъра чрез обект и връща изчисления резултат като низ. Всички инструменти включват конзолно логване за debugging.

**Експортирани инструменти:**
- `sumNumbers` — Операция събиране
- `divideNumbers` — Операция деление с защита от деление на нула
- `multiplyNumbers` — Операция умножение  
- `subtractNumbers` — Операция изваждане

---

### sumNumbers

**Описание:** Инструмент за събиране на две числа.

Този инструмент осигурява функционалност за събиране и винаги трябва да се използва при операции за сума или събиране. Приема два числови параметъра и връща тяхната сума като низ.

**Типова сигнатура:**
```typescript
sumNumbers.execute({ a: number, b: number }): string
```

**Параметри:**
- `a` *(number)* — Първото число за събиране
- `b` *(number)* — Второто число за събиране

**Връща:** *(string)* — Сумата на двете числа като низ

**Пример:**
```typescript
const result = sumNumbers.execute({ a: 5, b: 3 });
console.log(result); // "8"
```

---

### divideNumbers

**Описание:** Инструмент за деление на едно число на друго с обработка на грешки за деление на нула.

Този инструмент винаги трябва да се използва при операции за деление. Включва вградена валидация за предотвратяване на грешки при деление на нула и връща резултати като низове.

**Типова сигнатура:**
```typescript
divideNumbers.execute({ a: number, b: number }): string
```

**Параметри:**
- `a` *(number)* — Делимото (числото, което се дели)
- `b` *(number)* — Делителят (числото, на което се дели)

**Връща:** *(string)* — Резултатът от делението като низ, или съобщение за грешка при опит за деление на нула

**Примери:**
```typescript
// Валидно деление
divideNumbers.execute({ a: 10, b: 2 }); // Връща "5"

// Деление на нула
divideNumbers.execute({ a: 10, b: 0 }); // Връща "Error: Cannot divide by zero"
```

---

### multiplyNumbers

**Описание:** Инструмент за умножение на две числа.

Този инструмент осигурява стандартизиран начин за извършване на операции за умножение с правилна валидация на параметрите и логване. Винаги трябва да се използва при необходимост от умножение.

**Типова сигнатура:**
```typescript
multiplyNumbers.execute({ a: number, b: number }): string
```

**Параметри:**
- `a` *(number)* — Първото число за умножение
- `b` *(number)* — Второто число за умножение

**Връща:** *(string)* — Резултатът от умножението като низ

**Пример:**
```typescript
const result = multiplyNumbers.execute({ a: 5, b: 3 });
console.log(result); // "15"
```

---

### subtractNumbers

**Описание:** Инструмент за извършване на операции за изваждане между две числа.

Този инструмент изважда второто число (изваждане) от първото число (умаляемо) и връща резултата като низ. Включва логване за debugging цели.

**Типова сигнатура:**
```typescript
subtractNumbers.execute({ a: number, b: number }): string
```

**Параметри:**
- `a` *(number)* — Умаляемото (числото, от което се изважда)
- `b` *(number)* — Изваждането (числото, което се изважда)

**Връща:** *(string)* — Резултатът от изваждането като низ

**Пример:**
```typescript
// Изважда 5 от 10
const result = subtractNumbers.execute({ a: 10, b: 5 });
console.log(result); // "5"
```

---

### Детайли за имплементацията

**Схемна валидация:**
- Всички инструменти използват `z.coerce.number()` за автоматично преобразуване на типове и валидация
- Параметрите се валидират по време на изпълнение преди извършване
- Невалидни входове ще хвърлят Zod validation грешки

**Формат на връщане:**
- Всички математически резултати се преобразуват в низове с `.toString()`
- Това осигурява последователен изходен формат за всички инструменти
- Съобщенията за грешки също се връщат като низове

**Логване:**
- Всеки инструмент логва своята операция в конзолата за debugging
- Формат: `MATH Tool [ОПЕРАЦИЯ]: Calculating [операция] of [a] and [b]`
