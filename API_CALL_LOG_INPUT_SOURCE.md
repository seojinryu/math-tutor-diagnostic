# Gemini 호출 로그 인풋 데이터 출처

## 📍 인풋 항목 정의 위치

### 1. **인터페이스 정의** (`app/components/MathTutorDiagnostic.tsx:88-105`)

```typescript
export interface ApiCallLog {
  id: string;
  timestamp: string;
  input: {
    problem: string;                    // 문제 텍스트 또는 [이미지 문제: 파일명]
    problemImage?: string;              // 문제 이미지 URL (Base64)
    explanationImage?: string;          // 해설 이미지 URL (Base64)
    explanationText?: string;           // 해설 텍스트 또는 [이미지 해설: 파일명]
    explanationDisplay?: string;        // 해설 표시용 (이미지면 파일명, 텍스트면 내용)
    userMessage: string;                // 학생 메시지
    context: string;                    // 이전 대화 컨텍스트
    knowledgeElements?: Array<{         // 지식요소 목록 (선택)
      id: string;
      name: string;
      category: string;
      cognitiveLevel: string;
    }>;
  };
  prompt: { /* ... */ };
  output: { /* ... */ };
}
```

### 2. **인풋 데이터 생성 위치** (`app/components/MathTutorDiagnostic.tsx:766-865`)

## 🔄 데이터 흐름

### Step 1: `sendToGemini` 함수 호출

```typescript
// app/components/MathTutorDiagnostic.tsx:721
const sendToGemini = useCallback(async (userMessage: string) => {
  // userMessage: 학생이 입력한 메시지
  // currentProblem: 현재 선택된 문제 (useMemo로 계산됨)
  // contextText: 이전 대화 요약 (useMemo로 계산됨)
  
  // ...
}, [SYSTEM_PROMPT_JSON, activeConfig, currentProblem, contextText]);
```

### Step 2: `args` 객체 생성 (`app/components/MathTutorDiagnostic.tsx:766-809`)

```typescript
const args: GeminiArgs = {
  // ✅ 문제 관련 데이터 (currentProblem에서 가져옴)
  problem: currentProblem.content || '이미지 문제',
  // currentProblem.content:
  //   - 텍스트 문제: "cos(2x - 30°) = 1/2 일 때..."
  //   - 이미지 문제: "[이미지 문제: problem_14.webp]"
  
  problemImage: currentProblem.imageUrl,
  // currentProblem.imageUrl:
  //   - 이미지 문제: "data:image/webp;base64,UklGRiQBAABX..."
  //   - 텍스트 문제: undefined
  
  explanationImage: currentProblem.explanationImageUrl,
  // currentProblem.explanationImageUrl:
  //   - 이미지 해설: "data:image/webp;base64,UklGRiQCAABX..."
  //   - 텍스트 해설: undefined
  
  explanationText: currentProblem.explanationText,
  // currentProblem.explanationText:
  //   - 텍스트 해설: "15° < x < 60°에서 0° < 2x - 30° < 90°..."
  //   - 이미지 해설: "[이미지 해설: explanation_14.webp]"
  
  // ✅ 학생 메시지 (함수 파라미터)
  userMessage: userMessage,
  // 예: "모르겠어요"
  
  // ✅ 컨텍스트 (이전 대화 요약)
  context: contextText,
  // buildContext(messages) 함수로 생성됨
  // 이전 대화 요약 문자열
  
  // ✅ 지식요소 (currentProblem에서 가져옴, 조건부)
  knowledgeElements: hasKnowledgeElementsInSchema 
    ? currentProblem.knowledgeElements?.map(ke => ({
        id: ke.id,
        name: ke.name,
        category: ke.category,
        cognitiveLevel: ke.cognitiveLevel
      }))
    : undefined,
  // activeConfig.inputSchema에 knowledgeElements 필드가 있을 때만 포함
  
  // ... 기타 설정
};
```

### Step 3: 로그용 표시 데이터 준비 (`app/components/MathTutorDiagnostic.tsx:830-854`)

