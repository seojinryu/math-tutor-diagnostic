# 수학 AI 튜터 진단 시스템 - 전체 코드 요약 및 플로우

**작성일**: 2025년 11월 4일  
**프로젝트**: math-tutor-diagnostic  
**배포**: Vercel (https://math-tutor-diagnostic.vercel.app/)

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [아키텍처 구조](#아키텍처-구조)
4. [핵심 데이터 구조](#핵심-데이터-구조)
5. [전체 데이터 플로우](#전체-데이터-플로우)
6. [주요 컴포넌트 상세](#주요-컴포넌트-상세)
7. [LocalStorage 사용](#localstorage-사용)
8. [API 통신 플로우](#api-통신-플로우)
9. [보안 설계](#보안-설계)
10. [현재 상태 및 이슈](#현재-상태-및-이슈)

---

## 시스템 개요

### 목적
- 폴리아(Polya) 4단계 문제해결 접근법 기반 수학 학습 진단 시스템
- 지식요소(Knowledge Element) 단위 세밀한 학습 상태 분석
- AI 기반 맞춤형 피드백 및 후속 질문 제시

### 주요 기능
1. **Admin 페이지**
   - 문제 관리 (CRUD)
   - 지식요소 관리 및 문제-지식요소 매핑
   - AI 연동 설정 (프롬프트, 스키마, 모델 파라미터)

2. **학생 화면 (수업 화면)**
   - 문제 선택 및 풀이
   - AI와 대화형 학습
   - 실시간 진단 결과 확인
   - 지식요소별 숙련도 리포트

---

## 기술 스택

```
Frontend:
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide React Icons

Backend:
- Next.js API Routes (Server-side Proxy)
- Vercel Serverless Functions

AI:
- Google Gemini 2.5 Pro API
- JSON Mode (Structured Output)

Data Storage:
- LocalStorage (Client-side)
  - 문제 데이터
  - AI 연동 설정
  - 학습 세션 상태

Deployment:
- Vercel
- Environment Variables (GEMINI_API_KEY)
```

---

## 아키텍처 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────┐           ┌──────────────────┐       │
│  │  Admin Pages     │           │  Student View    │       │
│  │  (/admin)        │           │  (/)             │       │
│  │                  │           │                  │       │
│  │  • 문제 관리     │◄─────────►│ MathTutor        │       │
│  │  • AI 연동 설정  │ LocalStorage  Diagnostic   │       │
│  └──────────────────┘           └────────┬─────────┘       │
│                                           │                 │
│                                           │ POST /api/gemini│
└───────────────────────────────────────────┼─────────────────┘
                                            │
                    ┌───────────────────────▼──────────────────┐
                    │  Next.js Server (Vercel)                 │
                    │                                           │
                    │  /api/gemini/route.ts                    │
                    │  • API Key 관리 (env)                    │
                    │  • Request 검증                          │
                    │  • Proxy to Gemini API                   │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼──────────────────────┐
                    │  Google Gemini API                       │
                    │  generativelanguage.googleapis.com       │
                    │                                           │
                    │  • gemini-2.5-pro                        │
                    │  • JSON Mode (application/json)          │
                    │  • Structured Output with Schema         │
                    └──────────────────────────────────────────┘
```

---

## 핵심 데이터 구조

### 1. Problem (문제)
```typescript
interface Problem {
  id: string;
  title: string;
  content: string;                    // 텍스트 문제 or [이미지 문제: filename]
  imageUrl?: string;                  // Base64 이미지 (문제)
  explanationImageUrl?: string;       // Base64 이미지 (해설)
  explanationText?: string;           // 텍스트 해설 or [이미지 해설: filename]
  grade?: string;                     // 학년
  unit?: string;                      // 단원 (태그명)
  notes?: string;                     // 비고
  knowledgeElements?: KnowledgeElement[]; // 관련 지식요소
  keMaps?: ProblemKEMap[];           // 문제-지식요소 매핑
  createdAt: string;
  updatedAt: string;
}
```

### 2. KnowledgeElement (지식요소)
```typescript
interface KnowledgeElement {
  id: string;
  name: string;                       // 지식요소 이름
  category: 'concept' | 'principle' | 'procedure' | 'integration';
  description: string;                // 설명
  source: string;                     // 출처 (성취기준)
  cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'synthesize' | 'evaluate';
  prereqIds?: string[];              // 선행 지식요소
  exampleQuestions?: string[];       // 예시 문항
}
```

### 3. ProblemKEMap (문제-지식요소 매핑)
```typescript
interface ProblemKEMap {
  problemId: string;
  keId: string;
  weight: number;                    // 가중치 (0~1)
  requiredLevel: number;             // 요구 숙련도 (1~4)
  evidenceRules: {
    correctAnswer?: string[];        // 정답 패턴 키워드
    intermediateSteps?: string[];    // 중간 과정 키워드
    errorPatterns?: string[];        // 오류 패턴 키워드
  };
}
```

### 4. LLMConfig (AI 연동 설정)
```typescript
interface LLMConfig {
  id: string;
  name: string;                      // 설정 이름
  description?: string;              // 설명
  version: string;                   // 버전
  systemPrompt: string;              // 시스템 프롬프트
  userPrompt?: string;               // 유저 프롬프트 템플릿
  inputSchema: object;               // 입력 스키마 (JSON Schema)
  outputSchema: object;              // 출력 스키마 (Gemini format)
  responseMimeType: string;          // 'application/json'
  provider: string;                  // 'gemini'
  model: string;                     // 'gemini-2.5-pro'
  temperature: number;               // 0~2
  maxOutputTokens: number;           // 최대 출력 토큰
  thinkingBudget: number;            // 사고 예산 (토큰)
  createdAt: string;
  updatedAt: string;
  isActive: boolean;                 // 활성화 여부
}
```

### 5. DiagnosticData (진단 결과)
```typescript
interface DiagnosticData {
  diagnosis: {
    problem_understanding: 'low' | 'medium' | 'high';
    concept_knowledge: 'low' | 'medium' | 'high';
    error_pattern: 'none' | 'calculation_error' | 'logical_error' | 
                   'concept_confusion' | 'approach_error';
    confidence_level: 'low' | 'medium' | 'high';
  };
  knowledge_diagnosis: {
    elements: Array<{
      ke_id: string;
      mastery: 'low' | 'medium' | 'high';
      evidence: string;              // 판단 근거
      cognitive_level: string;
      next_action: string;           // 보강 행동 제안
    }>;
    overall_mastery_score: number;   // 전체 숙련도 (0~100)
    uncertainty: 'low' | 'medium' | 'high';
  };
  recommended_stage: '1' | '2' | '3' | '4'; // 폴리아 단계
  stage_reason: string;
  next_question: string;             // AI 후속 질문
  micro_assessments?: Array<{        // 마이크로 평가
    ke_id: string;
    prompt: string;
  }>;
  feedback_completed: boolean;
}
```

---

## 전체 데이터 플로우

### Phase 1: 설정 및 준비 (Admin)

```
1. [Admin] AI 연동 탭
   ├─ LLM 설정 추가/수정
   │  ├─ 시스템 프롬프트 작성
   │  ├─ 입력/출력 스키마 정의
   │  └─ 모델 파라미터 설정
   └─ LocalStorage 저장
      └─ Key: 'math_tutor_llm_configs'

2. [Admin] 문제 탭
   ├─ 문제 추가/수정
   │  ├─ 문제 내용 (텍스트 or 이미지)
   │  ├─ 해설 (텍스트 or 이미지)
   │  ├─ 지식요소 관리
   │  │  ├─ 지식요소 생성/편집
   │  │  └─ 문제-지식요소 매핑 (weight, evidenceRules)
   │  └─ 메타 정보 (학년, 단원, 비고)
   └─ LocalStorage 저장
      └─ Key: 'math_tutor_problems'
```

### Phase 2: 학습 세션 시작 (Student View)

```
1. 페이지 로드
   └─ useEffect 실행
      ├─ LocalStorage에서 LLM 설정 로드
      │  ├─ 'math_tutor_llm_configs' 읽기
      │  ├─ 'math_tutor_active_llm_config_id' 확인
      │  └─ 활성 설정 적용
      │     ├─ customPrompt
      │     ├─ inputSchema / outputSchema
      │     ├─ model, temperature, maxOutputTokens
      │     └─ thinkingBudget, responseMimeType
      │
      └─ LocalStorage에서 문제 목록 로드
         └─ 'math_tutor_problems' 읽기

2. 문제 선택
   └─ 사용자가 문제 선택 버튼 클릭
      ├─ selectedProblemId 상태 업데이트
      └─ currentProblem 계산 (useMemo)
         └─ knowledgeElements, keMaps 포함
```

### Phase 3: AI 대화 및 진단 (Core Flow)

```
1. 학생 메시지 입력
   └─ handleSendMessage()
      ├─ 입력 필드 즉시 클리어
      ├─ 메시지 상태 추가 (type: 'student')
      └─ sendToGemini() 호출

2. API 호출 준비 (sendToGemini)
   ├─ 유효성 검사
   │  ├─ SYSTEM_PROMPT_JSON 확인
   │  ├─ model, temperature, maxOutputTokens 확인
   │  └─ thinkingBudget, responseMimeType 확인
   │
   ├─ 입력 데이터 구성
   │  ├─ 문제 정보
   │  │  ├─ 텍스트: content
   │  │  └─ 이미지: imageUrl (Base64)
   │  │
   │  ├─ 해설 정보
   │  │  ├─ 텍스트: explanationText
   │  │  └─ 이미지: explanationImageUrl (Base64)
   │  │
   │  ├─ 지식요소 (inputSchema에 정의된 경우)
   │  │  └─ knowledgeElements 배열
   │  │     ├─ id, name
   │  │     ├─ category
   │  │     └─ cognitiveLevel
   │  │
   │  ├─ 학생 메시지: userMessage
   │  └─ 컨텍스트: 이전 대화 요약
   │
   └─ API 호출 로그 생성
      └─ apiCallLogs 상태 업데이트

3. 서버 API 호출 (callGemini)
   └─ POST /api/gemini
      ├─ Body 구성
      │  ├─ model: 'gemini-2.5-pro'
      │  ├─ systemPrompt: SYSTEM_PROMPT_JSON
      │  ├─ userParts: [{ text }, { inline_data }]
      │  └─ generationConfig:
      │     ├─ temperature
      │     ├─ maxOutputTokens
      │     ├─ responseMimeType: 'application/json'
      │     ├─ responseSchema (if provided)
      │     └─ thinkingBudget
      │
      ├─ Retry Logic (429 Rate Limit)
      │  ├─ Exponential Backoff
      │  └─ 최대 3회 재시도
      │
      └─ 에러 처리
         ├─ 서버 오류 파싱
         ├─ 네트워크 오류 감지
         └─ 상세 에러 메시지 제공

4. 서버 사이드 처리 (/api/gemini/route.ts)
   ├─ 환경 변수에서 API Key 읽기
   │  └─ process.env.GEMINI_API_KEY
   │
   ├─ Gemini API 호출
   │  └─ POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
   │     └─ Body:
   │        ├─ systemInstruction: { parts: [{ text: systemPrompt }] }
   │        ├─ contents: [{ role: 'user', parts: userParts }]
   │        └─ generationConfig
   │
   └─ 응답 반환
      ├─ 성공: Gemini 응답 JSON
      └─ 실패: 에러 상세 정보

5. 응답 처리 (callGemini)
   ├─ JSON 응답 파싱
   │  └─ candidates[0].content.parts[0].text
   │
   ├─ 중첩 JSON 파싱
   │  └─ 코드블록 제거 (```json...```)
   │
   ├─ DiagnosticData 검증
   │  ├─ diagnosis 객체 확인
   │  ├─ knowledge_diagnosis 확인
   │  ├─ recommended_stage 확인
   │  └─ 필수 필드 검증
   │
   └─ 반환
      └─ DiagnosticData

6. 응답 표시 (sendToGemini)
   └─ 메시지 추가
      ├─ type: 'ai'
      ├─ content: next_question
      ├─ diagnostic: DiagnosticData
      └─ rawResponse: 원본 JSON

7. UI 업데이트
   ├─ 채팅 메시지 표시
   │  ├─ AI 후속 질문
   │  └─ 진단내용 보기 (펼치기)
   │     ├─ 문제 이해도
   │     ├─ 개념 지식
   │     ├─ 오류 패턴
   │     └─ 자신감
   │
   ├─ 진단 상태 카드
   │  └─ 지식요소 진단 리포트
   │     ├─ 전체 숙련도 점수
   │     ├─ 불확실성
   │     └─ 지식요소별 상세
   │        ├─ 문제-KE 매핑 정보
   │        │  ├─ 가중치
   │        │  └─ 요구 레벨
   │        ├─ 숙련도 (low/medium/high)
   │        ├─ 판단 근거 (evidence)
   │        ├─ 보강 행동 (next_action)
   │        └─ KE 태그 (카테고리, 인지수준)
   │
   └─ 호출 로그 탭
      └─ 인풋, 프롬프트, 아웃풋 상세
```

---

## 주요 컴포넌트 상세

### 1. `/app/components/MathTutorDiagnostic.tsx` (학생 화면)

**핵심 State**
```typescript
// LLM 설정 관련 (Admin에서 로드)
const [customPrompt, setCustomPrompt] = useState<string | null>(null);
const [inputSchema, setInputSchema] = useState<object | null>(null);
const [outputSchema, setOutputSchema] = useState<object | null>(null);
const [model, setModel] = useState<string | null>(null);
const [temperature, setTemperature] = useState<number | null>(null);
const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(null);
const [thinkingBudget, setThinkingBudget] = useState<number | null>(null);
const [responseMimeType, setResponseMimeType] = useState<string | null>(null);

// 문제 및 세션 관련
const [problems, setProblems] = useState<Problem[]>([]);
const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [currentInput, setCurrentInput] = useState('');
const [isLoading, setIsLoading] = useState(false);

// API 호출 로그
const [apiCallLogs, setApiCallLogs] = useState<ApiCallLog[]>([]);
const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
```

**핵심 함수**
```typescript
// 1. 설정 로드
useEffect(() => {
  const loadActiveConfig = () => {
    const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
    const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');
    // ... 파싱 및 설정 적용
  };
  loadActiveConfig();
}, []);

// 2. 메시지 전송
const handleSendMessage = async () => {
  // 입력 즉시 클리어
  setCurrentInput('');
  
  // 메시지 추가
  setMessages(prev => [...prev, studentMessage]);
  
  // API 호출
  await sendToGemini({ ... });
};

// 3. Gemini API 호출 (내부적으로 callGemini 사용)
const sendToGemini = useCallback(async (args: GeminiArgs) => {
  // 유효성 검사
  if (!SYSTEM_PROMPT_JSON) throw new Error('시스템 프롬프트가 설정되지 않았습니다.');
  if (!model) throw new Error('모델이 설정되지 않았습니다.');
  // ... 기타 검사
  
  // 입력 데이터 준비
  const textContent = buildTextContent(args);
  const userParts = buildUserParts(args);
  
  // API 호출 로그 저장
  setApiCallLogs(prev => [...prev, logEntry]);
  
  // callGemini 호출
  const diagnosticData = await callGemini({ ... });
  
  // 응답 메시지 추가
  setMessages(prev => [...prev, aiMessage]);
}, [SYSTEM_PROMPT_JSON, model, temperature, ...]);

// 4. Server API 호출 (Retry Logic 포함)
async function callGemini(args: GeminiArgs): Promise<DiagnosticData> {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        body: JSON.stringify({ model, systemPrompt, userParts, generationConfig })
      });
      
      // 429 Rate Limit 처리
      if (res.status === 429 && attempt < maxRetries - 1) {
        const waitTime = exponentialBackoff(attempt);
        await sleep(waitTime);
        continue;
      }
      
      // 응답 파싱
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const diagnostic = parseJSON(text);
      
      return diagnostic;
    } catch (error) {
      // 에러 처리 및 재시도
    }
  }
}
```

**중요 로직: 지식요소 동적 전송**
```typescript
const sendToGemini = useCallback(async (args: GeminiArgs) => {
  // inputSchema에 knowledgeElements가 정의된 경우에만 전송
  const shouldIncludeKE = inputSchema?.properties?.knowledgeElements;
  
  const knowledgeElements = shouldIncludeKE && args.knowledgeElements 
    ? args.knowledgeElements 
    : undefined;
    
  // API 호출 시 knowledgeElements 포함 여부 결정
  await callGemini({
    ...args,
    knowledgeElements
  });
}, [inputSchema, llmConfigs]);
```

### 2. `/app/admin/prompt/page.tsx` (AI 연동 설정)

**핵심 State**
```typescript
const [configs, setConfigs] = useState<LLMConfig[]>([]);
const [selectedConfig, setSelectedConfig] = useState<LLMConfig | null>(null);
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [systemPrompt, setSystemPrompt] = useState('');
const [inputSchema, setInputSchema] = useState(''); // JSON string
const [outputSchema, setOutputSchema] = useState(''); // JSON string
const [model, setModel] = useState('gemini-2.5-pro');
const [temperature, setTemperature] = useState(0);
// ... 기타 설정
```

**초기화 로직 (자동 설정 추가)**
```typescript
useEffect(() => {
  const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
  let parsedConfigs: LLMConfig[] = [];
  
  if (storedConfigs) {
    parsedConfigs = JSON.parse(storedConfigs);
  }
  
  // 1. 지식요소 진단 설정 자동 추가
  const hasKnowledgeElementConfig = parsedConfigs.some(
    c => c.name === '지식요소 진단 통합형'
  );
  
  if (!hasKnowledgeElementConfig) {
    const knowledgeElementConfig: LLMConfig = {
      id: uid(),
      name: '지식요소 진단 통합형',
      systemPrompt: SYSTEM_PROMPT_BASE,
      inputSchema: DEFAULT_INPUT_SCHEMA, // knowledgeElements 포함
      outputSchema: DEFAULT_RESPONSE_SCHEMA, // knowledge_diagnosis 포함
      // ... 기타 설정
    };
    parsedConfigs.push(knowledgeElementConfig);
  }
  
  // 2. 기본 설정 자동 추가 (설정이 없는 경우)
  if (parsedConfigs.length === 0) {
    const defaultConfig: LLMConfig = {
      id: uid(),
      name: '기본 LLM 설정',
      systemPrompt: SYSTEM_PROMPT_BASE,
      // ... 기타 설정
    };
    parsedConfigs = [defaultConfig];
  }
  
  setConfigs(parsedConfigs);
  localStorage.setItem('math_tutor_llm_configs', JSON.stringify(parsedConfigs));
}, []);
```

**설정 저장 및 이벤트 발행**
```typescript
const saveConfig = () => {
  const updatedConfig: LLMConfig = {
    ...selectedConfig,
    name,
    description,
    systemPrompt,
    inputSchema: JSON.parse(inputSchema),
    outputSchema: JSON.parse(outputSchema),
    model,
    temperature,
    // ...
    updatedAt: nowTime()
  };
  
  const updatedConfigs = configs.map(c => 
    c.id === updatedConfig.id ? updatedConfig : c
  );
  
  setConfigs(updatedConfigs);
  localStorage.setItem('math_tutor_llm_configs', JSON.stringify(updatedConfigs));
  
  // 커스텀 이벤트 발행 (MathTutorDiagnostic에서 감지)
  window.dispatchEvent(new Event('llmConfigUpdated'));
};
```

### 3. `/app/admin/problems/page.tsx` (문제 관리)

**핵심 State**
```typescript
const [problems, setProblems] = useState<Problem[]>([]);
const [newProblem, setNewProblem] = useState<Partial<Problem>>({});
const [grades, setGrades] = useState<string[]>([]);
const [units, setUnits] = useState<string[]>([]);
const [achievementStandards, setAchievementStandards] = useState<string[]>([]);
const [knowledgeElements, setKnowledgeElements] = useState<KnowledgeElement[]>([]);
const [keMaps, setKeMaps] = useState<ProblemKEMap[]>([]);
```

**지식요소 추가 로직**
```typescript
const handleAddKnowledgeElement = () => {
  const newKE: KnowledgeElement = {
    id: `ke-${Date.now()}`,
    name: keName,
    category: keCategory,
    description: keDescription,
    source: keSource,
    cognitiveLevel: keCognitiveLevel,
    prereqIds: kePrereqIds,
    exampleQuestions: keExampleQuestions
  };
  
  setKnowledgeElements([...knowledgeElements, newKE]);
  // 폼 초기화
};
```

**문제-지식요소 매핑 추가**
```typescript
const handleAddKEMap = () => {
  const newMap: ProblemKEMap = {
    problemId: newProblem.id || '',
    keId: mapKeId,
    weight: mapWeight,
    requiredLevel: mapRequiredLevel,
    evidenceRules: {
      correctAnswer: mapCorrectAnswer.split(',').map(s => s.trim()),
      intermediateSteps: mapIntermediateSteps.split(',').map(s => s.trim()),
      errorPatterns: mapErrorPatterns.split(',').map(s => s.trim())
    }
  };
  
  setKeMaps([...keMaps, newMap]);
};
```

**문제 저장**
```typescript
const saveProblem = () => {
  const problemToSave: Problem = {
    ...newProblem,
    knowledgeElements,
    keMaps,
    updatedAt: new Date().toISOString()
  };
  
  const updatedProblems = isEdit
    ? problems.map(p => p.id === problemToSave.id ? problemToSave : p)
    : [...problems, problemToSave];
  
  setProblems(updatedProblems);
  localStorage.setItem('math_tutor_problems', JSON.stringify(updatedProblems));
};
```

### 4. `/app/api/gemini/route.ts` (서버 API)

```typescript
export async function POST(req: NextRequest) {
  // 1. API Key 확인 (서버 환경 변수)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
  }
  
  // 2. Request Body 파싱
  const { model, systemPrompt, userParts, generationConfig } = await req.json();
  
  // 3. Gemini API 호출
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: 'user',
        parts: userParts // [{ text }, { inline_data: { mime_type, data } }]
      }],
      generationConfig
    })
  });
  
  // 4. 응답 반환
  if (!response.ok) {
    const errorText = await response.text();
    // 상세 에러 파싱 및 로깅
    return NextResponse.json({ error, details }, { status: response.status });
  }
  
  const data = await response.json();
  return NextResponse.json(data);
}
```

---

## LocalStorage 사용

### 저장 데이터

```typescript
// 1. LLM 설정 목록
localStorage.setItem('math_tutor_llm_configs', JSON.stringify(LLMConfig[]));

