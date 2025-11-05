# AI 연동부 시스템 설계 문서

## 1. 전체 아키텍처 개요

현재 시스템은 **3계층 구조**로 설계되어 있습니다:

```
┌─────────────────────────────────────────┐
│  클라이언트 레이어 (수업 화면)          │
│  - 문제 선택, 학생 메시지 입력          │
│  - LLM 설정 선택 및 적용                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  서버 레이어 (API 프록시)               │
│  - API 키 보안 관리                     │
│  - Gemini API 호출                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  외부 API (Gemini API)                  │
│  - 모델: gemini-2.5-pro, 1.5-pro 등    │
│  - 구조화된 JSON 응답 생성              │
└─────────────────────────────────────────┘
```

## 2. 핵심 데이터 구조

### 2.1 LLMConfig 인터페이스

모든 AI 연동 설정을 하나의 객체로 관리합니다:

```typescript
interface LLMConfig {
  // 기본 정보
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  
  // 스키마 정보
  inputSchema?: typeof DEFAULT_INPUT_SCHEMA;
  outputSchema?: typeof DEFAULT_RESPONSE_SCHEMA;
  responseMimeType?: string; // 'application/json'
  
  // 프롬프트 정보
  systemPrompt: string;      // 시스템 프롬프트 (핵심 진단 로직)
  userPrompt?: string;       // 유저 프롬프트 (선택사항)
  
  // 모델 설정 및 추가 파라미터
  provider: string;          // 'gemini'
  model: string;             // 'gemini-2.5-pro', 'gemini-1.5-pro' 등
  temperature: number;       // 0 (일관성 최대화)
  maxOutputTokens: number;  // 8192
  thinkingBudget: number;   // 1800 (생각 시간 예산)
}
```

### 2.2 DiagnosticData 인터페이스

AI 응답의 구조화된 진단 데이터:

```typescript
interface DiagnosticData {
  // 폴리아 기반 진단
  diagnosis: {
    problem_understanding: 'low' | 'medium' | 'high';
    concept_knowledge: 'low' | 'medium' | 'high';
    error_pattern: 'none' | 'calculation_error' | 'logical_error' | 'concept_confusion' | 'approach_error';
    confidence_level: 'low' | 'medium' | 'high';
  };
  
  // 지식요소별 진단 (핵심 기능)
  knowledge_diagnosis: {
    elements: Array<{
      ke_id: string;           // 지식요소 ID
      mastery: 'low' | 'medium' | 'high';
      evidence: string;         // 근거 문장
      cognitive_level: string;  // 인지 수준
      next_action: string;      // 다음 행동 제안
    }>;
    overall_mastery_score: number;  // 0~100
    uncertainty: 'low' | 'medium' | 'high';
  };
  
  // 폴리아 단계 추천
  recommended_stage: '1' | '2' | '3' | '4';
  stage_reason: string;
  
  // 후속 대화
  next_question: string;
  
  // 마이크로 평가
  micro_assessments?: Array<{
    ke_id: string;
    prompt: string;
  }>;
  
  feedback_completed: boolean | string;
}
```

## 3. 주요 컴포넌트 및 역할

### 3.1 관리자 페이지 (`app/admin/prompt/page.tsx`)

**역할**: LLM 설정의 CRUD 관리

**주요 기능**:
- ✅ LLM 설정 추가/수정/삭제
- ✅ 시스템 프롬프트 편집
- ✅ 입력/출력 스키마 관리 (JSON Schema)
- ✅ 모델 파라미터 설정 (temperature, maxOutputTokens, thinkingBudget)
- ✅ 활성 설정 선택 및 적용
- ✅ LocalStorage 기반 영구 저장

**데이터 저장소**:
- `localStorage.getItem('math_tutor_llm_configs')`: 모든 설정 목록
- `localStorage.getItem('math_tutor_active_llm_config_id')`: 현재 활성 설정 ID

**기본 프롬프트 특징**:
- 폴리아 4단계 문제해결 접근법 기반
- 지식요소별 진단 통합
- 구조화된 JSON 출력 강제

### 3.2 수업 화면 (`app/components/MathTutorDiagnostic.tsx`)

**역할**: 실제 AI 진단 실행 및 결과 표시

**주요 기능**:
- ✅ 활성 LLM 설정 로드 및 적용
- ✅ 문제/해설 이미지 처리
- ✅ 지식요소 데이터 전달
- ✅ 학생 메시지 전송 및 AI 응답 수신
- ✅ 진단 결과 시각화
- ✅ 429 에러 자동 재시도 (exponential backoff)

