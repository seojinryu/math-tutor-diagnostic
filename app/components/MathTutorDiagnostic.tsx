'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, MessageCircle, Brain, BookOpen, ChevronDown, ChevronUp, User, Plus, Edit2, Trash2, Check, X, List, Image, Upload, FileText, ChevronRight, Settings } from 'lucide-react';
import type { LLMConfig } from '../admin/prompt/page';
import { DEFAULT_RESPONSE_SCHEMA } from '../admin/prompt/page';

/**********************
 * Types
 **********************/
export interface Problem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  explanationImageUrl?: string;
  explanationText?: string;
  category?: string;
  grade?: string;
  unit?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticData {
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

export interface Message {
  id: string;
  type: 'student' | 'ai';
  content: string;
  timestamp: string;
  diagnostic?: DiagnosticData | null;
  rawResponse?: string;
  isError?: boolean;
  debug?: string;
  problemId?: string;
}

// LLMConfig는 admin/prompt/page에서 import

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

function escapeNewlinesInsideStrings(src: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
        out += ch;
      } else {
        out += ch;
      }
      continue;
    }

    // inString === true
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      // CRLF → \n 로 통일
      if (src[i + 1] === '\n') {
        i++; // skip LF
      }
      out += '\\n';
      continue;
    }
    out += ch;
  }
  return out;
}

/** 모델이 내놓은 살짝 깨진 JSON도 최대한 복구해 파싱 */
function parseJsonLoose(text: string): unknown {
  const trim = (s: string) => s.trim();
  const tryParse = (src: string) => JSON.parse(trim(src));

  // 1) 먼저 줄바꿈 이스케이프 시도
  try { return tryParse(escapeNewlinesInsideStrings(text)); } catch {}

  // 2) 그대로
  try { return tryParse(text); } catch {}

  // 3) 펜스 제거
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) { 
    try { return tryParse(escapeNewlinesInsideStrings(fenced[1])); } catch {}
    try { return tryParse(fenced[1]); } catch {} 
  }

  // 4) 첫 { ~ 마지막 }
  const i = text.indexOf('{'); const j = text.lastIndexOf('}');
  if (i !== -1 && j !== -1 && j > i) {
    const candidate = text.slice(i, j + 1);
    // 4-1) 문자열 내부 개행 이스케이프 먼저 시도
    try { return tryParse(escapeNewlinesInsideStrings(candidate)); } catch {}
    // 4-2) 그대로도 시도
    try { return tryParse(candidate); } catch {}
  }

  // 5) 스마트따옴표 정규화
  const normalizedQuotes = text.replace(/[""]/g, '"').replace(/['']/g, "'");
  try { return tryParse(escapeNewlinesInsideStrings(normalizedQuotes)); } catch {}
  try { return tryParse(normalizedQuotes); } catch {}

  // 6) 트레일링 콤마 제거
  const noTrailingCommas = normalizedQuotes.replace(/,\s*([}\]])/g, '$1');
  try { return tryParse(escapeNewlinesInsideStrings(noTrailingCommas)); } catch {}
  try { return tryParse(noTrailingCommas); } catch {}

  // 7) 최후: 더 공격적인 정리
  const aggressive = noTrailingCommas
    .replace(/[\r\n]+/g, '\\n') // 모든 줄바꿈을 \n으로
    .replace(/\t/g, '\\t'); // 탭도 이스케이프
  return tryParse(aggressive); // 실패 시 여기서 throw
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
  if (!isEnum(d.confidence_level, ['low', 'medium', 'high'] as const)) throw new Error('confidence_level 값 오류');
  if (!isEnum(o.recommended_stage, ['1', '2', '3', '4'] as const)) throw new Error('recommended_stage 값 오류');
  if (typeof o.stage_reason !== 'string') throw new Error('stage_reason은 문자열이어야 합니다.');
  if (typeof o.next_question !== 'string') throw new Error('next_question은 문자열이어야 합니다.');
  if (typeof o.feedback_completed !== 'boolean') throw new Error('feedback_completed는 boolean이어야 합니다.');
}

/**********************
 * Gemini AI Integration
 **********************/
// 기본 LLM 설정 (fallback용)
const DEFAULT_LLM_CONFIG: Partial<LLMConfig> = {
  model: 'gemini-2.5-pro',
  temperature: 0,
  maxOutputTokens: 8192,
  thinkingBudget: 1800,
  responseMimeType: 'application/json',
  systemPrompt: '',
  outputSchema: DEFAULT_RESPONSE_SCHEMA
};