// 2. 활성 LLM 설정 ID
localStorage.setItem('math_tutor_active_llm_config_id', string);

// 3. 문제 목록
localStorage.setItem('math_tutor_problems', JSON.stringify(Problem[]));

// 4. 학년 목록
localStorage.setItem('math_tutor_grades', JSON.stringify(string[]));

// 5. 단원 목록
localStorage.setItem('math_tutor_units', JSON.stringify(string[]));

// 6. 성취기준 목록
localStorage.setItem('math_tutor_achievement_standards', JSON.stringify(string[]));
```

### 동기화 메커니즘

```typescript
// 1. Storage Event (브라우저 탭 간 동기화)
window.addEventListener('storage', (e) => {
  if (e.key === 'math_tutor_llm_configs' || e.key === 'math_tutor_active_llm_config_id') {
    loadActiveConfig();
  }
});

// 2. Custom Event (같은 탭 내 컴포넌트 간 동기화)
window.addEventListener('llmConfigUpdated', () => {
  loadActiveConfig();
});

// 발행
window.dispatchEvent(new Event('llmConfigUpdated'));
```

---

## API 통신 플로우

### Request Structure
```json
{
  "model": "gemini-2.5-pro",
  "systemPrompt": "당신은 폴리아의 4단계...",
  "userParts": [
    {
      "text": "### 문제\n이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요.\n\n### 해설\n...\n\n### 지식요소\n[{\"id\":\"KE1\",...}]\n\n### 학생 응답\n근이 뭔지 모르겠어요"
    },
    {
      "inline_data": {
        "mime_type": "image/jpeg",
        "data": "<Base64_encoded_image>"
      }
    }
  ],
  "generationConfig": {
    "temperature": 0,
    "maxOutputTokens": 8192,
    "responseMimeType": "application/json",
    "responseSchema": { /* Gemini JSON Schema */ },
    "thinkingBudget": 1800
  }
}
```

### Response Structure
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\"diagnosis\":{...},\"knowledge_diagnosis\":{...},\"recommended_stage\":\"1\",...}"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP"
    }
  ]
}
```

