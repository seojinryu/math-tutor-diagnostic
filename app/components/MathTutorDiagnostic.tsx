'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, MessageCircle, Brain, Settings, BookOpen, Key, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

/**********************
 * Types
 **********************/
export interface DiagnosticData {
  diagnosis: {
    problem_understanding: 'low' | 'medium' | 'high';
    concept_knowledge: 'low' | 'medium' | 'high';
    error_pattern: 'none' | 'calculation_error' | 'logical_error' | 'concept_confusion' | 'approach_error';
    learning_style: 'visual' | 'logical' | 'experimental' | 'unknown';
    confidence_level: 'low' | 'medium' | 'high';
  };
  recommended_stage: '1' | '2' | '3' | '4';
  stage_reason: string;
  next_question: string;
}

export interface Message {
  id: string;
  type: 'student' | 'llm';
  content: string;
  timestamp: string;
  diagnostic?: DiagnosticData | null;
  rawResponse?: string;
  isError?: boolean;
  debug?: string;
}

/**********************
 * Utilities
 **********************/
const nowTime = () =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date());

const uid = () => Math.random().toString(36).slice(2);

const STAGES: Record<string, { color: string; label: string }> = {
  '1': { color: 'bg-blue-100 text-blue-800', label: '문제 이해하기' },
  '2': { color: 'bg-green-100 text-green-800', label: '계획 세우기' },
  '3': { color: 'bg-orange-100 text-orange-800', label: '계획 실행하기' },
  '4': { color: 'bg-purple-100 text-purple-800', label: '되돌아보기' },
};

function parseJsonLoose(text: string): unknown {
  const trim = (s: string) => s.trim();

  const tryParse = (src: string) => {
    const s = trim(src);
    return JSON.parse(s);
  };

  // 1) 그대로 시도
  try {
    return tryParse(text);
  } catch { /* fallthrough */ }

  // 2) ```json ... ``` 펜스 제거
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) {
    try {
      return tryParse(fenced[1]);
    } catch { /* fallthrough */ }
  }

  // 3) 첫 { ~ 마지막 } 범위만 추출
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i !== -1 && j !== -1 && j > i) {
    const candidate = text.slice(i, j + 1);
    try {
      return tryParse(candidate);
    } catch { /* fallthrough */ }
  }

  // 4) 스마트따옴표 → 표준따옴표
  const normalizedQuotes = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  try {
    return tryParse(normalizedQuotes);
  } catch { /* fallthrough */ }

  // 5) 트레일링 콤마 제거
  const noTrailingCommas = normalizedQuotes.replace(/,\s*([}\]])/g, '$1');
  return tryParse(noTrailingCommas); // 실패하면 여기서 throw
}

/**********************
 * Minimal runtime validation (no external deps)
 **********************/
function isEnum<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v);
}

function validateDiagnostic(obj: unknown): asserts obj is DiagnosticData {
  if (!obj || typeof obj !== 'object') throw new Error('진단 객체가 비어있습니다.');
  const o = obj as Record<string, unknown>;
  const d = o.diagnosis as Record<string, unknown> | undefined;
  if (!d || typeof d !== 'object') throw new Error('diagnosis 필드가 없습니다.');
  if (!isEnum(d.problem_understanding, ['low', 'medium', 'high'] as const)) throw new Error('problem_understanding 값 오류');
  if (!isEnum(d.concept_knowledge, ['low', 'medium', 'high'] as const)) throw new Error('concept_knowledge 값 오류');
  if (!isEnum(d.error_pattern, ['none', 'calculation_error', 'logical_error', 'concept_confusion', 'approach_error'] as const)) throw new Error('error_pattern 값 오류');
  if (!isEnum(d.learning_style, ['visual', 'logical', 'experimental', 'unknown'] as const)) throw new Error('learning_style 값 오류');
  if (!isEnum(d.confidence_level, ['low', 'medium', 'high'] as const)) throw new Error('confidence_level 값 오류');
  if (!isEnum(o.recommended_stage, ['1', '2', '3', '4'] as const)) throw new Error('recommended_stage 값 오류');
  if (typeof o.stage_reason !== 'string') throw new Error('stage_reason은 문자열이어야 합니다.');
  if (typeof o.next_question !== 'string') throw new Error('next_question은 문자열이어야 합니다.');
}

/**********************
 * Providers (unified signature)
 **********************/

export type Provider = 'gemini' | 'openai' | 'claude';