// 기본 프롬프트 (fallback용)
const DEFAULT_PROMPT = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 AI입니다.

주어진 학생의 응답과 문제 데이터를 분석하여 다음을 수행하세요: 

### **입력 데이터**

- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}

- **해설**: {해설 텍스트}

- **학생 응답**: {학생의 답변, 풀이 과정, 또는 질문, 예: "근이 뭔지 모르겠어요", "x = 2, 4", 또는 "(x-2)(x-4) = 0"}

- **컨텍스트** (선택 사항): {이전 대화 이력, 과거 오류 패턴}

### **임무**

1. **학생 상태 진단**:

   - **문제 이해도**: 학생이 문제의 요구사항(예: 근 구하기)을 파악했는지? (낮음/중간/높음)

   - **개념 지식**: 관련 수학 개념(예: 이차방정식, 인수분해)을 이해하는 수준 (낮음/중간/높음)

   - **오류 패턴**: 계산 실수, 논리 오류, 개념 혼동, 접근법 선택 오류 등 식별

   - **자신감 수준**: 학생의 답변에서 드러나는 태도 (낮음: 좌절/망설임, 중간: 보통, 높음: 자신감)

2. **폴리아 4단계 추천**:

   - 진단 결과에 따라 적합한 폴리아 단계(1~4) 추천

   - 이유 설명: 왜 해당 단계를 추천하는지 간단히 기술

3. **다음 질문 제안**:

   - 학생의 상태에 맞춘 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?")

   - 문제 해설 내용을 참고하되, 학생한테는 해설자료가 없는 상황 고려

   - 4단계(되돌아보기)는 AI가 직접 해당 문제의 포인트와 풀이과정에서 학생이 알아야할 핵심 포인트를 정리해주는 것으로 대체한다.

4. **피드백 완료 여부 판단**:

   - 학생이 충분한 피드백을 받았는지 여부 판단 (예: "더 이상 질문이 없고, 학생이 문제를 이해한 것으로 보임")

   - "true" 또는 "false"로 응답

### **출력 형식**

