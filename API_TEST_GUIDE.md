# API 호출 테스트 가이드

## 목적
웹 상에서 설정한 값(문제/AI 연동 설정)이 실제 API 호출 시 제대로 적용되는지 확인합니다.

## 테스트 방법

### 1. 브라우저 개발자 도구 준비

1. 브라우저에서 수업 화면 열기 (`http://localhost:3001`)
2. 개발자 도구 열기 (F12 또는 Cmd+Option+I)
3. **Console** 탭과 **Network** 탭 열기

### 2. 설정 확인

#### 2.1 LLM 설정 확인
1. 관리자 페이지 > AI 연동으로 이동
2. 현재 활성화된 설정 확인
3. 설정 값 기록:
   - Model: `gemini-2.5-pro`
   - Temperature: `0`
   - Max Output Tokens: `8192`
   - Thinking Budget: `1800`
   - Response MIME Type: `application/json`
   - System Prompt 길이 확인

#### 2.2 문제 확인
1. 관리자 페이지 > 문제 관리로 이동
2. 테스트할 문제 확인 또는 새 문제 추가

### 3. API 호출 테스트

#### 3.1 콘솔 로그 확인
1. 수업 화면으로 돌아가기
2. 문제 선택
3. 메시지 입력 및 전송
4. **Console 탭**에서 다음 로그 확인:
   ```
   🔍 [sendToGemini 호출 전 설정 확인]
   🔍 [API 호출 설정 확인]
   🔍 [API 요청 Body]
   ```
5. 각 로그에서 다음 값들이 설정한 값과 일치하는지 확인:
   - `model`: 설정한 모델명과 일치하는가?
   - `temperature`: 설정한 값과 일치하는가?
   - `maxOutputTokens`: 설정한 값과 일치하는가?
   - `thinkingBudget`: 설정한 값과 일치하는가?
   - `responseMimeType`: 설정한 값과 일치하는가?
   - `systemPromptPreview`: 설정한 프롬프트의 일부가 보이는가?

#### 3.2 Network 탭 확인
1. **Network 탭**에서 API 호출 확인
2. `generateContent` 요청 찾기
3. 요청 클릭하여 **Payload** 탭 확인
4. 다음 값들이 설정한 값과 일치하는지 확인:
   ```json
   {
     "generationConfig": {
       "temperature": 0,           // 설정한 값과 일치?
       "maxOutputTokens": 8192,   // 설정한 값과 일치?
       "responseMimeType": "application/json",  // 설정한 값과 일치?
       "responseSchema": { ... }, // responseMimeType이 application/json인 경우 존재
       "thinkingConfig": {
         "thinkingBudget": 1800   // 설정한 값과 일치?
       }
     },
     "systemInstruction": {
       "parts": [{
         "text": "당신은 폴리아의..."  // 설정한 프롬프트와 일치?
       }]
     }
   }
   ```

### 4. 설정 변경 테스트

#### 4.1 Temperature 변경 테스트
1. 관리자 페이지 > AI 연동으로 이동
2. 활성 설정 편집 또는 새 설정 추가
3. Temperature를 `0.5`로 변경
4. 저장 및 활성화
5. 수업 화면으로 돌아가서 새 메시지 전송
6. 콘솔 로그에서 `temperature: 0.5` 확인
7. Network 탭에서 요청 Payload의 `temperature: 0.5` 확인

#### 4.2 Model 변경 테스트
1. 관리자 페이지 > AI 연동으로 이동
2. 활성 설정 편집
3. Model을 `gemini-1.5-pro`로 변경 (가능한 모델로)
4. 저장 및 활성화
5. 수업 화면으로 돌아가서 새 메시지 전송
6. 콘솔 로그에서 `model: "gemini-1.5-pro"` 확인
7. Network 탭에서 요청 URL의 모델명 확인: `models/gemini-1.5-pro:generateContent`

#### 4.3 System Prompt 변경 테스트
1. 관리자 페이지 > AI 연동으로 이동
2. 활성 설정 편집
3. 시스템 프롬프트 수정 (예: 맨 앞에 "테스트 프롬프트" 추가)
4. 저장 및 활성화
5. 수업 화면으로 돌아가서 새 메시지 전송
6. 콘솔 로그에서 `systemPromptPreview`에 변경된 내용 확인
7. Network 탭에서 요청 Payload의 `systemInstruction.parts[0].text`에 변경된 내용 확인

