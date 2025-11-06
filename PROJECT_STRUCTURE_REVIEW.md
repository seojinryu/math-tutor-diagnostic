# 프로젝트 구조 전체 리뷰 및 요약

**작성일**: 2025년 1월  
**프로젝트**: math-tutor-diagnostic  
**버전**: 0.1.0

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [핵심 기능](#핵심-기능)
5. [데이터 흐름](#데이터-흐름)
6. [주요 컴포넌트](#주요-컴포넌트)
7. [API 구조](#api-구조)
8. [데이터 저장소](#데이터-저장소)
9. [보안 설계](#보안-설계)
10. [개발 가이드](#개발-가이드)

---

## 🎯 프로젝트 개요

### 목적
**폴리아(Polya)의 4단계 문제해결 접근법**을 기반으로 한 **수학 학습 진단 AI 시스템**입니다.

### 핵심 가치
- **학생 맞춤형 학습**: 개별 학생의 이해도와 오류 패턴을 분석하여 맞춤형 피드백 제공
- **체계적 접근**: 폴리아 4단계 방법론을 통한 구조화된 문제 해결 지원
- **지식요소 기반 진단**: 세밀한 지식요소(Knowledge Element) 단위의 학습 상태 분석
- **유연한 설정**: 웹 기반 관리자 페이지를 통한 문제 및 AI 설정 관리

### 주요 사용자
- **학생**: 수학 문제를 풀고 AI 튜터와 대화하며 학습
- **관리자**: 문제 관리, AI 설정, 시스템 설정 관리

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15.5.2 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React 0.542.0
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)
- **Storage**: LocalStorage (브라우저 로컬 저장소)

### Backend
- **Runtime**: Next.js API Routes (Serverless Functions)
- **Deployment**: Vercel

### AI Integration
- **API**: Google Gemini API
- **Model**: gemini-2.5-pro (기본값, 관리자에서 변경 가능)
- **Response Format**: JSON Schema (Structured Output)
- **Features**: 
  - JSON Mode 강제
  - Thinking Budget 지원
  - 이미지 처리 (Base64)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint 9
- **Build Tool**: Turbopack (Next.js 15 기본)

---

## 📁 프로젝트 구조

```
math-tutor-diagnostic-fresh/
├── app/                          # Next.js App Router
│   ├── admin/                    # 관리자 페이지
│   │   ├── layout.tsx            # 관리자 레이아웃 (사이드바, 헤더)
│   │   ├── problems/
│   │   │   └── page.tsx          # 문제 관리 페이지 (CRUD)
│   │   └── prompt/
│   │       └── page.tsx          # AI 연동 설정 페이지 (LLM 설정)
│   │
│   ├── api/                      # API Routes
│   │   └── gemini/
│   │       └── route.ts           # Gemini API 프록시 (서버 사이드)
│   │
│   ├── components/               # React 컴포넌트
│   │   └── MathTutorDiagnostic.tsx  # 메인 수업 화면 컴포넌트
│   │
│   ├── hooks/                    # Custom Hooks
│   │   └── useActiveLLMConfig.ts # 활성 LLM 설정 관리 훅
│   │
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈 페이지 (수업 화면)
│   ├── globals.css               # 전역 스타일
│   └── not-found.tsx             # 404 페이지
│
├── public/                       # 정적 파일
│   └── *.svg                     # 아이콘 파일들
│
├── temp_images/                  # 임시 이미지 (개발용)
│   ├── problem_14.png
│   └── explanation_14.png
│
├── 문서/                         # 프로젝트 문서
│   ├── AGENT.md                  # 개발 가이드라인 (배포 등)
│   ├── CURRENT_SYSTEM_SUMMARY.md # 시스템 전체 요약
│   ├── PRODUCT_DOCUMENTATION.md   # 제품 문서
│   ├── AI_INTEGRATION_ARCHITECTURE.md  # AI 연동 아키텍처
│   ├── DATA_FLOW_ANALYSIS.md     # 데이터 흐름 분석
│   ├── API_KEY_MIGRATION.md      # API 키 마이그레이션 가이드
│   ├── API_TEST_GUIDE.md         # API 테스트 가이드
│   ├── ENV_SETUP.md              # 환경 변수 설정
│   └── SECURITY_AUDIT.md         # 보안 감사
│
├── package.json                  # 의존성 관리
├── tsconfig.json                 # TypeScript 설정
├── next.config.ts                # Next.js 설정
├── eslint.config.mjs             # ESLint 설정
├── postcss.config.mjs            # PostCSS 설정
├── vercel.json                   # Vercel 배포 설정
└── README.md                     # 프로젝트 README
```

---

## ✨ 핵심 기능

### 1. 학생 화면 (수업 화면)

#### 1.1 문제 선택 및 표시
- 등록된 문제 목록에서 선택
- 문제 텍스트 또는 이미지 표시
- 해설 이미지/텍스트 표시
- 지식요소 정보 표시

#### 1.2 AI 튜터 대화
- 학생이 질문/답변 입력
- AI가 학생의 응답을 분석하여 진단
- 폴리아 4단계 추천 및 다음 질문 제안
- 대화 히스토리 관리
- 429 Rate Limit 자동 재시도 (Exponential Backoff)

#### 1.3 진단 결과 시각화
- **문제 이해도**: 낮음/중간/높음
- **개념 지식**: 낮음/중간/높음
- **오류 패턴**: none/calculation_error/logical_error/concept_confusion/approach_error
- **자신감 수준**: 낮음/중간/높음
- **추천 단계**: 폴리아 4단계 중 하나
- **지식요소별 진단**: 각 지식요소의 숙련도 및 보강 행동 제안

#### 1.4 API 호출 로그
- 입력 데이터 확인 (문제, 해설, 학생 응답, 지식요소)
- 프롬프트 확인
- 출력 데이터 확인 (진단 결과)

### 2. 관리자 페이지

#### 2.1 문제 관리 (`/admin/problems`)
- **문제 CRUD**: 문제 추가, 수정, 삭제, 조회
- **입력 방식**: 텍스트 또는 이미지 (Base64)
- **해설 입력**: 텍스트 또는 이미지
- **메타데이터**: 학년, 단원 관리
- **검색 및 필터**: 제목/내용 검색, 학년/단원 필터
- **학년/단원 관리**: 커스텀 셀렉트 컴포넌트를 통한 동적 추가
- **지식요소 관리**: 문제별 지식요소 생성 및 관리
- **문제-지식요소 매핑**: 가중치, 요구 숙련도, 증거 규칙 설정

#### 2.2 AI 연동 설정 (`/admin/prompt`)
- **LLM 기본정보**: 이름, 설명, 버전, 생성일, 수정일, 활성 상태
- **스키마 정보**:
  - 입력 스키마 (JSON Schema)
  - 출력 스키마 (JSON Schema)
  - Response MIME Type (application/json)
- **프롬프트 정보**:
  - 시스템 프롬프트 (필수)
  - 유저 프롬프트 (선택사항)
- **모델 설정 및 추가 파라미터**:
  - Provider (현재: gemini)
  - Model (예: gemini-2.5-pro)
  - Temperature (0-2)
  - Max Output Tokens
  - Thinking Budget
- **활성 설정 관리**: 여러 설정 중 하나를 활성화하여 사용

---

## 🔄 데이터 흐름

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────┐           ┌──────────────────┐         │
│  │  Admin Pages     │           │  Student View    │         │
│  │  (/admin)        │           │  (/)             │         │
│  │                  │           │                  │         │
│  │  • 문제 관리     │◄─────────►│ MathTutor        │         │
│  │  • AI 연동 설정  │ LocalStorage  Diagnostic   │         │
│  └──────────────────┘           └────────┬─────────┘         │
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
                    │  • Structured Output with Schema          │
                    └──────────────────────────────────────────┘
```

### 설정 관리 흐름

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

### 진단 실행 흐름

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

---

## 🧩 주요 컴포넌트

### 1. `MathTutorDiagnostic.tsx` (학생 화면)

**위치**: `app/components/MathTutorDiagnostic.tsx`

**역할**: 메인 수업 화면 컴포넌트

**주요 기능**:
- ✅ 활성 LLM 설정 로드 및 적용 (`useActiveLLMConfig` 훅 사용)
- ✅ 문제 선택 및 표시 (텍스트/이미지)
- ✅ 해설 표시 (텍스트/이미지)
- ✅ 학생 메시지 입력 및 전송
- ✅ AI 응답 수신 및 표시
- ✅ 진단 결과 시각화
- ✅ 지식요소별 진단 리포트
- ✅ API 호출 로그 표시
- ✅ 429 Rate Limit 자동 재시도 (Exponential Backoff)

**핵심 State**:
```typescript
- problems: Problem[]                    // 문제 목록
- selectedProblemId: string | null        // 선택된 문제 ID
- messages: Message[]                     // 대화 메시지 목록
- currentInput: string                    // 현재 입력 중인 메시지
- isLoading: boolean                     // API 호출 중 여부
- apiCallLogs: ApiCallLog[]              // API 호출 로그
- activeTab: 'chat' | 'logs'              // 활성 탭
```

**핵심 함수**:
- `handleSendMessage()`: 학생 메시지 전송
- `sendToGemini()`: Gemini API 호출 준비 및 실행
- `callGemini()`: 서버 API 호출 (재시도 로직 포함)
- `validateDiagnostic()`: 진단 결과 검증

### 2. `admin/problems/page.tsx` (문제 관리)

**위치**: `app/admin/problems/page.tsx`

**역할**: 문제 CRUD 관리 페이지

**주요 기능**:
- ✅ 문제 추가/수정/삭제
- ✅ 텍스트/이미지 입력 지원
- ✅ 해설 텍스트/이미지 입력 지원
- ✅ 학년/단원 동적 관리 (SearchableSelect 컴포넌트)
- ✅ 문제 검색 및 필터링
- ✅ 지식요소 관리 및 문제-지식요소 매핑
- ✅ LocalStorage 저장

**핵심 State**:
```typescript
- problems: Problem[]                    // 문제 목록
- newProblem: Partial<Problem>           // 새 문제 (작성 중)
- grades: string[]                        // 학년 목록
- units: string[]                         // 단원 목록
- knowledgeElements: KnowledgeElement[]  // 지식요소 목록
- keMaps: ProblemKEMap[]                 // 문제-지식요소 매핑
```

### 3. `admin/prompt/page.tsx` (AI 연동 설정)

**위치**: `app/admin/prompt/page.tsx`

**역할**: LLM 설정 관리 페이지

**주요 기능**:
- ✅ LLM 설정 추가/수정/삭제
- ✅ 시스템 프롬프트 편집
- ✅ 입력/출력 스키마 관리 (JSON Schema)
- ✅ 모델 파라미터 설정 (temperature, maxOutputTokens, thinkingBudget)
- ✅ 활성 설정 선택 및 적용
- ✅ LocalStorage 저장
- ✅ 기본 설정 자동 시드 (설정이 없을 경우)

**핵심 State**:
```typescript
- configs: LLMConfig[]                   // 설정 목록
- selectedConfig: LLMConfig | null       // 선택된 설정
- name: string                           // 설정 이름
- systemPrompt: string                   // 시스템 프롬프트
- inputSchema: string                    // 입력 스키마 (JSON string)
- outputSchema: string                   // 출력 스키마 (JSON string)
- model: string                          // 모델 이름
- temperature: number                    // Temperature
- maxOutputTokens: number                // Max Output Tokens
- thinkingBudget: number                 // Thinking Budget
```

### 4. `useActiveLLMConfig.ts` (Custom Hook)

**위치**: `app/hooks/useActiveLLMConfig.ts`

**역할**: 활성 LLM 설정 관리 커스텀 훅

**주요 기능**:
- ✅ LocalStorage에서 LLM 설정 목록 로드
- ✅ 활성 설정 자동 선택 (activeConfigId > 활성화된 첫 번째 > 첫 번째)
- ✅ Storage 이벤트 감지 (다른 탭에서 변경 시)
- ✅ 커스텀 이벤트 감지 (`llmConfigUpdated`, 같은 탭 내 변경 시)
- ✅ 기본 설정 자동 시드 (설정이 없을 경우)
- ✅ 시스템 기본 설정 보장 (과거 버전 호환)

**반환값**:
```typescript
{
  config: LLMConfig | null,        // 현재 활성 설정
  configs: LLMConfig[],             // 전체 설정 목록
  activeConfigs: LLMConfig[],       // 활성화된 설정 목록만
  isLoading: boolean,               // 로딩 상태
  error: string | null,             // 에러 메시지
  setActiveConfig: (id: string) => void  // 활성 설정 변경
}
```

---

## 🔌 API 구조

### 1. `/api/gemini` (Gemini API 프록시)

**위치**: `app/api/gemini/route.ts`

**역할**: 서버 사이드 API 프록시 (API 키 보안)

**Method**: `POST`

**Request Body**:
```typescript
{
  model: string;                    // 'gemini-2.5-pro'
  systemPrompt: string;            // 시스템 프롬프트
  userParts: Array<{               // 사용자 입력 (텍스트 + 이미지)
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;                 // Base64 (prefix 제거)
    };
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: 'application/json';
    responseSchema?: object;        // JSON Schema
    thinkingConfig?: {
      thinkingBudget: number;
    };
  };
}
```

**Response**:
```typescript
{
  candidates: [{
    content: {
      parts: [{
        text: string;               // JSON 문자열
      }];
    };
  }];
}
```

**에러 처리**:
- API 키 누락: 500 에러
- 필수 파라미터 누락: 400 에러
- Gemini API 오류: 원본 상태 코드 및 상세 메시지 전달

---

## 💾 데이터 저장소

### LocalStorage Keys

```typescript
// 1. LLM 설정 목록
'math_tutor_llm_configs': LLMConfig[]

// 2. 활성 LLM 설정 ID
'math_tutor_active_llm_config_id': string

// 3. 문제 목록
'math_tutor_problems': Problem[]

// 4. 학년 목록
'math_tutor_grades': string[]

// 5. 단원 목록
'math_tutor_units': string[]

// 6. 성취기준 목록
'math_tutor_achievement_standards': string[]
```

### 데이터 구조

#### Problem (문제)
```typescript
interface Problem {
  id: string;
  title: string;
  content: string;                    // 텍스트 or "[이미지 문제: filename]"
  imageUrl?: string;                  // Base64 이미지 (문제)
  explanationImageUrl?: string;       // Base64 이미지 (해설)
  explanationText?: string;           // 텍스트 or "[이미지 해설: filename]"
  grade?: string;                     // 학년
  unit?: string;                      // 단원
  notes?: string;                     // 비고
  knowledgeElements?: KnowledgeElement[];
  keMaps?: ProblemKEMap[];
  createdAt: string;
  updatedAt: string;
}
```

#### LLMConfig (AI 연동 설정)
```typescript
interface LLMConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  systemPrompt: string;              // 시스템 프롬프트 (필수)
  userPrompt?: string;               // 유저 프롬프트 (선택사항)
  inputSchema?: object;              // 입력 스키마 (JSON Schema)
  outputSchema?: object;             // 출력 스키마 (JSON Schema)
  responseMimeType: string;          // 'application/json'
  provider: string;                  // 'gemini'
  model: string;                     // 'gemini-2.5-pro'
  temperature: number;               // 0~2
  maxOutputTokens: number;           // 최대 출력 토큰
  thinkingBudget: number;            // 사고 예산 (토큰)
  createdAt: string;
  updatedAt: string;
  isActive: boolean;                 // 활성화 여부
  isSystem?: boolean;                // 시스템 기본 설정 여부
}
```

#### DiagnosticData (진단 결과)
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
      evidence: string;
      cognitive_level: string;
      next_action: string;
    }>;
    overall_mastery_score: number;   // 0~100
    uncertainty: 'low' | 'medium' | 'high';
  };
  recommended_stage: '1' | '2' | '3' | '4';
  stage_reason: string;
  next_question: string;
  micro_assessments?: Array<{
    ke_id: string;
    prompt: string;
  }>;
  feedback_completed: boolean | string;
}
```

---

## 🔒 보안 설계

### 1. API 키 보호

**구현 방식**: 서버 사이드 프록시 패턴

**특징**:
- ✅ API 키는 서버 환경 변수에만 존재 (`GEMINI_API_KEY`)
- ✅ 클라이언트는 API 키를 직접 보지 못함
- ✅ Vercel 환경 변수로 관리
- ✅ 클라이언트에서 직접 외부 API 호출 불가

**환경 변수 설정**:
```bash
# Local: .env.local
GEMINI_API_KEY=your_api_key_here

# Vercel: Dashboard > Settings > Environment Variables
GEMINI_API_KEY=your_api_key_here
```

### 2. Request 검증

**서버 사이드 검증**:
- 필수 파라미터 확인 (model, systemPrompt, userParts, generationConfig)
- API 키 존재 여부 확인
- 에러 응답 상세 정보 제공

---

## 🚀 개발 가이드

### 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 배포 프로세스

1. **로컬 빌드 확인**
   ```bash
   npm run build
   ```

2. **변경사항 커밋**
   ```bash
   git add .
   git commit -m "commit message"
   ```

3. **GitHub에 푸시**
   ```bash
   git push
   ```

4. **Vercel 배포**
   ```bash
   npx vercel --prod
   ```

### 주요 스크립트

- `npm run dev`: 개발 서버 실행 (Turbopack)
- `npm run build`: 프로덕션 빌드 (Turbopack)
- `npm start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 실행

### 커스텀 이벤트

#### `llmConfigUpdated`
- **발생 시점**: LLM 설정이 업데이트될 때
- **발행 위치**: `app/admin/prompt/page.tsx`
- **감지 위치**: `app/components/MathTutorDiagnostic.tsx`, `app/hooks/useActiveLLMConfig.ts`
- **용도**: 같은 탭 내에서 설정 변경 시 수업 화면에 즉시 반영

---

## 📊 프로젝트 특징

### 장점

1. **유연한 설정 관리**
   - 관리자 페이지에서 프롬프트, 스키마, 모델 파라미터를 자유롭게 변경 가능
   - 여러 설정을 관리하고 활성 설정을 선택하여 사용 가능

2. **세밀한 진단**
   - 지식요소 단위의 숙련도 분석
   - 폴리아 4단계 기반 체계적 접근
   - 오류 패턴 분석 및 맞춤형 피드백

3. **이미지 지원**
   - 문제/해설을 텍스트 또는 이미지로 입력 가능
   - Base64 인코딩을 통한 이미지 처리
   - Gemini API의 멀티모달 기능 활용

4. **안정적인 API 호출**
   - 429 Rate Limit 자동 재시도 (Exponential Backoff)
   - 상세한 에러 처리 및 사용자 피드백
   - API 호출 로그를 통한 디버깅 지원

5. **보안 설계**
   - 서버 사이드 API 프록시를 통한 API 키 보호
   - 환경 변수를 통한 민감 정보 관리

### 개선 가능한 부분

1. **데이터 저장소**
   - 현재: LocalStorage (브라우저별 독립적)
   - 개선: 데이터베이스 연동 (브라우저 간 공유, 백업/복원)

2. **사용자 인증**
   - 현재: 없음
   - 개선: 사용자 계정 시스템 (개별 학습 이력 관리)

3. **학습 이력 관리**
   - 현재: 세션별로만 관리
   - 개선: 학습 이력 저장 및 분석

4. **다중 프로바이더 지원**
   - 현재: Gemini만 지원
   - 개선: OpenAI, Claude 등 다른 LLM 지원

---

## 📝 주요 문서

프로젝트에는 상세한 문서들이 포함되어 있습니다:

- **CURRENT_SYSTEM_SUMMARY.md**: 시스템 전체 요약 및 데이터 플로우
- **PRODUCT_DOCUMENTATION.md**: 제품 문서 및 사용자 가이드
- **AI_INTEGRATION_ARCHITECTURE.md**: AI 연동 아키텍처 상세 설명
- **DATA_FLOW_ANALYSIS.md**: 문제/해설 데이터 흐름 분석
- **API_KEY_MIGRATION.md**: API 키 마이그레이션 가이드
- **API_TEST_GUIDE.md**: API 테스트 가이드
- **ENV_SETUP.md**: 환경 변수 설정 가이드
- **SECURITY_AUDIT.md**: 보안 감사 문서
- **AGENT.md**: 개발 가이드라인 (배포 등)

---

## 🎯 결론

이 프로젝트는 **폴리아의 4단계 문제해결 접근법**을 기반으로 한 **수학 학습 진단 AI 시스템**으로, 다음과 같은 특징을 가지고 있습니다:

- ✅ **체계적인 아키텍처**: 클라이언트-서버-외부 API 3계층 구조
- ✅ **유연한 설정 관리**: 관리자 페이지를 통한 프롬프트 및 모델 파라미터 관리
- ✅ **세밀한 진단**: 지식요소 단위의 학습 상태 분석
- ✅ **안정적인 운영**: Rate Limit 처리, 에러 핸들링, 로깅
- ✅ **보안 설계**: 서버 사이드 API 프록시를 통한 API 키 보호

프로젝트는 **Next.js 15**, **TypeScript**, **Tailwind CSS**를 기반으로 구축되었으며, **Vercel**에 배포되어 있습니다.

---

**작성자**: AI Assistant  
**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025년 1월

