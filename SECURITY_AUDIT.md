# 보안 이슈 분석 및 개선 방안

**작성일**: 2025년 11월  
**버전**: 1.0.0

---

## 🔴 심각한 보안 이슈 (High Priority)

### 1. API 키 노출 (Critical)

#### 문제점
- **클라이언트 사이드 API 키 노출**
  - `NEXT_PUBLIC_GEMINI_API_KEY` 환경 변수가 클라이언트 번들에 포함됨
  - LocalStorage에 API 키가 평문으로 저장됨
  - API 키가 URL 쿼리 파라미터로 노출됨 (`?key=${apiKey}`)
  - `/api/config` 엔드포인트가 API 키를 그대로 반환

#### 영향
- API 키가 브라우저 개발자 도구에서 확인 가능
- 공격자가 API 키를 탈취하여 무단 사용 가능
- 비용 발생 및 서비스 남용 가능

#### 현재 코드 위치
```typescript
// app/components/MathTutorDiagnostic.tsx:386
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  ...
);

// app/api/config/route.ts:5
return NextResponse.json({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
});
```

#### 개선 방안
1. **서버 사이드 프록시 구현**
   ```typescript
   // app/api/gemini/route.ts (새로 생성)
   import { NextRequest, NextResponse } from 'next/server';
   
   export async function POST(req: NextRequest) {
     const apiKey = process.env.GEMINI_API_KEY; // 서버 전용 (NEXT_PUBLIC_ 없음)
     const body = await req.json();
     
     const res = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent`,
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'x-goog-api-key': apiKey // 헤더로 전송
         },
         body: JSON.stringify(body.payload)
       }
     );
     
     return NextResponse.json(await res.json());
   }
   ```

2. **API 키 제거**
   - 클라이언트에서 API 키를 직접 사용하지 않도록 변경
   - 모든 Gemini API 호출을 서버 사이드로 이동

3. **API 키 입력 제거**
   - 클라이언트에서 API 키를 입력받지 않도록 변경
   - 서버 환경 변수로만 관리

---

### 2. 인증/인가 부재 (Critical)

#### 문제점
- **관리자 페이지 접근 제어 없음**
  - `/admin/*` 경로에 인증 없이 접근 가능
  - 누구나 문제, 설정, API 키를 수정/삭제 가능

#### 영향
- 무단 접근으로 데이터 조작 가능
- API 키 및 설정 변경 가능
- 시스템 전체 보안 위협

#### 개선 방안
1. **기본 인증 구현**
   ```typescript
   // app/api/auth/route.ts
   export async function POST(req: NextRequest) {
     const { password } = await req.json();
     const adminPassword = process.env.ADMIN_PASSWORD;
     
     if (password === adminPassword) {
       // 세션 생성
       return NextResponse.json({ success: true });
     }
     return NextResponse.json({ success: false }, { status: 401 });
   }
   ```

2. **세션 관리**
   - 쿠키 또는 JWT를 사용한 세션 관리
   - 관리자 페이지 접근 전 인증 확인

3. **간단한 대안 (초기 단계)**
   - 로컬 환경에서만 사용하는 경우: 로컬 IP 화이트리스트
   - 또는 간단한 비밀번호 입력 화면

---

## 🟡 중간 수준 보안 이슈 (Medium Priority)

### 3. LocalStorage 보안

#### 문제점
- **민감 정보 평문 저장**
  - API 키, 설정, 문제 데이터가 평문으로 저장
  - XSS 공격 시 LocalStorage 데이터 탈취 가능

#### 개선 방안
1. **민감 정보 최소화**
   - API 키를 LocalStorage에 저장하지 않음
   - 서버 세션에서만 관리

2. **데이터 암호화** (선택사항)
   - LocalStorage 데이터 암호화 (AES-256 등)
   - 브라우저 내장 암호화 API 사용

---

### 4. XSS (Cross-Site Scripting) 취약점

#### 문제점
- **사용자 입력 직접 렌더링**
  - 문제 내용, 학생 메시지, AI 응답이 직접 렌더링될 수 있음
  - React의 기본 이스케이핑에 의존

#### 확인 필요 사항
- 문제 내용이 `dangerouslySetInnerHTML`로 렌더링되는지 확인
- 메시지 내용의 HTML 태그 처리

#### 개선 방안
1. **입력 검증 및 이스케이핑**
   ```typescript
   // HTML 태그 제거
   const sanitizeInput = (input: string) => {
     return input.replace(/<[^>]*>/g, '');
   };
   ```

2. **React의 기본 이스케이핑 확인**
   - React는 기본적으로 XSS를 방지하지만, `dangerouslySetInnerHTML` 사용 시 주의 필요

---

### 5. 입력 검증 부족

#### 문제점
- **JSON 파싱 에러 처리만 수행**
  - 사용자 입력에 대한 검증이 부족할 수 있음
  - 파일 업로드 시 파일 타입/크기 검증 확인 필요

#### 개선 방안
1. **입력 길이 제한**
   ```typescript
   const MAX_MESSAGE_LENGTH = 1000;
   if (userMessage.length > MAX_MESSAGE_LENGTH) {
     throw new Error('메시지가 너무 깁니다.');
   }
   ```

2. **파일 업로드 검증**
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
   
   if (file.size > MAX_FILE_SIZE) {
     throw new Error('파일 크기가 너무 큽니다.');
   }
   if (!ALLOWED_TYPES.includes(file.type)) {
     throw new Error('지원하지 않는 파일 형식입니다.');
   }
   ```

---

### 6. API 호출 로깅

#### 문제점
- **디버그 로그에 민감 정보 포함**
  - API 키, 프롬프트 내용이 콘솔에 출력됨
  - 프로덕션 환경에서도 로그가 출력될 수 있음

#### 개선 방안
1. **환경별 로깅 제어**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     console.log('🔍 [API 호출 설정 확인]', {...});
   }
   ```

2. **민감 정보 마스킹**
   ```typescript
   console.log('🔍 [API 호출 설정 확인]', {
     ...config,
     apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'not set'
   });
   ```

---

## 🟢 낮은 수준 보안 이슈 (Low Priority)

### 7. CORS 설정

#### 문제점
- **외부 API 직접 호출**
  - Gemini API를 클라이언트에서 직접 호출
  - CORS 정책에 의존

#### 개선 방안
- 서버 사이드 프록시 구현 시 해결됨

---

### 8. Rate Limiting 부재

#### 문제점
- **API 호출 제한 없음**
  - 사용자가 무제한으로 API 호출 가능
  - 비용 발생 및 서비스 남용 가능

#### 개선 방안
1. **클라이언트 사이드 제한**
   ```typescript
   const MAX_REQUESTS_PER_MINUTE = 10;
   // 요청 간격 제한
   ```

2. **서버 사이드 제한** (권장)
   - 서버 프록시에서 Rate Limiting 구현

---

## 📋 우선순위별 개선 계획

### Phase 1: 즉시 적용 (Critical)
1. ✅ API 키를 서버 사이드로 이동
2. ✅ 관리자 페이지 인증 추가
3. ✅ 프로덕션 로깅 제거

### Phase 2: 단기 개선 (Medium)
4. ✅ 입력 검증 강화
5. ✅ 파일 업로드 검증
6. ✅ XSS 방지 확인

### Phase 3: 장기 개선 (Low)
7. ✅ Rate Limiting 구현
8. ✅ 데이터 암호화 고려

---

## 🛡️ 보안 체크리스트

### 현재 상태
- [ ] API 키 서버 사이드 관리
- [ ] 관리자 페이지 인증
- [ ] 입력 검증 및 검사
- [ ] XSS 방지 확인
- [ ] 파일 업로드 검증
- [ ] 프로덕션 로깅 제거
- [ ] Rate Limiting 구현
- [ ] HTTPS 강제 (프로덕션)

### 권장 사항
- [ ] 정기적인 보안 감사
- [ ] 의존성 취약점 스캔 (`npm audit`)
- [ ] Content Security Policy (CSP) 설정
- [ ] 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options 등)

---

## 📝 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Gemini API Security](https://ai.google.dev/gemini-api/docs/security)

---

**중요**: 프로덕션 배포 전 반드시 Critical 수준의 보안 이슈들을 해결해야 합니다.