#### 4.4 Response Schema 변경 테스트
1. 관리자 페이지 > AI 연동으로 이동
2. 활성 설정 편집
3. 출력 스키마 편집 (예: 필드 추가 또는 수정)
4. 저장 및 활성화
5. 수업 화면으로 돌아가서 새 메시지 전송
6. 콘솔 로그에서 `hasResponseSchema: true` 확인
7. Network 탭에서 요청 Payload의 `generationConfig.responseSchema`에 변경된 스키마 확인

### 5. 기본값 테스트 (Fallback)

#### 5.1 설정 제거 테스트
1. 브라우저 개발자 도구 > Application 탭 > Local Storage
2. `math_tutor_llm_configs` 삭제
3. `math_tutor_active_llm_config_id` 삭제
4. 페이지 새로고침
5. 수업 화면에서 메시지 전송
6. 콘솔 로그에서 기본값 사용 확인:
   - `model: "gemini-2.5-pro"`
   - `temperature: 0`
   - `maxOutputTokens: 8192`
   - `thinkingBudget: 1800`

### 6. 체크리스트

#### 필수 확인 사항
- [ ] 콘솔 로그에 설정 값이 출력되는가?
- [ ] Network 탭에서 API 요청이 발생하는가?
- [ ] 요청 Payload의 `temperature`가 설정한 값과 일치하는가?
- [ ] 요청 Payload의 `maxOutputTokens`가 설정한 값과 일치하는가?
- [ ] 요청 Payload의 `thinkingBudget`가 설정한 값과 일치하는가?
- [ ] 요청 Payload의 `responseMimeType`이 설정한 값과 일치하는가?
- [ ] 요청 Payload의 `systemInstruction.parts[0].text`가 설정한 프롬프트와 일치하는가?
- [ ] 요청 URL의 모델명이 설정한 모델과 일치하는가?
- [ ] `responseMimeType`이 `application/json`인 경우 `responseSchema`가 포함되는가?
- [ ] 설정 변경 후 새 API 호출에 변경사항이 반영되는가?
- [ ] 설정이 없을 때 기본값이 사용되는가?

#### 응답 확인 사항
- [ ] API 응답이 성공적으로 수신되는가?
- [ ] 응답 형식이 설정한 Schema와 일치하는가?
- [ ] 응답 내용이 프롬프트 지시사항을 따르는가?

## 문제 해결

### 설정이 적용되지 않는 경우

1. **LocalStorage 확인**
   - Application 탭 > Local Storage에서 `math_tutor_llm_configs` 확인
   - 활성 설정 ID 확인: `math_tutor_active_llm_config_id`

2. **페이지 새로고침**
   - 설정 변경 후 페이지 새로고침
   - 브라우저 캐시 클리어

3. **콘솔 에러 확인**
   - 개발자 도구 Console 탭에서 에러 메시지 확인
   - LLM 설정 로드 실패 메시지 확인

4. **이벤트 확인**
   - `llmConfigUpdated` 이벤트가 발생하는지 확인
   - `storage` 이벤트 리스너가 제대로 동작하는지 확인

### API 호출 실패하는 경우

1. **API 키 확인**
   - 설정 페이지에서 API 키가 올바르게 설정되었는지 확인
   - `localStorage.getItem('gemini_api_key')` 확인

2. **네트워크 확인**
   - Network 탭에서 요청 상태 확인
   - CORS 에러 확인
   - API 키 유효성 확인

3. **응답 확인**
   - API 응답 본문 확인
   - 에러 메시지 확인

## 테스트 결과 기록

테스트 결과를 아래 형식으로 기록하세요:

```
### 테스트 날짜: YYYY-MM-DD

#### 테스트 환경
- 브라우저: Chrome/Firefox/Safari
- URL: http://localhost:3001

#### 테스트 결과
1. Temperature 변경: ✅/❌
   - 설정 값: 0.5
   - 실제 API 요청 값: 0.5
   
2. Model 변경: ✅/❌
   - 설정 값: gemini-1.5-pro
   - 실제 API 요청 URL: models/gemini-1.5-pro:generateContent
   
3. System Prompt 변경: ✅/❌
   - 설정한 프롬프트 일부: "테스트 프롬프트..."
   - 실제 API 요청 프롬프트: "테스트 프롬프트..."
   
4. 기본값 테스트: ✅/❌
   - 설정 제거 후 기본값 사용 확인
   
#### 발견된 문제
- 문제 1: ...
- 문제 2: ...
```

---

**참고**: 이 테스트는 실제 API 호출을 수행하므로 API 키가 필요하며, API 사용량이 발생할 수 있습니다.