### Error Handling
```typescript
// 1. 429 Rate Limit - Exponential Backoff
if (res.status === 429) {
  const waitTime = Math.min(Math.pow(2, attempt) * 2000, 10000);
  await sleep(waitTime);
  retry();
}

// 2. Server Error - 상세 메시지 파싱
if (!res.ok) {
  const errorText = await res.text();
  try {
    const errorData = JSON.parse(errorText);
    errorMessage = errorData.error || errorData.details || '서버 오류';
  } catch {
    errorMessage = errorText.substring(0, 200);
  }
  throw new Error(errorMessage);
}

// 3. Network Error - 감지 및 안내
if (error instanceof TypeError && error.message.includes('fetch')) {
  throw new Error('네트워크 오류: 서버에 연결할 수 없습니다.');
}
```

---

## 보안 설계

### 1. API Key 보호
```
❌ Before: Client-side (노출 위험)
- localStorage에 API Key 저장
- 브라우저에서 직접 Gemini API 호출

✅ After: Server-side Proxy
- API Key는 서버 환경 변수에만 존재
- Client -> Next.js API -> Gemini API
- 환경 변수: GEMINI_API_KEY (Vercel)
```

### 2. 환경 변수 설정
```bash
# Local: .env.local
GEMINI_API_KEY=your_api_key_here

# Vercel: Dashboard > Settings > Environment Variables
GEMINI_API_KEY=your_api_key_here
```