```typescript
// 문제 표시용
const problemDisplay = args.problemImage 
  ? args.problem  // 이미지면 "[이미지 문제: 파일명]"
  : args.problem; // 텍스트면 내용 그대로

// 해설 표시용
let explanationDisplay: string | undefined;
if (args.explanationImage) {
  // 이미지 해설: 파일명 추출
  const explanationMatch = args.explanationText?.match(/\[이미지 해설:\s*([^\]]+)\]/);
  if (explanationMatch) {
    explanationDisplay = `[이미지 해설: ${explanationMatch[1]}]`;
  } else {
    explanationDisplay = '[이미지 해설]';
  }
} else if (args.explanationText) {
  // 텍스트 해설: 내용 그대로
  if (!args.explanationText.match(/\[이미지 해설:/)) {
    explanationDisplay = args.explanationText;
  }
}
```

### Step 4: `logInput` 생성 (`app/components/MathTutorDiagnostic.tsx:856-865`)

```typescript
const logInput: ApiCallLog['input'] = {
  problem: problemDisplay,              // 위에서 준비한 표시용 문제
  problemImage: args.problemImage,       // Base64 이미지 URL
  explanationImage: args.explanationImage, // Base64 이미지 URL
  explanationText: args.explanationText,   // 원본 해설 텍스트
  explanationDisplay,                     // 위에서 준비한 표시용 해설
  userMessage: args.userMessage,          // 학생 메시지
  context: args.context,                  // 컨텍스트
  knowledgeElements: args.knowledgeElements // 지식요소 목록
};
```

### Step 5: 로그 저장 (`app/components/MathTutorDiagnostic.tsx:876-884`)

```typescript
const log: ApiCallLog = {
  id: logId,
  timestamp: logTimestamp,
  input: logInput,
  prompt: logPrompt,
  output: { parsedDiagnostic: diagnostic }
};

setApiCallLogs(prev => [log, ...prev].slice(0, 50)); // 최대 50개까지만 저장
```

## 📊 인풋 항목별 데이터 출처 요약

| 인풋 항목 | 데이터 출처 | 위치 | 설명 |
|----------|------------|------|------|
| **problem** | `currentProblem.content` | Line 793 | 문제 텍스트 또는 `[이미지 문제: 파일명]` |
| **problemImage** | `currentProblem.imageUrl` | Line 794 | Base64 이미지 URL (이미지 문제일 때) |
| **explanationImage** | `currentProblem.explanationImageUrl` | Line 795 | Base64 이미지 URL (이미지 해설일 때) |
| **explanationText** | `currentProblem.explanationText` | Line 796 | 해설 텍스트 또는 `[이미지 해설: 파일명]` |
| **userMessage** | `sendToGemini(userMessage)` 파라미터 | Line 797 | 학생이 입력한 메시지 |
| **context** | `contextText` (useMemo) | Line 798 | `buildContext(messages)`로 생성된 이전 대화 요약 |
| **knowledgeElements** | `currentProblem.knowledgeElements` | Line 800-807 | 문제에 연결된 지식요소 목록 (조건부) |

## 🔍 데이터 출처 상세

### 1. **currentProblem** (현재 선택된 문제)

```typescript
// app/components/MathTutorDiagnostic.tsx:639-641
const currentProblem = useMemo(() => {
  return problems.find(p => p.id === selectedProblemId);
}, [problems, selectedProblemId]);
```

**출처:**
- `problems`: localStorage에서 로드 (`math_tutor_problems`)
- `selectedProblemId`: 사용자가 선택한 문제 ID

**데이터 구조:**
```typescript
interface Problem {
  id: string;
  title: string;
  content: string;                    // → args.problem
  imageUrl?: string;                  // → args.problemImage
  explanationImageUrl?: string;       // → args.explanationImage
  explanationText?: string;           // → args.explanationText
  knowledgeElements?: Array<{...}>;   // → args.knowledgeElements
  // ...
}
```

### 2. **userMessage** (학생 메시지)

```typescript
// app/components/MathTutorDiagnostic.tsx:895-908
const handleSendMessage = async () => {
  if (!currentInput.trim()) return;
  
  const message = currentInput.trim();
  setCurrentInput(''); // 즉시 클리어
  
  // sendToGemini 호출
  await sendToGemini(message);  // ← userMessage
};
```

**출처:**
- `currentInput`: 학생이 입력 필드에 입력한 텍스트

