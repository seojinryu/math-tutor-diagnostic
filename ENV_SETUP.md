# 환경 변수 설정 가이드

## 필수 환경 변수

### 로컬 개발 환경

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
GEMINI_API_KEY=your_api_key_here
```

**중요**: 
- `NEXT_PUBLIC_` 접두사를 사용하지 마세요! (클라이언트에 노출됨)
- `.env.local` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

### 프로덕션 환경 (Vercel)

1. Vercel 대시보드 접속
2. 프로젝트 선택 > Settings > Environment Variables
3. 다음 변수 추가:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 실제 API 키 값
   - **Environment**: Production, Preview, Development 모두 선택 (또는 필요에 따라 선택)

## 환경 변수 확인

### 서버 사이드에서 확인
서버 사이드 API 엔드포인트 (`app/api/gemini/route.ts`)에서 다음 코드로 확인:
```typescript
const apiKey = process.env.GEMINI_API_KEY; // 서버 사이드에서만 접근 가능
```

### API 키가 설정되지 않은 경우
- 서버에서 에러 반환: "API 키가 설정되지 않았습니다. 서버 환경 변수 GEMINI_API_KEY를 확인하세요."
- 클라이언트에서 API 호출 실패

## 보안 주의사항

✅ **올바른 설정**:
- `GEMINI_API_KEY` (서버 전용)
- `.env.local` 파일에 저장 (Git에 커밋되지 않음)
- Vercel 환경 변수로 관리

❌ **잘못된 설정**:
- `NEXT_PUBLIC_GEMINI_API_KEY` (클라이언트에 노출됨)
- 코드에 직접 하드코딩
- Git에 커밋

## 문제 해결

### API 키가 작동하지 않는 경우

1. **환경 변수 이름 확인**
   ```bash
   # 잘못된 예
   NEXT_PUBLIC_GEMINI_API_KEY=xxx ❌
   
   # 올바른 예
   GEMINI_API_KEY=xxx ✅
   ```

2. **서버 재시작**
   - 환경 변수 변경 후 개발 서버 재시작 필요
   ```bash
   npm run dev
   ```

3. **Vercel 재배포**
   - 환경 변수 변경 후 Vercel에서 재배포 필요

4. **로그 확인**
   - 서버 로그에서 API 키 관련 에러 확인
   - 브라우저 개발자 도구 Network 탭에서 `/api/gemini` 요청 확인