### 3. Request 검증
```typescript
// /api/gemini/route.ts
if (!model || !systemPrompt || !userParts || !generationConfig) {
  return NextResponse.json(
    { error: '필수 파라미터가 누락되었습니다.' },
    { status: 400 }
  );
}
```

---

## 현재 상태 및 이슈

### ✅ 완료된 기능
1. **Admin 페이지**
   - 문제 CRUD (텍스트/이미지 지원)
   - 지식요소 관리 및 문제-KE 매핑
   - AI 연동 설정 관리 (프롬프트, 스키마, 모델 파라미터)
   - 학년/단원/성취기준 동적 관리

2. **학생 화면**
   - 문제 선택 및 풀이
   - AI 대화형 학습
   - 실시간 진단 결과 표시
   - 지식요소별 숙련도 리포트
   - API 호출 로그 확인

3. **AI 연동**
   - 서버사이드 API Proxy
   - JSON Mode (Structured Output)
   - 동적 스키마 적용
   - 429 Rate Limit 처리 (Exponential Backoff)

4. **보안**
   - API Key 서버사이드 관리
   - 환경 변수 사용

### ⚠️ 현재 이슈

**Issue: Admin에 이미 설정이 있는데 학생 화면에서 로드 안 됨**

**증상**
- Admin > AI 연동 탭: 설정 목록 정상 표시
- 학생 화면: "AI 연동 설정 필요" 메시지 표시
- LocalStorage에 데이터는 존재하는 것으로 확인됨