### 3. **context** (컨텍스트)

```typescript
// app/components/MathTutorDiagnostic.tsx:709-719
const buildContext = (messages: Message[]): string => {
  if (messages.length === 0) return '';
  
  const recentMessages = messages.slice(-5); // 최근 5개 메시지
  return recentMessages
    .map(m => `${m.type === 'student' ? '학생' : 'AI'}: ${m.content}`)
    .join('\n');
};

const contextText = useMemo(() => buildContext(messages), [messages]);
```

**출처:**
- `messages`: 현재 대화 히스토리 (`Message[]`)
- 최근 5개 메시지를 요약하여 문자열로 변환

### 4. **knowledgeElements** (지식요소)

```typescript
// app/components/MathTutorDiagnostic.tsx:749-750
const hasKnowledgeElementsInSchema = 
  activeConfig.inputSchema?.properties?.knowledgeElements !== undefined;

// Line 800-807
knowledgeElements: hasKnowledgeElementsInSchema 
  ? currentProblem.knowledgeElements?.map(ke => ({
      id: ke.id,
      name: ke.name,
      category: ke.category,
      cognitiveLevel: ke.cognitiveLevel
    }))
  : undefined,
```

**조건:**
- 활성 LLM 설정의 `inputSchema`에 `knowledgeElements` 필드가 정의되어 있을 때만 포함
- `currentProblem.knowledgeElements`가 존재할 때만 포함

**출처:**
- `currentProblem.knowledgeElements`: 문제에 연결된 지식요소 목록
- Admin > 문제 관리에서 등록한 지식요소

## 📝 호출 로그 UI 표시 (`app/components/MathTutorDiagnostic.tsx:1664-1704`)

```typescript
{/* 인풋 */}
<div>
  <div className="text-xs font-semibold text-gray-900 mb-2">인풋</div>
  <div className="bg-blue-50 rounded p-3 text-xs space-y-2">
    {/* 문제 */}
    <div>
      <span className="font-medium text-gray-700">문제:</span>
      {log.input.problemImage ? (
        <img src={log.input.problemImage} alt="문제 이미지" />
      ) : (
        <div>{log.input.problem}</div>
      )}
    </div>
    
    {/* 학생 메시지 */}
    {log.input.userMessage && (
      <div>
        <span className="font-medium text-gray-700">학생 메시지:</span>
        <div>{log.input.userMessage}</div>
      </div>
    )}
    
    {/* 해설 */}
    {(log.input.explanationDisplay || log.input.explanationImage) && (
      <div>
        <span className="font-medium text-gray-700">해설:</span>
        {log.input.explanationImage ? (
          <img src={log.input.explanationImage} alt="해설 이미지" />
        ) : (
          <div>{log.input.explanationDisplay}</div>
        )}
      </div>
    )}
    
    {/* 지식요소 */}
    {log.input.knowledgeElements && log.input.knowledgeElements.length > 0 && (
      <div>
        <span className="font-medium text-gray-700">지식요소:</span>
        <div>
          {log.input.knowledgeElements.map((ke, idx) => (
            <div key={idx}>
              - {ke.name} ({ke.category}, {ke.cognitiveLevel})
            </div>
          ))}
        </div>
      </div>
    )}
    
    {/* 컨텍스트 */}
    {log.input.context && (
      <div>
        <span className="font-medium text-gray-700">컨텍스트:</span>
        <div>{log.input.context}</div>
      </div>
    )}
  </div>
</div>
```

## 🎯 요약

**호출 로그의 인풋 데이터는 `sendToGemini` 함수 내에서 생성됩니다:**

1. **문제 데이터**: `currentProblem` (localStorage에서 로드)
2. **학생 메시지**: `handleSendMessage`에서 전달받은 `userMessage`
3. **컨텍스트**: `buildContext(messages)`로 생성된 이전 대화 요약
4. **지식요소**: `currentProblem.knowledgeElements` (조건부)
5. **표시 데이터**: `problemDisplay`, `explanationDisplay` (로그 표시용으로 가공)

**모든 데이터는 `app/components/MathTutorDiagnostic.tsx`의 `sendToGemini` 함수에서 수집되고 가공되어 `ApiCallLog` 객체로 저장됩니다.**

