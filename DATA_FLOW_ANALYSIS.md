# 문제/해설 데이터 흐름 분석

## Case 1: 문제/해설 모두 **텍스트**인 경우

### 1️⃣ Admin에서 저장 (app/admin/problems/page.tsx)

```typescript
// 사용자 입력
problemInputMode = 'text'
explanationInputMode = 'text'

// 저장되는 데이터
const problem: Problem = {
  id: "abc123",
  title: "삼각비 문제",
  content: "sin30° + cos60°의 값은?",           // ✅ 텍스트 그대로
  imageUrl: undefined,                          // ❌ 없음
  explanationText: "sin30°=1/2, cos60°=1/2이므로...", // ✅ 텍스트 그대로
  explanationImageUrl: undefined,               // ❌ 없음
  grade: "고1",
  unit: "삼각비",
  // ...
}

// localStorage 저장
localStorage.setItem('math_tutor_problems', JSON.stringify([problem]));
```

### 2️⃣ 학생 화면 로드 (app/components/MathTutorDiagnostic.tsx)

```typescript
// useEffect: 문제 로드
const parsed = JSON.parse(localStorage.getItem('math_tutor_problems'));

// 마이그레이션 로직
if (problem.explanationImageUrl && !problem.explanationText) {
  // ❌ 실행 안 됨 (explanationImageUrl이 없음)
}

// 문제 카드 표시
<div className="문제 카드">
  <h3>삼각비 문제</h3>
  <p>{problem.content}</p>  {/* "sin30° + cos60°의 값은?" */}
</div>

// 해설 카드 표시
<div className="해설 카드">
  {problem.explanationText && (
    <p>{problem.explanationText}</p>  {/* "sin30°=1/2, cos60°=1/2이므로..." */}
  )}
</div>
```

### 3️⃣ API 호출 시 (sendToGemini 함수)

```typescript
// args 준비
const args: GeminiArgs = {
  problem: "sin30° + cos60°의 값은?",          // ✅ content 그대로
  problemImage: undefined,                     // ❌ 없음
  explanationText: "sin30°=1/2, cos60°=1/2이므로...", // ✅ 그대로
  explanationImage: undefined,                 // ❌ 없음
  userMessage: "잘 모르겠어요",
  // ...
}

// userParts 구성 (app/components/MathTutorDiagnostic.tsx:350-410)
const textContent = `
### 문제
sin30° + cos60°의 값은?

### 해설
sin30°=1/2, cos60°=1/2이므로...

### 학생 응답
잘 모르겠어요
`;

const userParts = [
  { text: textContent }  // ✅ 텍스트만
];

// Gemini API 호출
POST /api/gemini
{
  systemPrompt: "...",
  userParts: [{ text: textContent }],
  generationConfig: { ... }
}
```

### 4️⃣ 호출 로그 표시

```typescript
// 로그 입력 데이터 준비 (app/components/MathTutorDiagnostic.tsx:814-839)
const problemDisplay = args.problemImage 
  ? args.problem  
  : args.problem;  // ✅ "sin30° + cos60°의 값은?"

let explanationDisplay: string | undefined;
if (args.explanationImage) {
  // ❌ 실행 안 됨
} else if (args.explanationText) {
  if (!args.explanationText.match(/\[이미지 해설:/)) {
    explanationDisplay = args.explanationText;  // ✅ "sin30°=1/2, cos60°=1/2이므로..."
  }
}

// 로그 저장
const logInput: ApiCallLog['input'] = {
  problem: "sin30° + cos60°의 값은?",
  problemImage: undefined,
  explanationImage: undefined,
  explanationText: "sin30°=1/2, cos60°=1/2이므로...",
  explanationDisplay: "sin30°=1/2, cos60°=1/2이므로...",  // ✅ 텍스트 그대로
  userMessage: "잘 모르겠어요",
  context: "...",
}

// 호출 로그 UI 표시
<div className="호출 로그">
  <div>
    <span>문제:</span>
    <div>{log.input.problem}</div>  {/* "sin30° + cos60°의 값은?" */}
  </div>
  {log.input.explanationDisplay && (
    <div>
      <span>해설:</span>
      <div>{log.input.explanationDisplay}</div>  {/* "sin30°=1/2, cos60°=1/2이므로..." */}
    </div>
  )}
</div>
```

---

## Case 2: 문제/해설 모두 **이미지**인 경우

### 1️⃣ Admin에서 저장 (app/admin/problems/page.tsx)

