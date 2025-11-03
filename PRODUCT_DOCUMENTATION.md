# 수학 AI 튜터 시스템 - 기획/개발 문서

**버전**: 1.0.0  
**최종 업데이트**: 2025년 11월  
**작성자**: 개발팀

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [주요 기능](#주요-기능)
4. [기술 스택](#기술-스택)
5. [데이터 구조](#데이터-구조)
6. [API 연동 상세](#api-연동-상세)
7. [파일 구조](#파일-구조)
8. [사용자 가이드](#사용자-가이드)
9. [개발 가이드](#개발-가이드)
10. [테스트 가이드](#테스트-가이드)

---

## 🎯 프로젝트 개요

### 목적
폴리아의 4단계 문제해결 접근법을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 AI 시스템입니다.

### 핵심 가치
- **학생 맞춤형 학습**: 개별 학생의 이해도와 오류 패턴을 분석하여 맞춤형 피드백 제공
- **체계적 접근**: 폴리아의 4단계 방법론을 통한 구조화된 문제 해결 지원
- **유연한 설정**: 웹 기반 관리자 페이지를 통한 문제 및 AI 설정 관리

### 주요 사용자
- **학생**: 수학 문제를 풀고 AI 튜터와 대화하며 학습
- **관리자**: 문제 관리, AI 설정, 시스템 설정 관리

---

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    수업 화면 (Student)                    │
│  - 문제 선택 및 표시                                     │
│  - AI와의 대화 인터페이스                                │
│  - 진단 결과 시각화                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ API 호출 (Gemini API)
                     │
┌────────────────────▼────────────────────────────────────┐
│              관리자 페이지 (Admin)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 문제 관리    │  │ AI 연동      │  │ 설정         │ │
│  │              │  │              │  │              │ │
│  │ - 문제 CRUD  │  │ - LLM 설정   │  │ - API 키     │ │
│  │ - 학년/단원  │  │ - 프롬프트   │  │ - 시스템설정  │ │
│  │   관리       │  │ - 스키마     │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                     │
                     │ LocalStorage
                     │
┌────────────────────▼────────────────────────────────────┐
│              데이터 저장소 (LocalStorage)                 │
│  - 문제 데이터 (math_tutor_problems)                    │
│  - LLM 설정 (math_tutor_llm_configs)                    │
│  - 활성 설정 ID (math_tutor_active_llm_config_id)       │
│  - 학년/단원 목록 (math_tutor_grades, math_tutor_units) │
│  - API 키 (gemini_api_key)                              │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ 주요 기능

### 1. 수업 화면 (Student View)

#### 1.1 문제 선택 및 표시
- 등록된 문제 목록에서 선택
- 문제 텍스트 또는 이미지 표시
- 해설 이미지/텍스트 표시

#### 1.2 AI 튜터 대화
- 학생이 질문/답변 입력
- AI가 학생의 응답을 분석하여 진단
- 폴리아 4단계 추천 및 다음 질문 제안
- 대화 히스토리 관리

#### 1.3 진단 결과 시각화
- 문제 이해도 (낮음/중간/높음)
- 개념 지식 (낮음/중간/높음)
- 오류 패턴 (none/calculation_error/logical_error/concept_confusion/approach_error)
- 자신감 수준 (낮음/중간/높음)
- 추천 단계 (1: 문제 이해하기, 2: 계획 세우기, 3: 계획 실행하기, 4: 되돌아보기)

### 2. 관리자 페이지 (Admin View)

#### 2.1 문제 관리
- **문제 CRUD**: 문제 추가, 수정, 삭제, 조회
- **입력 방식**: 텍스트 또는 이미지
- **해설 입력**: 텍스트 또는 이미지 (문제와 동일한 구조)
- **메타데이터**: 학년, 단원 관리
- **검색 및 필터**: 제목/내용 검색, 학년/단원 필터
- **학년/단원 관리**: 커스텀 셀렉트 컴포넌트를 통한 동적 추가

#### 2.2 AI 연동
- **LLM 기본정보**: 이름, 설명, 버전, 생성일, 수정일, 활성 상태
- **스키마 정보**:
  - 입력 스키마 (JSON Schema)
  - 출력 스키마 (JSON Schema)
  - Response MIME Type (application/json 또는 text/plain)
- **프롬프트 정보**:
  - 시스템 프롬프트 (필수)
  - 유저 프롬프트 (선택사항)
- **모델 설정 및 추가 파라미터**:
  - Provider (현재: gemini)
  - Model (예: gemini-2.5-pro)
  - Temperature (0-1)
  - Max Output Tokens
  - Thinking Budget

#### 2.3 설정
- API 키 관리 (Gemini API Key)
- 시스템 설정 (자동 저장, 최대 문제 수 등)
- UI 설정 (테마, 언어 등)
- 알림 설정
- 데이터 관리 (백업, 보관 기간)

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)
- **Storage**: LocalStorage (브라우저 로컬 저장소)

### AI Integration
- **API**: Google Gemini API
- **Model**: gemini-2.5-pro (기본값, 관리자에서 변경 가능)
- **Response Format**: JSON Schema 또는 Plain Text

### Development Tools
- **Package Manager**: npm
- **Deployment**: Vercel
- **Version Control**: Git

---

## 📊 데이터 구조

### Problem (문제)
```typescript
interface Problem {
  id: string;                    // 고유 ID
  title: string;                  // 문제 제목
  content: string;                // 문제 내용 (텍스트 또는 "[이미지 문제: filename.jpg]")
  imageUrl?: string;              // 문제 이미지 (Base64 Data URL)
  explanationImageUrl?: string;   // 해설 이미지 (Base64 Data URL)
  explanationText?: string;       // 해설 텍스트
  grade?: string;                 // 학년
  unit?: string;                  // 단원
  createdAt: string;              // 생성일시
  updatedAt: string;              // 수정일시
}
```

### LLMConfig (LLM 설정)
```typescript
interface LLMConfig {
  id: string;                    // 고유 ID
  name: string;                  // 설정 이름
  description?: string;           // 설명
  version: string;                // 버전 (예: "v1.0.0")
  createdAt: string;              // 생성일시
  updatedAt: string;              // 수정일시
  isActive: boolean;              // 활성 상태
  
  // 스키마 정보
  inputSchema?: object;           // 입력 스키마 (JSON Schema)
  outputSchema?: object;          // 출력 스키마 (JSON Schema)
  responseMimeType?: string;     // Response MIME Type (기본: "application/json")
  
  // 프롬프트 정보
  systemPrompt: string;           // 시스템 프롬프트 (필수)
  userPrompt?: string;            // 유저 프롬프트 (선택사항)
  
  // 모델 설정
  provider: string;               // Provider (현재: "gemini")
  model: string;                  // 모델 이름 (예: "gemini-2.5-pro")
  temperature: number;            // Temperature (0-1)
  maxOutputTokens: number;       // Max Output Tokens
  thinkingBudget: number;         // Thinking Budget
}
```

### DiagnosticData (진단 결과)
```typescript
interface DiagnosticData {
  diagnosis: {
    problem_understanding: 'low' | 'medium' | 'high';
    concept_knowledge: 'low' | 'medium' | 'high';
    error_pattern: 'none' | 'calculation_error' | 'logical_error' | 'concept_confusion' | 'approach_error';
    confidence_level: 'low' | 'medium' | 'high';
  };
  recommended_stage: '1' | '2' | '3' | '4';
  stage_reason: string;
  next_question: string;
  feedback_completed: boolean;
}
```

### LocalStorage Keys
- `math_tutor_problems`: 문제 목록 (JSON 배열)
- `math_tutor_llm_configs`: LLM 설정 목록 (JSON 배열)
- `math_tutor_active_llm_config_id`: 현재 활성화된 LLM 설정 ID
- `math_tutor_grades`: 학년 목록 (JSON 배열)
- `math_tutor_units`: 단원 목록 (JSON 배열)
- `gemini_api_key`: Gemini API 키
- `math_tutor_settings`: 시스템 설정 (JSON 객체)

---

## 🔌 API 연동 상세

### Gemini API 호출 흐름

```
1. 수업 화면에서 학생 메시지 입력
   ↓
2. LocalStorage에서 활성 LLM 설정 로드
   - math_tutor_active_llm_config_id 확인
   - math_tutor_llm_configs에서 해당 설정 찾기
   ↓
3. 설정 값으로 API 호출 준비
   - systemPrompt: LLM 설정의 systemPrompt
   - model: LLM 설정의 model
   - temperature: LLM 설정의 temperature
   - maxOutputTokens: LLM 설정의 maxOutputTokens
   - thinkingBudget: LLM 설정의 thinkingBudget
   - responseMimeType: LLM 설정의 responseMimeType
   - responseSchema: responseMimeType이 "application/json"인 경우 LLM 설정의 outputSchema
   ↓
4. API 호출
   - Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
   - Method: POST
   - Headers:
     - Content-Type: application/json
     - x-goog-api-key: {API_KEY}
   - Body:
     {
       systemInstruction: {
         role: "system",
         parts: [{ text: systemPrompt }]
       },
       contents: [{
         role: "user",
         parts: [
           { inlineData: { mimeType, data } }, // 문제 이미지 (있을 경우)
           { inlineData: { mimeType, data } }, // 해설 이미지 (있을 경우)
           { text: "문제: ..., 학생 응답: ..., 컨텍스트: ..." }
         ]
       }],
       generationConfig: {
         temperature: number,
         maxOutputTokens: number,
         responseMimeType: string,
         responseSchema: object, // responseMimeType이 "application/json"인 경우만
         thinkingConfig: {
           thinkingBudget: number
         }
       }
     }
   ↓
5. 응답 처리
   - JSON 파싱 (responseMimeType이 "application/json"인 경우)
   - Validation (DiagnosticData 형식 검증)
   - UI 업데이트
```

### 설정 적용 우선순위

1. **LocalStorage의 활성 LLM 설정** (최우선)
   - `math_tutor_active_llm_config_id`로 찾은 설정 사용
2. **기본값 (Fallback)**
   - LocalStorage에 설정이 없을 경우 하드코딩된 기본값 사용:
     ```typescript
     {
       model: 'gemini-2.5-pro',
       temperature: 0,
       maxOutputTokens: 8192,
       thinkingBudget: 1800,
       responseMimeType: 'application/json',
       systemPrompt: DEFAULT_PROMPT,
       outputSchema: DEFAULT_RESPONSE_SCHEMA
     }
     ```

### API 키 관리

- **저장 위치**: `localStorage.getItem('gemini_api_key')`
- **설정 위치**: 관리자 페이지 > 설정 > API 설정
- **환경 변수**: `NEXT_PUBLIC_GEMINI_API_KEY` (선택사항)

---

## 📁 파일 구조

```
math-tutor-diagnostic/
├── app/
│   ├── admin/
│   │   ├── layout.tsx              # 관리자 레이아웃 (사이드바, 헤더)
│   │   ├── page.tsx                 # 관리자 대시보드
│   │   ├── problems/
│   │   │   └── page.tsx            # 문제 관리 페이지
│   │   ├── prompt/
│   │   │   └── page.tsx            # AI 연동 페이지 (LLM 설정)
│   │   └── settings/
│   │       └── page.tsx            # 설정 페이지
│   ├── api/
│   │   └── config/
│   │       └── route.ts            # API 설정 엔드포인트
│   ├── components/
│   │   └── MathTutorDiagnostic.tsx # 메인 수업 화면 컴포넌트
│   ├── layout.tsx                   # 루트 레이아웃
│   ├── page.tsx                     # 홈 페이지 (수업 화면)
│   └── globals.css                  # 전역 스타일
├── public/                          # 정적 파일
├── AGENT.md                         # 개발 가이드라인 (배포 등)
├── PRODUCT_DOCUMENTATION.md         # 본 문서
├── README.md                        # 프로젝트 README
├── package.json                     # 의존성 관리
├── tsconfig.json                    # TypeScript 설정
└── next.config.ts                   # Next.js 설정
```

---

## 👥 사용자 가이드

### 관리자 사용 가이드

#### 문제 추가하기
1. 관리자 페이지 > 문제 관리로 이동
2. "새 문제 추가" 버튼 클릭
3. 문제 제목 입력
4. 학년/단원 선택 (필요시 "새 항목 추가"로 동적 추가)
5. 문제 입력 방식 선택:
   - **텍스트**: 텍스트 입력란에 직접 입력
   - **이미지**: 이미지 파일 업로드
6. 해설 입력 (선택사항):
   - **텍스트**: 해설 텍스트 입력
   - **이미지**: 해설 이미지 업로드
7. "추가" 버튼 클릭

#### AI 설정 관리하기
1. 관리자 페이지 > AI 연동으로 이동
2. 설정 목록에서 활성 설정 확인 또는 "새 설정 추가" 클릭
3. 각 섹션 설정:
   - **LLM 기본정보**: 이름, 설명, 버전 입력
   - **스키마 정보**: 입력/출력 스키마 JSON 편집, Response MIME Type 선택
   - **프롬프트 정보**: 시스템 프롬프트, 유저 프롬프트 입력
   - **모델 설정**: Provider, Model, Temperature, Max Tokens, Thinking Budget 설정
4. "저장" 버튼 클릭
5. 활성화하려면 설정 목록에서 "활성화" 버튼 클릭

#### API 키 설정하기
1. 관리자 페이지 > 설정으로 이동
2. API 설정 탭 선택
3. Gemini API 키 입력
4. "저장" 버튼 클릭

### 학생 사용 가이드

#### 문제 풀기
1. 수업 화면에서 문제 선택
2. 문제 내용 확인 (텍스트 또는 이미지)
3. 답변 또는 질문 입력
4. 전송 버튼 클릭
5. AI 응답 확인:
   - 진단 결과 (이해도, 개념 지식, 오류 패턴, 자신감)
   - 추천 단계 (폴리아 4단계 중 하나)
   - 다음 질문 제안
6. 대화 계속 진행

---

## 👨‍💻 개발 가이드

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

### 주요 컴포넌트 설명

#### MathTutorDiagnostic.tsx
- 메인 수업 화면 컴포넌트
- 문제 선택, AI 대화, 진단 결과 표시 담당
- Gemini API 호출 로직 포함
- LocalStorage에서 LLM 설정 로드 및 적용

#### admin/problems/page.tsx
- 문제 관리 페이지
- 문제 CRUD, 검색, 필터 기능
- 커스텀 셀렉트 컴포넌트 (학년/단원 관리)
- 이미지 업로드 및 미리보기

#### admin/prompt/page.tsx
- AI 연동 페이지
- LLM 설정 CRUD
- JSON 스키마 편집기
- 프롬프트 관리

### 커스텀 이벤트

#### llmConfigUpdated
- LLM 설정이 업데이트될 때 발생
- 수업 화면에서 설정 변경 감지용
- `window.dispatchEvent(new CustomEvent('llmConfigUpdated'))`

### 주의사항

1. **LocalStorage 제한**
   - 브라우저별 저장 용량 제한 (일반적으로 5-10MB)
   - 이미지 데이터는 Base64로 저장되므로 용량 증가 주의

2. **API 키 보안**
   - API 키는 LocalStorage에 저장되므로 클라이언트에 노출됨
   - 프로덕션에서는 서버 사이드 API 호출 고려

3. **JSON Schema 검증**
   - 입력/출력 스키마는 JSON 형식이어야 함
   - 저장 시 JSON 파싱 검증 수행

---

## 🧪 테스트 가이드

### 수동 테스트 체크리스트

#### 문제 관리 테스트
- [ ] 문제 추가 (텍스트)
- [ ] 문제 추가 (이미지)
- [ ] 문제 수정
- [ ] 문제 삭제
- [ ] 문제 검색
- [ ] 학년/단원 필터
- [ ] 학년 동적 추가
- [ ] 단원 동적 추가

#### AI 설정 테스트
- [ ] LLM 설정 추가
- [ ] LLM 설정 수정
- [ ] LLM 설정 삭제
- [ ] LLM 설정 활성화
- [ ] 스키마 편집 및 저장
- [ ] 프롬프트 편집 및 저장
- [ ] 모델 파라미터 변경

#### API 호출 테스트 (중요!)
- [ ] 관리자에서 설정한 값이 실제 API 호출에 적용되는지 확인
- [ ] 모델 변경 시 API 호출 확인
- [ ] Temperature 변경 시 응답 차이 확인
- [ ] Max Output Tokens 제한 확인
- [ ] Thinking Budget 적용 확인
- [ ] Response Schema 적용 확인
- [ ] System Prompt 변경 시 응답 차이 확인

#### 통합 테스트
- [ ] 문제 추가 후 수업 화면에서 표시 확인
- [ ] LLM 설정 변경 후 수업 화면에서 적용 확인
- [ ] API 키 설정 후 API 호출 성공 확인
- [ ] 설정 없을 때 기본값 적용 확인

### API 호출 검증 방법

1. **브라우저 개발자 도구 사용**
   - Network 탭에서 API 호출 확인
   - Request Payload 확인:
     - `generationConfig.temperature` 값 확인
     - `generationConfig.maxOutputTokens` 값 확인
     - `generationConfig.responseMimeType` 값 확인
     - `generationConfig.responseSchema` 값 확인 (application/json인 경우)
     - `generationConfig.thinkingConfig.thinkingBudget` 값 확인
     - `systemInstruction.parts[0].text` 값 확인 (프롬프트)

2. **콘솔 로그 확인**
   - `MathTutorDiagnostic.tsx`에서 API 호출 전 로그 출력
   - 실제 사용되는 설정 값 확인

3. **응답 확인**
   - API 응답 형식이 설정한 Schema와 일치하는지 확인
   - 응답 내용이 프롬프트 지시사항을 따르는지 확인

---

## 🔄 업데이트 이력

### v1.0.0 (2025-11)
- 초기 버전 릴리스
- 문제 관리 기능
- AI 연동 기능 (LLM 설정 관리)
- 관리자 페이지 구현
- LocalStorage 기반 데이터 저장
- Gemini API 연동

---

## 📞 문의 및 지원

문제가 발생하거나 질문이 있으시면 개발팀에 문의해주세요.

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025년 11월