**설정 로드 흐름**:
1. `localStorage`에서 설정 목록 로드
2. 활성 설정 ID 확인
3. 활성 설정이 없으면 첫 번째 활성 설정 또는 첫 번째 설정 사용
4. 설정이 없으면 기본값(fallback) 사용
5. Storage 이벤트 및 커스텀 이벤트(`llmConfigUpdated`) 감지하여 실시간 업데이트

**API 호출 흐름**:
```
학생 메시지 입력
  ↓
sendToGemini() 호출
  ↓
callGemini() 실행
  ├─ 이미지 처리 (문제/해설 이미지 → base64)
  ├─ 텍스트 컨텐츠 구성 (문제, 해설, 지식요소, 학생 응답, 컨텍스트)
  ├─ generationConfig 생성 (temperature, maxOutputTokens, responseSchema 등)
  └─ /api/gemini 호출 (서버 사이드 프록시)
      ↓
서버 사이드 처리
  ├─ API 키 검증
  ├─ Gemini API 호출
  └─ 응답 반환
      ↓
응답 파싱 및 검증
  ├─ JSON 파싱 (loose mode)
  ├─ validateDiagnostic() 실행
  └─ DiagnosticData 반환
      ↓
UI 업데이트
  ├─ 진단 결과 표시
  ├─ 지식요소 칩 표시
  └─ 다음 질문 표시
```

### 3.3 서버 사이드 API (`app/api/gemini/route.ts`)

**역할**: API 키 보안 및 Gemini API 프록시

**주요 기능**:
- ✅ 환경 변수에서 API 키 읽기 (`GEMINI_API_KEY`)
- ✅ 클라이언트 요청을 Gemini API로 전달
- ✅ 에러 처리 및 전파

**보안 특징**:
- API 키는 서버 사이드에서만 접근 가능
- 클라이언트는 API 키를 직접 보지 못함
- Vercel 환경 변수로 관리

**API 호출 구조**:
```typescript
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}

Body: {
  systemInstruction: {
    parts: [{ text: systemPrompt }]
  },
  contents: [{
    role: 'user',
    parts: userParts  // 이미지 + 텍스트
  }],
  generationConfig: {
    temperature,
    maxOutputTokens,
    responseMimeType: 'application/json',
    responseSchema: outputSchema,  // JSON Schema
    thinkingConfig: {
      thinkingBudget
    }
  }
}
```

## 4. 데이터 흐름 상세

### 4.1 설정 관리 흐름

```
[관리자 페이지]
  ├─ 새 설정 추가/수정
  ├─ LocalStorage 저장
  └─ 'llmConfigUpdated' 이벤트 발생
      ↓
[수업 화면]
  ├─ Storage 이벤트 감지
  ├─ 설정 목록 재로드
  └─ 활성 설정 적용
```

### 4.2 진단 실행 흐름

```
[학생 입력] "x = 2, 4"
  ↓
[문제 데이터 수집]
  ├─ 문제 텍스트/이미지
  ├─ 해설 텍스트/이미지
  ├─ 지식요소 목록
  └─ 이전 대화 컨텍스트
  ↓
[프롬프트 구성]
  ├─ 시스템 프롬프트 (LLMConfig에서 로드)
  └─ 사용자 프롬프트
      ├─ 문제 정보
      ├─ 해설 정보
      ├─ 지식요소 목록 (JSON 형식)
      ├─ 학생 응답
      └─ 컨텍스트
  ↓
[API 호출]
  ├─ 서버 사이드 프록시 (/api/gemini)
  ├─ Gemini API 호출
  └─ JSON 응답 수신
  ↓
[응답 처리]
  ├─ JSON 파싱 (loose mode)
  ├─ 런타임 검증 (validateDiagnostic)
  └─ DiagnosticData 객체 생성
  ↓
[UI 업데이트]
  ├─ 진단 결과 표시
  ├─ 지식요소 칩 표시
  └─ 다음 질문 표시
```

## 5. 에러 처리 및 재시도 로직

### 5.1 429 Rate Limit 처리

**전략**: Exponential Backoff + 최대 3회 재시도

```typescript
// 재시도 로직
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const res = await fetch('/api/gemini', ...);
    
    if (res.status === 429 && attempt < maxRetries - 1) {
      const retryAfter = res.headers.get('Retry-After');
      const waitTime = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 
        : Math.min(Math.pow(2, attempt) * 2000, 10000); // 최대 10초
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
  } catch (error) {
    // 에러 처리
  }
}
```