{

  "diagnosis": {

    "problem_understanding": "low/medium/high",

    "concept_knowledge": "low/medium/high",

    "error_pattern": "none/calculation_error/logical_error/concept_confusion/approach_error",

    "confidence_level": "low/medium/high"

  },

  "recommended_stage": "1/2/3/4",

  "stage_reason": "추천 이유 설명",

  "next_question": "학생에게 제안할 질문 또는 힌트",

  "feedback_completed": "true/false"

}`;

// 사용 가능한 모델 목록
const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

interface GeminiArgs {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
  responseSchema?: typeof DEFAULT_RESPONSE_SCHEMA;
  responseMimeType: string;
  problem: string;
  problemImage?: string;
  explanationImage?: string;
  explanationText?: string;
  userMessage: string;
  context: string;
  signal?: AbortSignal;
}


const buildContext = (msgs: Message[]) =>
  msgs
    .slice(-10)  // 최근 10개 메시지
    .map((m) => {
      if (m.type === 'student') return `학생: ${m.content}`;
      if (m.type === 'ai' && !m.isError) return `선생님: ${m.content}`;
      return '';
    })
    .filter(Boolean)
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
 * Gemini API Call
 **********************/
async function callGemini({ systemPrompt, model, temperature, maxOutputTokens, thinkingBudget, responseSchema, responseMimeType, problem, problemImage, explanationImage, explanationText, userMessage, context, signal }: GeminiArgs): Promise<DiagnosticData> {

  // 이미지가 있는 경우와 없는 경우를 구분하여 처리
  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // 문제 이미지가 있는 경우 추가
  if (problemImage) {
    const base64Data = problemImage.split(',')[1]; // data:image/png;base64, 부분 제거
    userParts.push({
      inlineData: {
        mimeType: problemImage.split(':')[1].split(';')[0], // image/png, image/jpeg 등
        data: base64Data
      }
    });
  }

  // 해설 이미지가 있는 경우 추가
  if (explanationImage) {
    const base64Data = explanationImage.split(',')[1]; // data:image/png;base64, 부분 제거
    userParts.push({
      inlineData: {
        mimeType: explanationImage.split(':')[1].split(';')[0], // image/png, image/jpeg 등
        data: base64Data
      }
    });
  }

  // 텍스트 부분 구성
  let textContent = `### 실제 입력 데이터\n`;

  if (problemImage && explanationImage) {
    textContent += `- 문제: 첫 번째 이미지를 참고하세요. ${problem}\n`;
    textContent += `- 해설: 두 번째 이미지를 참고하세요.\n`;
  } else if (problemImage) {
    textContent += `- 문제: 위 이미지를 참고하세요. ${problem}\n`;
  } else if (explanationImage) {
    textContent += `- 문제: ${problem}\n`;
    textContent += `- 해설: 위 이미지를 참고하세요.\n`;
  } else {
    textContent += `- 문제: ${problem}\n`;
  }

  // 해설 텍스트가 있는 경우 추가
  if (explanationText) {
    textContent += `- 해설 (텍스트): ${explanationText}\n`;
  }

  textContent += `- 학생 응답: ${userMessage}\n`;
  textContent += `- 컨텍스트: ${context}`;

  userParts.push({
    text: textContent
  });

  const generationConfig = {
    temperature: temperature,
    maxOutputTokens: maxOutputTokens,
    responseMimeType: responseMimeType,
    ...(responseMimeType === 'application/json' && { responseSchema }),
    thinkingConfig: {
      thinkingBudget: thinkingBudget
    }
  };

  // 🔍 API 호출 전 설정 값 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [API 호출 설정 확인]', {
      model,
      temperature,
      maxOutputTokens,
      thinkingBudget,
      responseMimeType,
      hasResponseSchema: !!responseSchema,
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 100) + '...',
    });
  }

  // 서버 사이드 API 엔드포인트 호출
  const controller = signal ? new AbortController() : null;
  if (signal && controller) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    signal: controller?.signal || signal,
    body: JSON.stringify({
      model,
      systemPrompt,
      userParts,
      generationConfig
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
    throw new Error(errorData.error || `서버 오류: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GeminiResponse & {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string, inlineData?: { data: string } }> } }>;
  };

  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) throw new Error(`안전성 정책으로 차단됨: ${blocked}`);

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  let text = "";
  for (const p of parts) {
    if (typeof p?.text === "string" && p.text.trim()) { text = p.text.trim(); break; }
  }
  if (!text) {
    for (const p of parts) {
      const b64 = p?.inlineData?.data;
      if (b64) {
        try {
          const decoded = typeof globalThis.atob === "function" ? globalThis.atob(b64) : "";
          if (decoded.trim()) { text = decoded.trim(); break; }
        } catch {}
      }
    }
  }

  if (!text) {
    const finish = data?.candidates?.[0]?.finishReason;
    const hint = finish ? ` (finishReason: ${finish})` : "";
    throw new Error(`Gemini 응답에서 JSON 본문을 찾지 못했습니다.${hint}`);
  }

  const parsed = parseJsonLoose(text);
  validateDiagnostic(parsed);
  return parsed as DiagnosticData;
}

/**********************
 * Component
 **********************/
const MathTutorDiagnostic: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDiagnostic, setCurrentDiagnostic] = useState<DiagnosticData | null>(null);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [showProblemManager, setShowProblemManager] = useState(false);
  const [showDiagnosticDetail, setShowDiagnosticDetail] = useState<Record<string, boolean>>({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [responseSchema, setResponseSchema] = useState<typeof DEFAULT_RESPONSE_SCHEMA>(DEFAULT_RESPONSE_SCHEMA);
  const [responseMimeType, setResponseMimeType] = useState<string>('application/json');
  const [model, setModel] = useState('gemini-2.5-pro');
  const [temperature, setTemperature] = useState(0);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [thinkingBudget, setThinkingBudget] = useState(1800);
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  
  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    title: '',
    content: '',
    category: '',
    grade: '',
    unit: '',
    difficulty: 'medium'
  });

  const abortRef = useRef<AbortController | null>(null);
  const SYSTEM_PROMPT_JSON = useMemo(() => {
    const prompt = customPrompt || DEFAULT_PROMPT;
    return `${prompt}

---
반드시 위의 형식과 일치하는 **순수 JSON 객체 하나만** 출력하세요. 코드블록(\`\`\`), 마크다운, 주석, 추가 설명, 접두/접미 텍스트를 금지합니다.`;
  }, [customPrompt]);

  const currentProblem = useMemo(() => {
    return problems.find(p => p.id === selectedProblemId);
  }, [problems, selectedProblemId]);

  // Handle responsive layout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // 태블릿부터 데스크톱으로 간주
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load LLM configs from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadConfig = (config: LLMConfig) => {
      setCustomPrompt(config.systemPrompt);
      setResponseSchema(config.outputSchema || DEFAULT_RESPONSE_SCHEMA);
      setResponseMimeType(config.responseMimeType || 'application/json');
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxOutputTokens(config.maxOutputTokens);
      setThinkingBudget(config.thinkingBudget);
      setActiveConfigId(config.id);
    };

    const loadActiveConfig = () => {
      const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
      const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');

      if (storedConfigs) {
        try {
          const parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
          setLlmConfigs(parsedConfigs);

          // 활성 설정 찾기
          if (activeConfigId) {
            const activeConfig = parsedConfigs.find(c => c.id === activeConfigId);
            if (activeConfig) {
              loadConfig(activeConfig);
              return;
            }
          }

          // 활성 설정이 없으면 첫 번째 활성 설정 사용
          const activeConfig = parsedConfigs.find(c => c.isActive) || parsedConfigs[0];
          if (activeConfig) {
            loadConfig(activeConfig);
            localStorage.setItem('math_tutor_active_llm_config_id', activeConfig.id);
            return;
          }
        } catch (e) {
          console.error('Failed to load configs:', e);
        }
      }

      // 설정이 없으면 기본값 사용
      if (!storedConfigs) {
        setCustomPrompt(DEFAULT_PROMPT);
        setResponseSchema(DEFAULT_RESPONSE_SCHEMA);
        setResponseMimeType('application/json');
        setModel(DEFAULT_LLM_CONFIG.model || 'gemini-2.5-pro');
        setTemperature(DEFAULT_LLM_CONFIG.temperature || 0);
        setMaxOutputTokens(DEFAULT_LLM_CONFIG.maxOutputTokens || 8192);
        setThinkingBudget(DEFAULT_LLM_CONFIG.thinkingBudget || 1800);
      }
    };
    
    // 초기 로드
    loadActiveConfig();
    
    // storage 이벤트 감지
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'math_tutor_llm_configs' || e.key === 'math_tutor_active_llm_config_id') {
        loadActiveConfig();
      }
    };
    
    // 커스텀 이벤트 감지
    const handleConfigUpdate = () => {
      loadActiveConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('llmConfigUpdated', handleConfigUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('llmConfigUpdated', handleConfigUpdate);
    };
  }, []);

  // LLM 설정 변경 핸들러
  const handleConfigChange = (configId: string) => {
    const config = llmConfigs.find(c => c.id === configId);
    if (config) {
      setCustomPrompt(config.systemPrompt);
      setResponseSchema(config.outputSchema || DEFAULT_RESPONSE_SCHEMA);
      setResponseMimeType(config.responseMimeType || 'application/json');
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxOutputTokens(config.maxOutputTokens);
      setThinkingBudget(config.thinkingBudget);
      setActiveConfigId(configId);
      localStorage.setItem('math_tutor_active_llm_config_id', configId);
    }
  };


  // Load problems from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedProblems = localStorage.getItem('math_tutor_problems');
    if (storedProblems) {
      try {
        const parsed = JSON.parse(storedProblems) as Problem[];
        setProblems(parsed);
        if (parsed.length > 0 && !selectedProblemId) {
          setSelectedProblemId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load problems:', e);
        // Initialize with default problem
        const defaultProblem: Problem = {
          id: uid(),
          title: '달팽이 속력 문제',
          content: '어느 달팽이는 한 시간에 42m를 갑니다. 이 달팽이가 같은 빠르기로 20분 동안 갈 수 있는 거리는 몇 m입니까? 객관식 보기: ① 13m ② 13¾m ③ 14m ④ 14⅓m',
          category: '속력과 거리',
          difficulty: 'easy',
          createdAt: nowTime(),
          updatedAt: nowTime()
        };
        setProblems([defaultProblem]);
        setSelectedProblemId(defaultProblem.id);
      }
    } else {
      // Initialize with default problem if no stored problems
      const defaultProblem: Problem = {
        id: uid(),
        title: '달팽이 속력 문제',
        content: '어느 달팽이는 한 시간에 42m를 갑니다. 이 달팽이가 같은 빠르기로 20분 동안 갈 수 있는 거리는 몇 m입니까? 객관식 보기: ① 13m ② 13¾m ③ 14m ④ 14⅓m',
        category: '속력과 거리',
        difficulty: 'easy',
        createdAt: nowTime(),
        updatedAt: nowTime()
      };
      setProblems([defaultProblem]);
      setSelectedProblemId(defaultProblem.id);
    }
  }, []);

  // Save problems to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || problems.length === 0) return;
    localStorage.setItem('math_tutor_problems', JSON.stringify(problems));
  }, [problems]);

  const clearChat = () => {
    setMessages([]);
    setCurrentDiagnostic(null);
  };


  const selectProblem = (problemId: string) => {
    setSelectedProblemId(problemId);
    setShowProblemManager(false);
  };


  const contextText = useMemo(() => buildContext(messages), [messages]);

  const sendToGemini = useCallback(async (userMessage: string) => {
    if (!currentProblem) {
      throw new Error('문제가 선택되지 않았습니다.');
    }
    
    // 🔍 API 호출 전 설정 값 확인 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [sendToGemini 호출 전 설정 확인]', {
        activeConfigId,
        model,
        temperature,
        maxOutputTokens,
        thinkingBudget,
        responseMimeType,
        hasResponseSchema: !!responseSchema,
        systemPromptLength: SYSTEM_PROMPT_JSON?.length || 0,
      });
    }
    
    const args: GeminiArgs = {
      systemPrompt: SYSTEM_PROMPT_JSON,
      model,
      temperature,
      maxOutputTokens,
      thinkingBudget,
      responseSchema,
      responseMimeType,
      problem: currentProblem.content || '이미지 문제',
      problemImage: currentProblem.imageUrl,
      explanationImage: currentProblem.explanationImageUrl,
      explanationText: currentProblem.explanationText,
      userMessage,
      context: contextText,
      signal: abortRef.current?.signal,
    };
    return callGemini(args);
  }, [SYSTEM_PROMPT_JSON, model, temperature, maxOutputTokens, thinkingBudget, responseSchema, responseMimeType, currentProblem, contextText, activeConfigId]);

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

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
      const diagnostic = await sendToGemini(currentInput);
      setCurrentDiagnostic(diagnostic);
      const aiMessage: Message = {
        id: uid(),
        type: 'ai',
        content: diagnostic.next_question, // 권장 다음 질문을 응답으로 표시
        diagnostic,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setCurrentInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      const aiMessage: Message = {
        id: uid(),
        type: 'ai',
        content: `오류가 발생했습니다: ${msg}`,
        timestamp: nowTime(),
        isError: true,
        debug: err instanceof Error ? String(err.stack ?? '') : undefined,
      };
      setMessages((prev) => [...prev, aiMessage]);
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
    const meta = STAGES[stage] || { color: 'bg-slate-100/80 text-slate-800', label: '단계 미정' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${meta.color}`}>
        단계 {stage}: {meta.label}
      </span>
    );
  };

  const toggleDiagnosticDetail = (messageId: string) => {
    setShowDiagnosticDetail(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // 컴포넌트 마운트 시 body 스크롤 방지
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // body 스크롤 방지
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';

    return () => {
      // 컴포넌트 언마운트 시 복원
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <div
      className="w-full bg-gradient-to-b from-sky-50 via-teal-50 to-emerald-50 overflow-hidden"
      style={{
        height: '100vh',
        WebkitOverflowScrolling: 'touch'
      } as React.CSSProperties}
    >
      <div
        className="w-full h-full overflow-hidden flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header - Fixed */}
        <div className="flex-none px-4 py-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-200 to-cyan-300 rounded-lg shadow-sm">
                  <Brain className="w-5 h-5 text-blue-700" />
                </div>
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  AI 수학 튜터
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/admin/problems"
                className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Admin
              </a>
            </div>
          </div>
        </div>

      {/* API 키가 환경변수로 설정되어 있으므로 UI에서 제거 */}

        {/* App Wrapper with responsive grid */}
        <div
          className="grid gap-6 p-6"
          style={{
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gridTemplateRows: isDesktop ? '1fr' : '35vh 30vh 35vh',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Problem + Diagnostic Cards Container (Left Column on desktop, stacked on mobile) */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateRows: isDesktop ? '2fr 1fr' : '1.4fr 1fr',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Problem Card - Top Left */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-300/80"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div
                className="px-4 py-3 border-b border-slate-200/50"
                style={{ flex: 'none' }}
              >
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold text-slate-800">
                  문제/해설
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProblemManager(!showProblemManager)}
                    className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200"
                  >
                    {showProblemManager ? '닫기' : '문제 선택'}
                  </button>
                </div>
              </div>
              </div>

              <div
                className="p-6"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
              {/* Current Problem Display */}
              {currentProblem && !showProblemManager && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 rounded-lg border border-slate-200/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 text-base">{currentProblem.title}</h3>
                    <div className="flex gap-2 flex-wrap">
                      {currentProblem.grade && (
                        <span className="px-3 py-1.5 bg-blue-100/80 text-blue-700 rounded-lg text-xs font-medium border border-blue-200/50">
                          {currentProblem.grade}
                        </span>
                      )}
                      {currentProblem.unit && (
                        <span className="px-3 py-1.5 bg-indigo-100/80 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-200/50">
                          {currentProblem.unit}
                        </span>
                      )}
                      {currentProblem.explanationImageUrl && (
                        <span className="px-3 py-1.5 bg-orange-100/80 text-orange-700 rounded-lg text-xs font-medium border border-orange-200/50">
                          해설 이미지
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {currentProblem.imageUrl && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">문제</h4>
                        <img
                          src={currentProblem.imageUrl}
                          alt="문제 이미지"
                          className="w-full max-h-64 object-contain border border-gray-200 rounded p-2"
                        />
                        {currentProblem.content && !currentProblem.content.startsWith('[이미지 문제:') && (
                          <p className="text-slate-600 text-xs sm:text-sm mt-2">{currentProblem.content}</p>
                        )}
                      </div>
                    )}

                    {!currentProblem.imageUrl && currentProblem.content && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">문제</h4>
                        <p className="text-slate-800 whitespace-pre-wrap text-xs sm:text-sm">{currentProblem.content}</p>
                      </div>
                    )}

                    {(currentProblem.explanationImageUrl || currentProblem.explanationText) && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">해설</h4>
                        {currentProblem.explanationImageUrl && (
                          <img
                            src={currentProblem.explanationImageUrl}
                            alt="해설 이미지"
                            className="w-full max-h-64 object-contain border border-orange-200 rounded p-2 bg-orange-50 mb-2"
                          />
                        )}
                        {currentProblem.explanationText && (
                          <p className="text-slate-800 whitespace-pre-wrap text-xs sm:text-sm bg-orange-50/80 p-3 rounded-lg">{currentProblem.explanationText}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!currentProblem && !showProblemManager && (
                <div className="text-center text-slate-500 py-8">
                  문제를 선택해주세요.
                </div>
              )}

              {/* Problem List */}
              {showProblemManager && (
                <div className="space-y-3">
                  {problems.map((problem) => (
                    <div key={problem.id} className="border border-slate-200/60 rounded-lg p-4 hover:bg-slate-50/80 transition-colors duration-200">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 text-sm">{problem.title}</h3>
                          <p className="text-xs text-slate-600 mt-1">
                            {problem.content && !problem.content.startsWith('[이미지 문제:') 
                              ? problem.content.substring(0, 100) + '...' 
                              : problem.imageUrl 
                                ? '이미지 문제' 
                                : '문제 내용 없음'}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {problem.grade && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{problem.grade}</span>}
                            {problem.unit && <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">{problem.unit}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => selectProblem(problem.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            선택
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              </div>
            </div>

            {/* Diagnostic Status Card - Bottom Left */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-300/80"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div
                className="px-4 py-3 border-b border-slate-200/50"
                style={{ flex: 'none' }}
              >
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold text-slate-800">
                  진단 상태
                </h2>
                <div></div>
              </div>
              </div>

              <div
                className="p-4 sm:p-5"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
              {currentDiagnostic ? (
                <div className="border-2 border-purple-200 rounded-lg p-4 sm:p-5 bg-purple-50">
                  <h3 className="font-semibold text-black mb-3 flex items-center gap-2">⚡ 현재 진단 상태</h3>
                  <div className="mb-3">{stagePill(currentDiagnostic.recommended_stage)}</div>

                  <div className="bg-white rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-black">문제 이해도: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.problem_understanding}</span></div>
                      <div className="text-black">개념 지식: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.concept_knowledge}</span></div>
                      <div className="text-black">오류 패턴: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.error_pattern}</span></div>
                      <div className="text-black">자신감: <span className="font-medium text-purple-700">{currentDiagnostic.diagnosis.confidence_level}</span></div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  학생이 메시지를 보내면
                  <br />
                  진단 결과가 여기에 표시됩니다.
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Chat Panel (Right Column on desktop, bottom on mobile) */}
          <div
            style={{
              minHeight: 0,
              overflow: 'hidden',
              WebkitOverflowScrolling: 'touch',
              height: '100%'
            }}
          >
            {/* Chat Panel */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-300/80"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div
                className="px-4 py-3 border-b border-slate-200/50"
                style={{ flex: 'none' }}
              >
            <div className="flex justify-between items-center gap-3">
              <h2 className="text-base font-semibold text-slate-800">
                AI 대화
              </h2>
              <div className="flex items-center gap-2">
                {llmConfigs.length > 0 && (
                  <select
                    value={activeConfigId || ''}
                    onChange={(e) => handleConfigChange(e.target.value)}
                    className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200 bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ maxWidth: '200px' }}
                  >
                    {llmConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name} {config.isActive ? '(활성)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={clearChat} className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                  초기화
                </button>
              </div>
              </div>
              </div>

              <div
                className="p-4 sm:p-5 space-y-3 sm:space-y-4"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
            {messages.length === 0 && <div className="text-center text-slate-500 py-8 font-medium">학생의 첫 메시지를 기다리고 있습니다...</div>}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg p-4  ${
                    message.isError
                      ? 'bg-red-50/80 text-red-800 border border-red-200/60 backdrop-blur-sm'
                      : message.type === 'student'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white '
                      : 'bg-white/80 text-slate-900 border border-slate-200/50 backdrop-blur-sm'
                  }`}
                  aria-live={message.isError ? 'assertive' : 'polite'}
                >
                  <div className="text-sm font-medium mb-1 flex items-center gap-1">
                    {message.type === 'student' && <User className="w-4 h-4" />}
                    {message.type === 'student' ? '학생' : 'AI 권장 질문'}
                  </div>

                  {/* AI 메시지에 단계 정보 표시 */}
                  {message.type === 'ai' && message.diagnostic?.recommended_stage && !message.isError && (
                    <div className="mb-2">
                      {stagePill(message.diagnostic.recommended_stage)}
                    </div>
                  )}

                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                  {/* AI 메시지에 진단 결과 표시 */}
                  {message.type === 'ai' && message.diagnostic?.stage_reason && !message.isError && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleDiagnosticDetail(message.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium"
                      >
                        {showDiagnosticDetail[message.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <Brain className="w-3 h-3" />
                        진단내용 보기
                      </button>
                      {showDiagnosticDetail[message.id] && (
                        <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200/60 rounded-lg backdrop-blur-sm">
                          <p className="text-xs text-blue-800 whitespace-pre-wrap font-medium leading-relaxed">{message.diagnostic.stage_reason}</p>
                        </div>
                      )}
                    </div>
                  )}

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
                <div className="bg-white/80 text-slate-900 rounded-lg p-4 border border-slate-200/50 backdrop-blur-sm ">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-xs ml-2 font-medium">GEMINI 응답 생성 중…</span>
                  </div>
                </div>
              </div>
            )}
              </div>

              <div
                className="p-4 sm:p-5 border-t border-slate-200/60 bg-white/70 backdrop-blur-sm rounded-b-2xl"
                style={{ flex: 'none' }}
              >
            <div className="flex gap-3">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="학생 메시지를 입력하세요..."
                className="flex-1 p-4 border border-slate-300/60 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-900 text-sm sm:text-base bg-white/80 backdrop-blur-sm  transition-all duration-200"
                rows={2}
                disabled={isLoading}
                aria-label="학생 메시지 입력"
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading}
                className="px-5 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-500 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-all duration-200"
                aria-label="메시지 전송"
              >
                전송
              </button>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 프롬프트 UI 섹션 제거 - 프롬프트 내용은 코드에 유지 */}
      </div>
    </div>
  );
};

export default MathTutorDiagnostic;