**원인 분석**
```typescript
// app/components/MathTutorDiagnostic.tsx (Line 670-704)
const loadActiveConfig = () => {
  const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
  const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');

  if (storedConfigs) {
    try {
      const parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
      setLlmConfigs(parsedConfigs); // ✅ 설정 목록 저장
      
      // 활성 설정 찾기
      if (activeConfigId) {
        const activeConfig = parsedConfigs.find(c => c.id === activeConfigId);
        if (activeConfig) {
          loadConfig(activeConfig); // ✅ 설정 로드
          return;
        }
      }
      
      // 활성 설정이 없으면 첫 번째 설정 사용
      const activeConfig = parsedConfigs.find(c => c.isActive) || parsedConfigs[0];
      if (activeConfig) {
        loadConfig(activeConfig); // ✅ 설정 로드
        localStorage.setItem('math_tutor_active_llm_config_id', activeConfig.id);
        return;
      }
    } catch (e) {
      console.error('Failed to load configs:', e);
    }
  }
  
  // ⚠️ 설정이 없으면 경고만 표시
  if (!storedConfigs) {
    console.warn('⚠️ LLM 설정이 없습니다. Admin 페이지에서 AI 연동 설정을 추가해주세요.');
  }
};
```

**가능한 원인**
1. ~~`storedConfigs`가 비어있음~~ (Admin에서 확인했으므로 아님)
2. ~~JSON 파싱 오류~~ (try-catch에서 잡힘)
3. **`parsedConfigs` 배열이 비어있음** (가능성 있음)
4. **`loadConfig()` 함수가 실제로 state를 업데이트하지 않음** (가능성 있음)
5. **Admin과 학생 화면이 다른 localStorage를 참조** (불가능, 같은 도메인)