```typescript
// 사용자가 이미지 업로드
problemInputMode = 'image'
explanationInputMode = 'image'

// handleImageUpload 함수 실행
const handleImageUpload = (e, type) => {
  const file = e.target.files[0];  // "problem_14.webp", "explanation_14.webp"
  
  reader.onloadend = () => {
    const result = reader.result;  // "data:image/webp;base64,UklGRiQBAABXRUJQV..."
    
    if (type === 'problem') {
      setNewProblem(prev => ({
        ...prev,
        imageUrl: result,                              // ✅ Base64 데이터
        content: `[이미지 문제: ${file.name}]`        // ✅ "[이미지 문제: problem_14.webp]"
      }));
    } else {
      setNewProblem(prev => ({
        ...prev,
        explanationImageUrl: result,                   // ✅ Base64 데이터
        explanationText: `[이미지 해설: ${file.name}]` // ✅ "[이미지 해설: explanation_14.webp]"
      }));
    }
  };
  reader.readAsDataURL(file);
}

// 저장되는 데이터
const problem: Problem = {
  id: "xyz789",
  title: "2025 고1 6월 모의고사 14번",
  content: "[이미지 문제: problem_14.webp]",
  imageUrl: "data:image/webp;base64,UklGRiQBAABXRUJQV...",
  explanationText: "[이미지 해설: explanation_14.webp]",
  explanationImageUrl: "data:image/webp;base64,UklGRiQCAABXRUJQV...",
  grade: "고1",
  unit: "삼각비",
  // ...
}

// localStorage 저장
localStorage.setItem('math_tutor_problems', JSON.stringify([problem]));
```

### 2️⃣ 학생 화면 로드 (app/components/MathTutorDiagnostic.tsx)

```typescript
// useEffect: 문제 로드
const parsed = JSON.parse(localStorage.getItem('math_tutor_problems'));

// 마이그레이션 로직 (기존 데이터 대응)
const migratedProblems = parsed.map(problem => {
  if (problem.explanationImageUrl && !problem.explanationText) {
    // ❌ 실행 안 됨 (이미 explanationText 있음)
    return {
      ...problem,
      explanationText: `[이미지 해설: 문제${problem.id.substring(0, 8)}.webp]`
    };
  }
  return problem;  // ✅ 그대로 반환
});

// 문제 카드 표시
<div className="문제 카드">
  <h3>2025 고1 6월 모의고사 14번</h3>
  {problem.imageUrl && (
    <img 
      src={problem.imageUrl}  // "data:image/webp;base64,UklGRiQBAABX..."
      alt="문제 이미지" 
      className="max-h-[600px]"
    />
  )}
  {/* content는 표시 안 됨 (이미지가 있으므로) */}
</div>

// 해설 카드 표시
<div className="해설 카드">
  {problem.explanationImageUrl && (
    <img 
      src={problem.explanationImageUrl}  // "data:image/webp;base64,UklGRiQCAABX..."
      alt="해설 이미지" 
      className="max-h-[600px]"
    />
  )}
  {/* explanationText는 표시 안 됨 (이미지가 있으므로) */}
</div>
```

### 3️⃣ API 호출 시 (sendToGemini 함수)

```typescript
// args 준비
const args: GeminiArgs = {
  problem: "[이미지 문제: problem_14.webp]",    // ✅ content (파일명 포함)
  problemImage: "data:image/webp;base64,UklGRiQBAABX...", // ✅ Base64 데이터
  explanationText: "[이미지 해설: explanation_14.webp]",
  explanationImage: "data:image/webp;base64,UklGRiQCAABX...", // ✅ Base64 데이터
  userMessage: "잘 모르겠어요",
  // ...
}

// userParts 구성 (app/components/MathTutorDiagnostic.tsx:350-410)
const textContent = `
### 문제
[이미지로 제공됨]

### 해설
[이미지로 제공됨]

### 학생 응답
잘 모르겠어요
`;

const userParts = [
  { text: textContent },  // ✅ 텍스트 설명
  {
    inline_data: {
      mime_type: "image/webp",
      data: "UklGRiQBAABXRUJQV..."  // ✅ 문제 이미지 (Base64, prefix 제거)
    }
  },
  {
    inline_data: {
      mime_type: "image/webp",
      data: "UklGRiQCAABXRUJQV..."  // ✅ 해설 이미지 (Base64, prefix 제거)
    }
  }
];

// Gemini API 호출
POST /api/gemini
{
  systemPrompt: "...",
  userParts: [
    { text: textContent },
    { inline_data: { mime_type: "image/webp", data: "..." } },
    { inline_data: { mime_type: "image/webp", data: "..." } }
  ],
  generationConfig: { ... }
}
```

### 4️⃣ 호출 로그 표시

```typescript
// 로그 입력 데이터 준비 (app/components/MathTutorDiagnostic.tsx:814-839)
const problemDisplay = args.problemImage 
  ? args.problem  // ✅ "[이미지 문제: problem_14.webp]"
  : args.problem;

let explanationDisplay: string | undefined;
if (args.explanationImage) {
  // ✅ 실행됨 (explanationImage 있음)
  const explanationMatch = args.explanationText?.match(/\[이미지 해설:\s*([^\]]+)\]/);
  if (explanationMatch) {
    explanationDisplay = `[이미지 해설: ${explanationMatch[1]}]`;
    // ✅ "[이미지 해설: explanation_14.webp]"
  } else {
    explanationDisplay = '[이미지 해설]';  // ❌ 실행 안 됨 (match 성공)
  }
}

// 로그 저장
const logInput: ApiCallLog['input'] = {
  problem: "[이미지 문제: problem_14.webp]",
  problemImage: "data:image/webp;base64,UklGRiQBAABX...",
  explanationImage: "data:image/webp;base64,UklGRiQCAABX...",
  explanationText: "[이미지 해설: explanation_14.webp]",
  explanationDisplay: "[이미지 해설: explanation_14.webp]",  // ✅ 파일명
  userMessage: "잘 모르겠어요",
  context: "...",
}

// 호출 로그 UI 표시
<div className="호출 로그">
  <div>
    <span>문제:</span>
    <div>{log.input.problem}</div>  {/* "[이미지 문제: problem_14.webp]" */}
  </div>
  {log.input.explanationDisplay && (
    <div>
      <span>해설:</span>
      <div>{log.input.explanationDisplay}</div>  {/* "[이미지 해설: explanation_14.webp]" */}
    </div>
  )}
</div>
```