interface ProviderArgs {
  apiKey: string;
  systemPrompt: string;
  problem: string;
  userMessage: string;
  context: string;
  signal?: AbortSignal;
}

const SYSTEM_PROMPT_BASE = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 LLM입니다. 
주어진 학생의 응답과 문제 데이터를 분석하여 다음을 수행하세요:

### **입력 데이터**
- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}
- **학생 응답**: {학생의 답변, 풀이 과정, 또는 질문, 예: "근이 뭔지 모르겠어요", "x = 2, 4", 또는 "(x-2)(x-4) = 0"}
- **컨텍스트** (선택 사항): {이전 대화 이력, 학생의 학습 스타일(시각적/논리적/실험적), 과거 오류 패턴}

### **임무**
1. **학생 상태 진단**:
   - **문제 이해도**: 학생이 문제의 요구사항(예: 근 구하기)을 파악했는지? (낮음/중간/높음)
   - **개념 지식**: 관련 수학 개념(예: 이차방정식, 인수분해)을 이해하는 수준 (낮음/중간/높음)
   - **오류 패턴**: 계산 실수, 논리 오류, 개념 혼동, 접근법 선택 오류 등 식별
   - **학습 스타일**: 시각적(다이어그램 선호), 논리적(공식 선호), 실험적(대입 시도) 중 선호 추정
   - **자신감 수준**: 학생의 답변에서 드러나는 태도 (낮음: 좌절/망설임, 중간: 보통, 높음: 자신감)

2. **폴리아 4단계 추천**:
   - 진단 결과에 따라 적합한 폴리아 단계(1~4) 추천
   - 이유 설명: 왜 해당 단계를 추천하는지 간단히 기술

3. **다음 질문 제안**:
   - 학생의 상태에 맞춘 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?") 

### **출력 형식**
{
  "diagnosis": {
    "problem_understanding": "low/medium/high",
    "concept_knowledge": "low/medium/high",
    "error_pattern": "none/calculation_error/logical_error/concept_confusion/approach_error",
    "learning_style": "visual/logical/experimental/unknown",
    "confidence_level": "low/medium/high"
  },
  "recommended_stage": "1/2/3/4",
  "stage_reason": "추천 이유 설명",
  "next_question": "학생에게 제안할 질문 또는 힌트"
}`;

const SYSTEM_PROMPT_JSON_ONLY = `${SYSTEM_PROMPT_BASE}