**재시도 전략**:
- `Retry-After` 헤더가 있으면 해당 시간 대기
- 없으면 exponential backoff (2초, 4초, 8초... 최대 10초)
- 최대 3회 재시도
- 모든 재시도 실패 시 사용자에게 명확한 메시지 표시

### 5.2 응답 검증

**런타임 검증 함수**: `validateDiagnostic()`

**검증 항목**:
- 필수 필드 존재 여부
- Enum 값 유효성 (low/medium/high 등)
- 타입 검증 (string, number, boolean, array, object)
- 중첩 객체 검증 (diagnosis, knowledge_diagnosis 등)

**에러 처리**:
- 검증 실패 시 명확한 에러 메시지
- 부분적으로 유효한 데이터는 허용하지 않음 (strict validation)

## 6. 주요 설계 결정 사항

### 6.1 설정 관리 방식

**선택**: LocalStorage 기반 클라이언트 사이드 저장

**이유**:
- ✅ 빠른 접근 속도
- ✅ 서버 인프라 불필요
- ✅ 즉시 적용 가능
- ✅ 관리자 UI에서 직접 관리 가능

**단점**:
- ❌ 브라우저 간 공유 불가
- ❌ 백업/복원 기능 제한적

### 6.2 API 키 보안

**선택**: 서버 사이드 프록시 패턴

**이유**:
- ✅ API 키 노출 방지
- ✅ 클라이언트에서 직접 외부 API 호출 불가
- ✅ 중앙 집중식 에러 처리 가능

**구현**:
- 환경 변수 `GEMINI_API_KEY` 사용
- Vercel 환경 변수로 관리
- 서버 사이드에서만 접근 가능

### 6.3 프롬프트 관리

**선택**: 시스템 프롬프트 중심 + 구조화된 출력

**이유**:
- ✅ 일관된 진단 로직
- ✅ 구조화된 데이터로 UI 표시 용이
- ✅ 프롬프트 변경 시 즉시 반영 가능

**특징**:
- JSON Schema를 통한 출력 형식 강제
- `responseMimeType: 'application/json'` 사용
- 런타임 검증으로 데이터 무결성 보장

### 6.4 지식요소 통합

**선택**: 문제별 지식요소를 프롬프트에 포함

**이유**:
- ✅ 문제별 맞춤형 진단 가능
- ✅ 지식요소별 숙련도 측정
- ✅ 개인화된 학습 제안 가능

**구현**:
- 문제 객체에 `knowledgeElements` 배열 포함
- 프롬프트에 JSON 형식으로 지식요소 목록 포함
- AI 응답에 지식요소별 진단 결과 포함

## 7. 확장 가능성

### 7.1 향후 개선 사항

1. **서버 사이드 설정 저장**
   - 데이터베이스 연동 (PostgreSQL, MongoDB 등)
   - 브라우저 간 설정 공유
   - 버전 관리 및 히스토리

2. **다중 프로바이더 지원**
   - OpenAI, Claude 등 다른 LLM 지원
   - 프로바이더별 최적화된 프롬프트

3. **A/B 테스트**
   - 여러 프롬프트 버전 동시 테스트
   - 효과 측정 및 비교

4. **모니터링 및 로깅**
   - API 호출 로그
   - 응답 시간 추적
   - 에러율 모니터링

5. **캐싱 전략**
   - 유사한 문제에 대한 응답 캐싱
   - 비용 절감 및 응답 속도 개선

## 8. 주요 파일 구조

```
app/
├── admin/
│   └── prompt/
│       └── page.tsx          # LLM 설정 관리 페이지
├── api/
│   └── gemini/
│       └── route.ts           # 서버 사이드 API 프록시
└── components/
    └── MathTutorDiagnostic.tsx # 메인 수업 화면 컴포넌트
```

## 9. 환경 변수

**필수 환경 변수**:
- `GEMINI_API_KEY`: Gemini API 키 (서버 사이드)

**설정 위치**:
- 로컬: `.env.local`
- Vercel: 프로젝트 설정 > Environment Variables

## 10. 참고 자료

- [Gemini API 문서](https://ai.google.dev/gemini-api/docs)
- [JSON Schema 표준](https://json-schema.org/)
- [Polya의 문제해결 4단계](https://en.wikipedia.org/wiki/How_to_Solve_It)