---

## 🔄 마이그레이션 로직 (기존 데이터 처리)

### 문제 상황
- **이전 버전**에서 저장된 문제들은 `explanationText`가 없을 수 있음
- `explanationImageUrl`만 있고 `explanationText`가 없는 경우

### 해결 방법 (app/components/MathTutorDiagnostic.tsx:667-684)

```typescript
const migratedProblems = parsed.map(problem => {
  if (problem.explanationImageUrl && !problem.explanationText) {
    // ✅ 자동으로 explanationText 생성
    return {
      ...problem,
      explanationText: `[이미지 해설: 문제${problem.id.substring(0, 8)}.webp]`
    };
  }
  return problem;
});

// localStorage에 자동 저장
if (migratedProblems.some((p, i) => p.explanationText !== parsed[i].explanationText)) {
  localStorage.setItem('math_tutor_problems', JSON.stringify(migratedProblems));
  console.log('✅ 기존 문제 explanationText 마이그레이션 완료');
}
```

**실행 시점:**
- 페이지 로드 시 자동 실행
- 한 번만 실행 (이후 데이터 저장됨)

**효과:**
- 기존 문제도 호출 로그에서 파일명 표시
- 문제/해설 파일명 구분 가능

---

## 📊 비교 요약

| 항목 | 텍스트 | 이미지 |
|------|--------|--------|
| **Admin 저장** | | |
| `content` | "sin30° + cos60°의 값은?" | "[이미지 문제: problem_14.webp]" |
| `imageUrl` | `undefined` | "data:image/webp;base64,..." |
| `explanationText` | "sin30°=1/2, cos60°=1/2이므로..." | "[이미지 해설: explanation_14.webp]" |
| `explanationImageUrl` | `undefined` | "data:image/webp;base64,..." |
| **학생 화면 표시** | | |
| 문제 | `<p>{content}</p>` | `<img src={imageUrl} />` |
| 해설 | `<p>{explanationText}</p>` | `<img src={explanationImageUrl} />` |
| **API 호출** | | |
| userParts | `[{ text: "..." }]` | `[{ text: "..." }, { inline_data: {...} }, { inline_data: {...} }]` |
| 문제 포함 방식 | 텍스트로 포함 | 텍스트 설명 + Base64 이미지 |
| 해설 포함 방식 | 텍스트로 포함 | 텍스트 설명 + Base64 이미지 |
| **호출 로그** | | |
| problem | "sin30° + cos60°의 값은?" | "[이미지 문제: problem_14.webp]" |
| explanationDisplay | "sin30°=1/2, cos60°=1/2이므로..." | "[이미지 해설: explanation_14.webp]" |

---

## 🐛 이전 버그 분석

### 버그 상황
```typescript
// ❌ 잘못된 로직 (수정 전)
if (args.explanationImage) {
  const explanationMatch = args.explanationText?.match(/\[이미지 해설:\s*([^\]]+)\]/);
  if (explanationMatch) {
    explanationDisplay = `[이미지 해설: ${explanationMatch[1]}]`;
  } else {
    // 🔴 버그: 문제 파일명을 fallback으로 사용
    const problemMatch = args.problem?.match(/\[이미지 문제:\s*([^\]]+)\]/);
    if (problemMatch) {
      explanationDisplay = `[이미지 해설: ${problemMatch[1]}]`;  // ❌ 문제 파일명 사용!
    }
  }
}
```

**결과:**
- 호출 로그에서 문제/해설 파일명이 동일하게 표시됨
- `explanationText`가 없는 기존 문제에서 발생

### 수정 후
```typescript
// ✅ 올바른 로직 (수정 후)
if (args.explanationImage) {
  const explanationMatch = args.explanationText?.match(/\[이미지 해설:\s*([^\]]+)\]/);
  if (explanationMatch) {
    explanationDisplay = `[이미지 해설: ${explanationMatch[1]}]`;
  } else {
    // ✅ 문제 파일명 사용하지 않음
    explanationDisplay = '[이미지 해설]';
  }
}

// + 마이그레이션 로직으로 기존 데이터 자동 수정
```

**효과:**
- 기존 문제: 페이지 로드 시 `explanationText` 자동 생성
- 호출 로그: 문제/해설 파일명 각각 다르게 표시
- 버그 완전 해결