---
반드시 위의 형식과 일치하는 **순수 JSON 객체 하나만** 출력하세요. 코드블록(\`\`\`), 마크다운, 주석, 추가 설명, 접두/접미 텍스트를 금지합니다.`;

const buildContext = (msgs: Message[]) =>
  msgs
    .slice(-10)
    .filter((m) => m.type === 'student')
    .map((m) => `학생: ${m.content}`)
    .join('\n');

/**********************
 * Gemini minimal types
 **********************/
interface GeminiInlineData { data: string }
interface GeminiFunctionCall { name: string }
interface GeminiPart { text?: string; inlineData?: GeminiInlineData; functionCall?: GeminiFunctionCall }
interface GeminiCandidate { content?: { parts?: GeminiPart[] }; finishReason?: string }
interface GeminiResponse { promptFeedback?: { blockReason?: string }; candidates?: GeminiCandidate[] }

/**********************
 * Provider Calls
 **********************/
async function callGemini({ apiKey, systemPrompt, problem, userMessage, context, signal }: ProviderArgs): Promise<DiagnosticData> {
  const responseSchema = {
    type: "OBJECT",
    properties: {
      diagnosis: {
        type: "OBJECT",
        properties: {
          problem_understanding: { type: "STRING", enum: ["low","medium","high"] },
          concept_knowledge:    { type: "STRING", enum: ["low","medium","high"] },
          error_pattern:        { type: "STRING", enum: ["none","calculation_error","logical_error","concept_confusion","approach_error"] },
          learning_style:       { type: "STRING", enum: ["visual","logical","experimental","unknown"] },
          confidence_level:     { type: "STRING", enum: ["low","medium","high"] }
        },
        required: ["problem_understanding","concept_knowledge","error_pattern","learning_style","confidence_level"]
      },
      recommended_stage: { type: "STRING", enum: ["1","2","3","4"] },
      stage_reason:      { type: "STRING" },
      next_question:     { type: "STRING" }
    },
    required: ["diagnosis","recommended_stage","stage_reason","next_question"]
  } as const;

  const body = {
    // 시스템 프롬프트는 별도 필드로
    systemInstruction: {
      role: "system",
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [{
          text:
            `### 실제 입력 데이터\n` +
            `- 문제: ${problem}\n` +
            `- 학생 응답: ${userMessage}\n` +
            `- 컨텍스트: ${context}`
        }]
      }
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1000,
      responseMimeType: "application/json",
      // 💡 스키마 강제: JSON 외 다른 포맷 방지
      responseSchema
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, signal, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API 오류: ${res.status} ${res.statusText} - ${t}`);
  }

  const data = (await res.json()) as GeminiResponse & {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string, inlineData?: { data: string } }> } }>;
  };

  // 안전성/차단 사유 먼저 체크
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) {
    throw new Error(`안전성 정책으로 차단됨: ${blocked}`);
  }

  // 1순위: text 파트
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  let text = "";
  for (const p of parts) {
    if (typeof p?.text === "string" && p.text.trim()) {
      text = p.text.trim();
      break;
    }
  }

  // 2순위: inlineData(base64) 파트
  if (!text) {
    for (const p of parts) {
      const b64 = p?.inlineData?.data;
      if (b64) {
        try {
          const decoded = typeof globalThis.atob === "function" ? globalThis.atob(b64) : "";
          if (decoded.trim()) {
            text = decoded.trim();
            break;
          }
        } catch { /* ignore */ }
      }
    }
  }

  if (!text) {
    // 디버깅을 돕기 위해 finishReason 힌트 포함
     const finish = data?.candidates?.[0]?.finishReason;
    const hint = finish ? ` (finishReason: ${finish})` : "";
    throw new Error(`Gemini 응답에서 JSON 본문을 찾지 못했습니다.${hint}`);
  }

  const parsed = parseJsonLoose(text);
  validateDiagnostic(parsed);
  return parsed;
}

async function callOpenAI({ apiKey, systemPrompt, problem, userMessage, context, signal }: ProviderArgs): Promise<DiagnosticData> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `### 실제 입력 데이터
- 문제: ${problem}
- 학생 응답: ${userMessage}
- 컨텍스트: ${context}` },
      ],
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI API 오류: ${res.status} ${res.statusText} - ${t}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('OpenAI 응답에 content가 없습니다.');
  const parsed = parseJsonLoose(text);
  validateDiagnostic(parsed);
  return parsed;
}

async function callClaude({ apiKey, systemPrompt, problem, userMessage, context, signal }: ProviderArgs): Promise<DiagnosticData> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal,
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      system: systemPrompt,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content:
            `### 실제 입력 데이터
` +
            `- 문제: ${problem}
` +
            `- 학생 응답: ${userMessage}
` +
            `- 컨텍스트: ${context}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API 오류: ${res.status} ${res.statusText} - ${t}`);
  }
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const contentArr = data?.content ?? [];
  const text = contentArr.map((c) => (c?.type === 'text' && c.text ? c.text : '')).join('').trim();
  if (!text) throw new Error('Claude 응답에 텍스트가 없습니다.');

  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i === -1 || j === -1 || j <= i) throw new Error('Claude 응답에서 JSON을 찾지 못했습니다.');
  const parsed = JSON.parse(text.slice(i, j + 1)) as unknown;
  validateDiagnostic(parsed);
  return parsed;
}

const providerMap: Record<Provider, (a: ProviderArgs) => Promise<DiagnosticData>> = {
  gemini: callGemini,
  openai: callOpenAI,
  claude: callClaude,
};

/**********************
 * Component
 **********************/
const MathTutorDiagnostic: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentProblem, setCurrentProblem] = useState(
  `어느 달팽이는 한 시간에 42m를 갑니다. 이 달팽이가 같은 빠르기로 20분 동안 갈 수 있는 거리는 몇 m입니까?
객관식 보기: ① 13m ② 13¾m ③ 14m ④ 14⅓m`
);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [apiProvider, setApiProvider] = useState<Provider>('gemini');
  const [currentDiagnostic, setCurrentDiagnostic] = useState<DiagnosticData | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const SYSTEM_PROMPT_JSON = useMemo(() => SYSTEM_PROMPT_JSON_ONLY, []);

  // load stored key on provider change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLocal = localStorage.getItem(`${apiProvider}_api_key`);
    const storedSession = sessionStorage.getItem(`${apiProvider}_api_key`);
    const stored = storedLocal ?? storedSession ?? '';
    if (stored) {
      setApiKey(stored);
      setShowApiKeyInput(false);
      setRememberKey(Boolean(storedLocal));
    } else {
      setApiKey('');
      setShowApiKeyInput(true);
      setRememberKey(false);
    }
  }, [apiProvider]);

  const saveApiKey = () => {
    if (!apiKey.trim() || typeof window === 'undefined') return;
    localStorage.removeItem(`${apiProvider}_api_key`);
    sessionStorage.removeItem(`${apiProvider}_api_key`);
    if (rememberKey) localStorage.setItem(`${apiProvider}_api_key`, apiKey.trim());
    else sessionStorage.setItem(`${apiProvider}_api_key`, apiKey.trim());
    setShowApiKeyInput(false);
  };

  const clearApiKey = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${apiProvider}_api_key`);
    sessionStorage.removeItem(`${apiProvider}_api_key`);
    setApiKey('');
    setShowApiKeyInput(true);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentDiagnostic(null);
  };

  const contextText = useMemo(() => buildContext(messages), [messages]);

  const sendToProvider = useCallback(async (userMessage: string) => {
    const fn = providerMap[apiProvider];
    const args: ProviderArgs = {
      apiKey,
      systemPrompt: SYSTEM_PROMPT_JSON,
      problem: currentProblem,
      userMessage,
      context: contextText,
      signal: abortRef.current?.signal,
    };
    return fn(args);
  }, [apiKey, apiProvider, SYSTEM_PROMPT_JSON, currentProblem, contextText]);

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    if (!apiKey) {
      alert('API 키를 먼저 입력해주세요.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    const studentMessage: Message = {
      id: uid(),
      type: 'student',
      content: currentInput,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, studentMessage]);

    try {
      const diagnostic = await sendToProvider(currentInput);
      setCurrentDiagnostic(diagnostic);
      const llmMessage: Message = {
        id: uid(),
        type: 'llm',
        content: '',
        diagnostic,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, llmMessage]);
      setCurrentInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      const llmMessage: Message = {
        id: uid(),
        type: 'llm',
        content: `오류가 발생했습니다: ${msg}`,
        timestamp: nowTime(),
        isError: true,
        debug: err instanceof Error ? String(err.stack ?? '') : undefined,
      };
      setMessages((prev) => [...prev, llmMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const stagePill = (stage?: string) => {
    if (!stage) return null;
    const meta = STAGES[stage] || { color: 'bg-gray-100 text-gray-800', label: '단계 미정' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${meta.color}`}>
        단계 {stage}: {meta.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Brain className="text-blue-600" />
          수학 교육용 LLM 진단 시스템 (Rewritten)
        </h1>
        <p className="text-gray-600">안정성(스키마 검증)·성능(컨텍스트 슬라이싱)·UX(권장 질문 버튼) 강화 버전</p>
      </div>

      {showApiKeyInput ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <Key className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">LLM API를 사용하려면 API 키를 입력하세요.</p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value as Provider)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="gemini">Google Gemini 2.5 Pro</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="claude">Anthropic (Claude 3.5)</option>
                  </select>
                  <input
                    type="password"
                    placeholder={
                      apiProvider === 'gemini'
                        ? 'Google Gemini API 키'
                        : apiProvider === 'openai'
                        ? 'OpenAI API 키'
                        : 'Anthropic API 키'
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value.trim())}
                    className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 min-w-[260px] max-w-md"
                    aria-label="API 키 입력"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
                    이 브라우저에 저장하기
                  </label>
                  <button onClick={saveApiKey} className="bg-yellow-600 text-white px-4 py-1 rounded text-sm hover:bg-yellow-700">
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <Key className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-green-700">
              {apiProvider === 'gemini' ? 'Google Gemini 2.5 Pro' : apiProvider === 'openai' ? 'OpenAI (GPT-4o)' : 'Anthropic (Claude 3.5)'} API 키가 설정되었습니다.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
              이 브라우저에 저장하기
            </label>
            <button onClick={clearApiKey} className="text-sm text-green-600 hover:text-green-800">
              API 키 변경
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="text-green-600" size={20} />
          현재 문제
        </h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <textarea
            value={currentProblem}
            onChange={(e) => setCurrentProblem(e.target.value)}
            className="w-full bg-transparent border-none resize-none focus:outline-none text-gray-800 font-medium"
            rows={3}
            aria-label="현재 문제 입력"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-blue-600" size={20} />
                학생-LLM 대화
              </h2>
              <button onClick={clearChat} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100">
                대화 초기화
              </button>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && <div className="text-center text-gray-500 py-8">학생의 첫 메시지를 기다리고 있습니다...</div>}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-sm rounded-lg p-3 ${
                    message.isError
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : message.type === 'student'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  aria-live={message.isError ? 'assertive' : 'polite'}
                >
                  <div className="text-sm font-medium mb-1">{message.type === 'student' ? '학생' : 'LLM'}</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content || (message.diagnostic ? '진단 JSON이 수신되었습니다.' : '')}
                  </div>
                  {message.isError && (
                    <div className="mt-2 text-xs">
                      <button
                        onClick={() => setShowErrorDetail((s) => !s)}
                        className="flex items-center gap-1 underline"
                      >
                        {showErrorDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        상세 보기
                      </button>
                      {showErrorDetail && message.debug && (
                        <pre className="bg-red-50 border border-red-200 rounded p-2 overflow-auto mt-1">{message.debug}</pre>
                      )}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">{message.timestamp}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-xs ml-2">{apiProvider.toUpperCase()} 응답 생성 중…</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            {/* 권장 다음 질문 버튼 */}
            {currentDiagnostic?.next_question && (
              <div className="mb-2 flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-xs flex items-center gap-1 hover:bg-indigo-700"
                  onClick={() => setCurrentInput((p) => (p ? p : currentDiagnostic.next_question))}
                  title="권장 질문을 입력창에 채우기"
                >
                  <Wand2 className="w-4 h-4" /> 권장 다음 질문 넣기
                </button>
                <span className="text-xs text-gray-600 truncate">{currentDiagnostic.next_question}</span>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="학생 메시지를 입력하세요..."
                className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                rows={2}
                disabled={isLoading}
                aria-label="학생 메시지 입력"
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading || !apiKey}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="메시지 전송"
              >
                <Send size={16} />
                전송
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Panel */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="text-purple-600" size={20} />
              실시간 진단 결과
            </h2>
          </div>

          <div className="p-4 h-96 overflow-y-auto">
            {currentDiagnostic && (
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 mb-4">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">⚡ 현재 진단 상태</h3>
                <div className="mb-3">{stagePill(currentDiagnostic.recommended_stage)}</div>

                <div className="bg-white rounded p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      문제 이해도: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.problem_understanding}</span>
                    </div>
                    <div>
                      개념 지식: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.concept_knowledge}</span>
                    </div>
                    <div>
                      오류 패턴: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.error_pattern}</span>
                    </div>
                    <div>
                      자신감: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.confidence_level}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded p-3 mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">추천 이유</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentDiagnostic.stage_reason}</p>
                </div>

                <div className="bg-white rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">실시간 JSON</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(currentDiagnostic, null, 2)}</pre>
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                학생이 메시지를 보내면
                <br />
                진단 결과가 여기에 표시됩니다.
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700 border-b pb-2">진단 히스토리</h3>
                {messages
                  .filter((m) => m.type === 'llm' && m.diagnostic)
                  .map((m) => (
                    <div key={m.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          {stagePill(m.diagnostic!.recommended_stage)}
                          <span className="text-xs text-gray-500">{m.timestamp}</span>
                        </div>
                      </div>

                      <div className="bg-white rounded p-3 mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">진단 상태</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            문제 이해도: <span className="font-medium">{m.diagnostic!.diagnosis.problem_understanding}</span>
                          </div>
                          <div>
                            개념 지식: <span className="font-medium">{m.diagnostic!.diagnosis.concept_knowledge}</span>
                          </div>
                          <div>
                            오류 패턴: <span className="font-medium">{m.diagnostic!.diagnosis.error_pattern}</span>
                          </div>
                          <div>
                            자신감: <span className="font-medium">{m.diagnostic!.diagnosis.confidence_level}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-gray-900 mb-2">JSON 출력</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(m.diagnostic, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Settings className="text-gray-600" size={20} />
          시스템 프롬프트 (폴리아 4단계 기반 진단)
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{SYSTEM_PROMPT_BASE}

[실행 정책]
- 응답은 가능한 한 JSON만 받습니다.
- Gemini는 responseMimeType=application/json 강제.
- OpenAI는 response_format=json_object 사용.
- Claude는 JSON 경계 추출 + 검증 수행.
- 수신 JSON은 런타임 검증(validateDiagnostic) 후 반영합니다.</pre>
        </div>
      </div>
    </div>
  );
};

export default MathTutorDiagnostic;