**디버깅 필요**
```typescript
// app/components/MathTutorDiagnostic.tsx 수정 필요
const loadActiveConfig = () => {
  const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
  const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');
  
  console.log('🔍 [loadActiveConfig] storedConfigs:', storedConfigs);
  console.log('🔍 [loadActiveConfig] activeConfigId:', activeConfigId);

  if (storedConfigs) {
    try {
      const parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
      console.log('🔍 [loadActiveConfig] parsedConfigs:', parsedConfigs);
      console.log('🔍 [loadActiveConfig] parsedConfigs.length:', parsedConfigs.length);
      
      setLlmConfigs(parsedConfigs);
      
      // ... rest of logic
      
      const activeConfig = parsedConfigs.find(c => c.isActive) || parsedConfigs[0];
      console.log('🔍 [loadActiveConfig] activeConfig:', activeConfig);
      
      if (activeConfig) {
        console.log('✅ [loadActiveConfig] Loading config:', activeConfig.name);
        loadConfig(activeConfig);
        // ... 
      } else {
        console.warn('⚠️ [loadActiveConfig] No active config found!');
      }
    } catch (e) {
      console.error('❌ [loadActiveConfig] Parse error:', e);
    }
  } else {
    console.warn('⚠️ [loadActiveConfig] No stored configs in localStorage');
  }
};
```

### 🔧 권장 수정 사항

1. **디버깅 로그 추가**
   - `loadActiveConfig` 함수에 console.log 추가
   - localStorage 상태 확인
   - `loadConfig` 호출 확인

2. **Fallback 로직 보강**
   ```typescript
   // Admin 페이지에서 기본 설정 확인 로직
   useEffect(() => {
     const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
     
     if (!storedConfigs) {
       // 설정이 없으면 즉시 기본 설정 생성
       const defaultConfig = createDefaultConfig();
       localStorage.setItem('math_tutor_llm_configs', JSON.stringify([defaultConfig]));
       localStorage.setItem('math_tutor_active_llm_config_id', defaultConfig.id);
     } else {
       const parsed = JSON.parse(storedConfigs);
       if (parsed.length === 0) {
         // 빈 배열이면 기본 설정 생성
         const defaultConfig = createDefaultConfig();
         localStorage.setItem('math_tutor_llm_configs', JSON.stringify([defaultConfig]));
         localStorage.setItem('math_tutor_active_llm_config_id', defaultConfig.id);
       }
     }
   }, []);
   ```

3. **학생 화면 초기화 개선**
   ```typescript
   // MathTutorDiagnostic.tsx
   const [isConfigLoaded, setIsConfigLoaded] = useState(false);
   
   const loadActiveConfig = () => {
     // ... 기존 로직
     setIsConfigLoaded(true); // 로드 완료 표시
   };
   
   // UI에서 로딩 상태 표시
   if (!isConfigLoaded) {
     return <div>설정을 불러오는 중...</div>;
   }
   ```

---

## 다음 단계 제안

1. **즉시 디버깅**
   - 브라우저 개발자 도구 > Console 확인
   - localStorage 직접 조회: `localStorage.getItem('math_tutor_llm_configs')`
   - Admin 페이지와 학생 화면의 localStorage 비교

2. **로그 추가 후 재테스트**
   - `loadActiveConfig` 함수에 상세 로그 추가
   - 로컬 서버 재시작: `npm run dev`
   - 학생 화면 새로고침 후 콘솔 확인

3. **문제 해결 후 배포**
   - 로그 제거 또는 개발 환경에서만 표시
   - `npm run build` 확인
   - Vercel 배포

---

**작성자**: AI Assistant  
**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025-11-04

