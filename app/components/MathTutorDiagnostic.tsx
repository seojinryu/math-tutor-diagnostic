'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, MessageCircle, Brain, BookOpen, ChevronDown, ChevronUp, User, Plus, Edit2, Trash2, Check, X, List, Image, Upload, FileText, ChevronRight, Settings, Search } from 'lucide-react';
import type { LLMConfig } from '../admin/prompt/page';
import { DEFAULT_RESPONSE_SCHEMA, DEFAULT_INPUT_SCHEMA } from '../admin/prompt/page';
import { useActiveLLMConfig } from '../hooks/useActiveLLMConfig';

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
  notes?: string;
  knowledgeElements?: Array<{
    id: string;
    category: 'concept' | 'principle' | 'procedure' | 'integration';
    name: string;
    description: string;
    source: string;
    cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'synthesize' | 'evaluate';
    prereqIds?: string[];
    exampleQuestions?: string[];
  }>;
  keMaps?: Array<{
    problemId: string;
    keId: string;
    weight: number;
    requiredLevel: number;
    evidenceRules: {
      correctAnswer?: string[];
      intermediateSteps?: string[];
      errorPatterns?: string[];
    };
  }>;
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
  knowledge_diagnosis: {
    elements: Array<{
      ke_id: string;
      mastery: 'low' | 'medium' | 'high';
      evidence: string;
      cognitive_level: string;
      next_action: string;
    }>;
    overall_mastery_score: number;
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

export interface ApiCallLog {
  id: string;
  timestamp: string;
  input: {
    problem?: string; // ✅ 선택적 (inputSchema에 정의된 경우만)
    problemImage?: string;
    explanationImage?: string;
    explanationText?: string;
    explanationDisplay?: string; // 해설 표시용 (이미지면 파일명, 텍스트면 내용)
    userMessage: string; // 필수
    context?: string; // ✅ 선택적 (inputSchema에 정의된 경우만)
    knowledgeElements?: Array<{
      id: string;
      name: string;
      category: string;
      cognitiveLevel: string;
    }>;
  };
  prompt: {
    systemPrompt: string;
    userPrompt?: string;
    model: string;
    temperature: number;
    maxOutputTokens: number;
    thinkingBudget: number;
    responseMimeType: string;
    responseSchema?: unknown;
  };
  output: {
    rawResponse?: string;
    parsedDiagnostic?: DiagnosticData;
    error?: string;
  };
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

// SearchableSelect 컴포넌트 (Admin에서 사용하는 것과 동일)
interface SearchableSelectProps {
  label?: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAddNew: (value: string) => void;
  emptyText?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  onAddNew,
  emptyText = '항목 없음'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLabel = value || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setSearchQuery('');
        setNewValue('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleAddNew = () => {
    if (!newValue.trim()) {
      return;
    }
    if (options.includes(newValue.trim())) {
      alert('이미 존재하는 항목입니다.');
      return;
    }
    onAddNew(newValue.trim());
    onChange(newValue.trim());
    setIsAddingNew(false);
    setNewValue('');
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* 검색 바 */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsAddingNew(false);
                  setNewValue('');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="검색..."
              />
            </div>
          </div>

          {/* 목록 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && !isAddingNew && searchQuery && (
              <div className="p-3 text-center text-sm text-gray-500">
                검색 결과가 없습니다
              </div>
            )}
            {filteredOptions.length === 0 && !isAddingNew && !searchQuery && (
              <div className="p-3 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            )}
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center ${
                  value === option ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* 구분선 및 새 항목 추가 */}
          {!isAddingNew && (
            <>
              <div className="border-t border-gray-200 border-dashed"></div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(true);
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                새 항목 추가
              </button>
            </>
          )}

          {/* 새 항목 입력 */}
          {isAddingNew && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddNew();
                    } else if (e.key === 'Escape') {
                      setIsAddingNew(false);
                      setNewValue('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="새 항목 입력..."
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewValue('');
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
  
  // knowledge_diagnosis 검증
  const kd = o.knowledge_diagnosis as Record<string, unknown> | undefined;
  if (kd && typeof kd === 'object') {
    if (Array.isArray(kd.elements)) {
      for (const el of kd.elements) {
        if (typeof el !== 'object' || !el) continue;
        const e = el as Record<string, unknown>;
        if (typeof e.ke_id !== 'string') throw new Error('knowledge_diagnosis.elements[].ke_id는 문자열이어야 합니다.');
        if (!isEnum(e.mastery, ['low', 'medium', 'high'] as const)) throw new Error('knowledge_diagnosis.elements[].mastery 값 오류');
        if (typeof e.evidence !== 'string') throw new Error('knowledge_diagnosis.elements[].evidence는 문자열이어야 합니다.');
        if (typeof e.cognitive_level !== 'string') throw new Error('knowledge_diagnosis.elements[].cognitive_level는 문자열이어야 합니다.');
        if (typeof e.next_action !== 'string') throw new Error('knowledge_diagnosis.elements[].next_action는 문자열이어야 합니다.');
      }
    }
    if (typeof kd.overall_mastery_score !== 'number') throw new Error('knowledge_diagnosis.overall_mastery_score는 숫자여야 합니다.');
    if (!isEnum(kd.uncertainty, ['low', 'medium', 'high'] as const)) throw new Error('knowledge_diagnosis.uncertainty 값 오류');
  }
  
  if (!isEnum(o.recommended_stage, ['1', '2', '3', '4'] as const)) throw new Error('recommended_stage 값 오류');
  if (typeof o.stage_reason !== 'string') throw new Error('stage_reason은 문자열이어야 합니다.');
  if (typeof o.next_question !== 'string') throw new Error('next_question은 문자열이어야 합니다.');
  
  // feedback_completed는 boolean 또는 string ("true"/"false") 모두 허용
  if (typeof o.feedback_completed !== 'boolean' && typeof o.feedback_completed !== 'string') {
    throw new Error('feedback_completed는 boolean 또는 string이어야 합니다.');
  }
  
  // micro_assessments는 선택사항이므로 있으면 검증
  if (o.micro_assessments !== undefined) {
    if (!Array.isArray(o.micro_assessments)) throw new Error('micro_assessments는 배열이어야 합니다.');
    for (const ma of o.micro_assessments) {
      if (typeof ma !== 'object' || !ma) continue;
      const m = ma as Record<string, unknown>;
      if (typeof m.ke_id !== 'string') throw new Error('micro_assessments[].ke_id는 문자열이어야 합니다.');
      if (typeof m.prompt !== 'string') throw new Error('micro_assessments[].prompt는 문자열이어야 합니다.');
    }
  }
}

/**********************
 * Gemini AI Integration
 **********************/

interface GeminiArgs {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
  responseSchema?: typeof DEFAULT_RESPONSE_SCHEMA;
  responseMimeType: string;
  problem?: string; // ✅ 선택적 (inputSchema에 정의된 경우만)
  problemImage?: string;
  explanationImage?: string;
  explanationText?: string;
  userMessage: string; // 필수
  context?: string; // ✅ 선택적 (inputSchema에 정의된 경우만)
  knowledgeElements?: Array<{
    id: string;
    name: string;
    category: 'concept' | 'principle' | 'procedure' | 'integration';
    cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'synthesize' | 'evaluate';
  }>;
  signal?: AbortSignal;
}


const buildContext = (msgs: Message[]) =>
  msgs
    .slice(-50)  // 최근 50개 메시지
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
async function callGemini({ systemPrompt, model, temperature, maxOutputTokens, thinkingBudget, responseSchema, responseMimeType, problem, problemImage, explanationImage, explanationText, userMessage, context, knowledgeElements, signal }: GeminiArgs): Promise<DiagnosticData> {

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

  // ✅ problem이 있을 때만 포함
  if (problem) {
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
  }

  // ✅ 해설 텍스트가 있을 때만 포함
  if (explanationText) {
    textContent += `- 해설 (텍스트): ${explanationText}\n`;
  }

  // ✅ 지식요소 목록이 있을 때만 포함
  if (knowledgeElements && knowledgeElements.length > 0) {
    textContent += `\n지식요소목록:\n[\n`;
    knowledgeElements.forEach((ke) => {
      const categoryMap = {
        concept: '개념',
        principle: '원리',
        procedure: '절차',
        integration: '통합'
      };
      const cognitiveLevelMap = {
        remember: '기억',
        understand: '이해',
        apply: '적용',
        analyze: '분석',
        synthesize: '종합',
        evaluate: '평가'
      };
      textContent += `  {"id":"${ke.id}","이름":"${ke.name}","구분":"${categoryMap[ke.category]}","인지수준":"${cognitiveLevelMap[ke.cognitiveLevel]}"},\n`;
    });
    textContent += `]\n`;
  }

  textContent += `- 학생 응답: ${userMessage}\n`;
  
  // ✅ context가 있을 때만 포함
  if (context) {
    textContent += `- 컨텍스트: ${context}`;
  }

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

  // 서버 사이드 API 엔드포인트 호출 (재시도 로직 포함)
  const controller = signal ? new AbortController() : null;
  if (signal && controller) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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
        let errorMessage = `서버 오류: ${res.status} ${res.statusText}`;
        try {
          const errorText = await res.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.details || errorMessage;
            } catch {
              // JSON 파싱 실패 시 원본 텍스트 사용
              errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
            }
          }
        } catch (parseError) {
          console.error('에러 응답 파싱 실패:', parseError);
          errorMessage = `서버 오류: ${res.status} ${res.statusText} (응답 파싱 실패)`;
        }
        
        // 429 에러인 경우 재시도 (exponential backoff)
        if (res.status === 429 && attempt < maxRetries - 1) {
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter 
            ? parseInt(retryAfter, 10) * 1000 
            : Math.min(Math.pow(2, attempt) * 2000, 10000); // 최대 10초
          console.warn(`Rate limit 도달. ${waitTime / 1000}초 후 재시도... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 429 에러이고 재시도 모두 실패한 경우
        if (res.status === 429) {
          throw new Error('API 요청 제한에 도달했습니다. 잠시(30초~1분) 기다린 후 다시 시도해주세요.');
        }
        
        throw new Error(errorMessage);
      }

      type CandidatePart = { text?: string; inlineData?: { data: string } };
      type CandidateContent = { parts?: CandidatePart[] };
      type Candidate = { content?: CandidateContent };
      const data = (await res.json()) as GeminiResponse & {
        candidates?: Candidate[];
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
    } catch (error) {
      // 에러 상세 정보 로깅
      console.error(`[callGemini] 에러 발생 (시도 ${attempt + 1}/${maxRetries}):`, error);
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // AbortSignal인 경우 재시도하지 않음
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      // 네트워크 에러나 fetch 실패인 경우 상세 정보 추가
      if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = new Error(`네트워크 오류: 서버에 연결할 수 없습니다. (${error.message})`);
      }
      
      // 마지막 시도가 아니면 계속 재시도
      if (attempt < maxRetries - 1) {
        // 429 에러가 아닌 경우에만 짧은 대기
        if (!(lastError.message.includes('429') || lastError.message.includes('Too Many Requests'))) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
        continue;
      }
      
      // 모든 재시도 실패 - 에러 메시지 개선
      if (lastError.message.includes('429') || lastError.message.includes('Too Many Requests')) {
        throw new Error('API 요청 제한에 도달했습니다. 잠시(30초~1분) 기다린 후 다시 시도해주세요.');
      }
      
      // 에러 메시지에 시도 횟수 정보 추가
      const finalError = lastError.message || '알 수 없는 오류';
      throw new Error(`${finalError} (재시도 ${maxRetries}회 실패)`);
    }
  }
  
  // 이 코드는 실행되지 않아야 하지만, 타입 안전성을 위해 유지
  throw lastError || new Error('알 수 없는 오류가 발생했습니다. (재시도 로직 실패)');
}

/**********************
 * Component
 **********************/

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
  const [isDesktop, setIsDesktop] = useState(true);
  const [apiCallLogs, setApiCallLogs] = useState<ApiCallLog[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'logs' | 'diagnostic'>('chat');
  const [showProblemDetail, setShowProblemDetail] = useState(false);
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [explanationInputMode, setExplanationInputMode] = useState<'text' | 'image'>('text');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const explanationFileInputRef = useRef<HTMLInputElement>(null);
  const [grades, setGrades] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  
  // ✅ 커스텀 훅으로 LLM 설정 로드
  const {
    config: activeConfig,
    configs: llmConfigs,
    activeConfigs: activeLLMConfigs,  // ✅ 활성화된 설정 목록만
    isLoading: isConfigLoading,
    error: configError,
    setActiveConfig: handleConfigChange
  } = useActiveLLMConfig();

  // ✅ 최초 진입 시 활성 설정이 없으면 기본(첫 활성) 설정을 자동 선택
  useEffect(() => {
    if (isConfigLoading) return;
    if (!activeConfig && activeLLMConfigs.length > 0) {
      handleConfigChange(activeLLMConfigs[0].id);
    } else if (!activeConfig && activeLLMConfigs.length === 0 && llmConfigs.length > 0) {
      // 활성화된 설정이 없다면 첫 설정을 선택 (hook에서도 처리되지만 보강)
      handleConfigChange(llmConfigs[0].id);
    }
  }, [isConfigLoading, activeConfig, activeLLMConfigs, llmConfigs, handleConfigChange]);
  
  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    title: '',
    content: '',
    grade: '',
    unit: '',
    explanationText: '',
    notes: ''
  });

  const abortRef = useRef<AbortController | null>(null);
  
  // ✅ activeConfig에서 시스템 프롬프트 생성
  const SYSTEM_PROMPT_JSON = useMemo(() => {
    if (!activeConfig?.systemPrompt) {
      return null;
    }
    return `${activeConfig.systemPrompt}

---
반드시 위의 형식과 일치하는 **순수 JSON 객체 하나만** 출력하세요. 코드블록(\`\`\`), 마크다운, 주석, 추가 설명, 접두/접미 텍스트를 금지합니다.`;
  }, [activeConfig?.systemPrompt]);

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

  // ✅ LLM 설정은 useActiveLLMConfig 훅이 처리 (기존 로직 제거됨)

  // 학년/단원 목록 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedGrades = localStorage.getItem('math_tutor_grades');
    const storedUnits = localStorage.getItem('math_tutor_units');
    
    if (storedGrades) {
      try {
        setGrades(JSON.parse(storedGrades));
      } catch (e) {
        console.error('Failed to load grades:', e);
      }
    }
    if (storedUnits) {
      try {
        setUnits(JSON.parse(storedUnits));
      } catch (e) {
        console.error('Failed to load units:', e);
      }
    }
  }, []);

  // Load problems from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedProblems = localStorage.getItem('math_tutor_problems');
    if (storedProblems) {
      try {
        const parsed = JSON.parse(storedProblems) as Problem[];
        
        // ✅ 기존 문제 데이터 마이그레이션: explanationImageUrl이 있는데 explanationText가 없으면 자동 생성
        const migratedProblems = parsed.map(problem => {
          if (problem.explanationImageUrl && !problem.explanationText) {
            return {
              ...problem,
              explanationText: `[이미지 해설: 문제${problem.id.substring(0, 8)}.webp]`
            };
          }
          return problem;
        });
        
        setProblems(migratedProblems);
        
        // 마이그레이션된 데이터 저장
        if (migratedProblems.some((p, i) => p.explanationText !== parsed[i].explanationText)) {
          localStorage.setItem('math_tutor_problems', JSON.stringify(migratedProblems));
          console.log('✅ 기존 문제 explanationText 마이그레이션 완료');
        }
        
        if (migratedProblems.length > 0 && !selectedProblemId) {
          setSelectedProblemId(migratedProblems[0].id);
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

  // 학년 추가
  const handleAddGrade = (value: string) => {
    const updatedGrades = [...grades, value].sort();
    setGrades(updatedGrades);
    localStorage.setItem('math_tutor_grades', JSON.stringify(updatedGrades));
  };

  // 단원 추가
  const handleAddUnit = (value: string) => {
    const updatedUnits = [...units, value].sort();
    setUnits(updatedUnits);
    localStorage.setItem('math_tutor_units', JSON.stringify(updatedUnits));
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'problem' | 'explanation') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'problem') {
          setImagePreview(result);
          setNewProblem(prev => ({
            ...prev,
            imageUrl: result,
            content: `[이미지 문제: ${file.name}]`
          }));
        } else {
          setExplanationImagePreview(result);
          setNewProblem(prev => ({
            ...prev,
            explanationImageUrl: result,
            explanationText: `[이미지 해설: ${file.name}]`
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 문제 추가
  const addProblem = () => {
    if (!newProblem.title?.trim()) {
      alert('문제 제목을 입력해주세요.');
      return;
    }

    if (!newProblem.content?.trim() && !newProblem.imageUrl) {
      alert('문제 내용이나 이미지를 입력해주세요.');
      return;
    }

    const problem: Problem = {
      id: uid(),
      title: newProblem.title.trim(),
      content: newProblem.content?.trim() || '',
      imageUrl: newProblem.imageUrl,
      explanationImageUrl: newProblem.explanationImageUrl,
      explanationText: newProblem.explanationText?.trim() || undefined,
      grade: newProblem.grade?.trim() || '',
      unit: newProblem.unit?.trim() || '',
      notes: newProblem.notes?.trim() || undefined,
      createdAt: nowTime(),
      updatedAt: nowTime()
    };

    const updatedProblems = [...problems, problem];
    setProblems(updatedProblems);
    localStorage.setItem('math_tutor_problems', JSON.stringify(updatedProblems));
    setSelectedProblemId(problem.id);
    
    // 폼 초기화
    setNewProblem({
      title: '',
      content: '',
      grade: '',
      unit: '',
      explanationText: '',
      notes: ''
    });
    setImagePreview(null);
    setExplanationImagePreview(null);
    setInputMode('text');
    setExplanationInputMode('text');
    setShowAddProblemModal(false);
  };

  // 문제 등록 취소
  const cancelAddProblem = () => {
    setNewProblem({
      title: '',
      content: '',
      grade: '',
      unit: '',
      explanationText: '',
      notes: ''
    });
    setImagePreview(null);
    setExplanationImagePreview(null);
    setInputMode('text');
    setExplanationInputMode('text');
    setShowAddProblemModal(false);
  };

  const contextText = useMemo(() => buildContext(messages), [messages]);

  const sendToGemini = useCallback(async (userMessage: string) => {
    if (!currentProblem) {
      throw new Error('문제가 선택되지 않았습니다.');
    }
    
    // ✅ activeConfig 필수 설정 값 검증
    if (!activeConfig) {
      throw new Error('AI 연동 설정이 로드되지 않았습니다. Admin 페이지에서 설정을 확인해주세요.');
    }
    if (!SYSTEM_PROMPT_JSON) {
      throw new Error('시스템 프롬프트가 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    if (!activeConfig.model) {
      throw new Error('모델이 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    if (activeConfig.temperature === null || activeConfig.temperature === undefined) {
      throw new Error('Temperature가 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    if (!activeConfig.maxOutputTokens) {
      throw new Error('Max Output Tokens가 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    if (!activeConfig.thinkingBudget) {
      throw new Error('Thinking Budget이 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    if (!activeConfig.responseMimeType) {
      throw new Error('Response MIME Type이 설정되지 않았습니다. Admin 페이지에서 AI 연동 설정을 확인해주세요.');
    }
    
    // ✅ 입력 스키마에서 선택된 필드 확인
    const inputSchemaProps = (activeConfig.inputSchema?.properties || {}) as Record<string, unknown>;
    const hasProblem = !!inputSchemaProps.problem;
    const hasProblemImage = !!inputSchemaProps.problemImage;
    const hasExplanation = !!inputSchemaProps.explanation;
    const hasExplanationImage = !!inputSchemaProps.explanationImage;
    const hasUserMessage = !!inputSchemaProps.userMessage;
    const hasContext = !!inputSchemaProps.context;
    const hasKnowledgeElements = !!inputSchemaProps.knowledgeElements;
    
    // 🔍 API 호출 전 설정 값 확인 로깅
    console.log('🔍 [sendToGemini 호출 전 설정 확인]', {
      activeConfigId: activeConfig.id,
      activeConfigName: activeConfig.name,
      selectedFields: {
        problem: hasProblem,
        problemImage: hasProblemImage,
        explanation: hasExplanation,
        explanationImage: hasExplanationImage,
        userMessage: hasUserMessage,
        context: hasContext,
        knowledgeElements: hasKnowledgeElements,
      },
      model: activeConfig.model,
      temperature: activeConfig.temperature,
      maxOutputTokens: activeConfig.maxOutputTokens,
      thinkingBudget: activeConfig.thinkingBudget,
      responseMimeType: activeConfig.responseMimeType,
      hasResponseSchema: !!activeConfig.outputSchema,
      systemPromptLength: SYSTEM_PROMPT_JSON?.length || 0,
    });
    
    const args: GeminiArgs = {
      systemPrompt: SYSTEM_PROMPT_JSON,
      model: activeConfig.model,
      temperature: activeConfig.temperature,
      maxOutputTokens: activeConfig.maxOutputTokens,
      thinkingBudget: activeConfig.thinkingBudget,
      responseSchema: activeConfig.outputSchema || undefined,
      responseMimeType: activeConfig.responseMimeType,
      // ✅ inputSchema에 정의된 필드만 포함
      problem: hasProblem ? (currentProblem.content || '이미지 문제') : (currentProblem.content || '이미지 문제'), // 필수이지만 hasProblem이 false여도 기본값 제공
      problemImage: hasProblemImage ? currentProblem.imageUrl : undefined,
      explanationImage: hasExplanationImage ? currentProblem.explanationImageUrl : undefined,
      explanationText: hasExplanation ? currentProblem.explanationText : undefined,
      userMessage: hasUserMessage ? userMessage : userMessage, // 필수
      context: hasContext ? contextText : undefined,
      knowledgeElements: hasKnowledgeElements 
        ? currentProblem.knowledgeElements?.map(ke => ({
            id: ke.id,
            name: ke.name,
            category: ke.category,
            cognitiveLevel: ke.cognitiveLevel
          }))
        : undefined,
      signal: abortRef.current?.signal,
    };
    
    // 🔍 디버깅: API 호출 전 데이터 확인
    console.log('🔍 [API 호출 전 데이터 확인]', {
      problemId: currentProblem.id,
      problemTitle: currentProblem.title,
      hasProblemImage: !!currentProblem.imageUrl,
      hasExplanationImage: !!currentProblem.explanationImageUrl,
      hasExplanationText: !!currentProblem.explanationText,
      hasKnowledgeElements: !!currentProblem.knowledgeElements,
      knowledgeElementsCount: currentProblem.knowledgeElements?.length || 0,
      knowledgeElements: currentProblem.knowledgeElements,
      hasKeMaps: !!currentProblem.keMaps,
      keMapsCount: currentProblem.keMaps?.length || 0,
      systemPromptPreview: SYSTEM_PROMPT_JSON.substring(0, 200) + '...'
    });
    
    // API 호출 로그 생성
    const logId = uid();
    const logTimestamp = nowTime();
    
    // 로그 저장을 위한 입력 데이터 준비
    // 문제: 이미지면 파일명 포함된 problem, 텍스트면 내용
    // 해설: 이미지면 파일명 추출, 텍스트면 explanationText
    const problemDisplay = hasProblem
      ? (args.problemImage 
          ? args.problem  // 이미지 문제일 때는 이미 [이미지 문제: 파일명] 형식
          : args.problem)
      : undefined;
    
    // 해설 표시: 이미지면 파일명, 텍스트면 내용
    let explanationDisplay: string | undefined;
    if (hasExplanationImage && args.explanationImage) {
      // ✅ explanationText에서 파일명 추출 시도
      const explanationMatch = args.explanationText?.match(/\[이미지 해설:\s*([^\]]+)\]/);
      if (explanationMatch) {
        explanationDisplay = `[이미지 해설: ${explanationMatch[1]}]`;
      } else {
        // ✅ explanationText가 없으면 그냥 '[이미지 해설]'로 표시
        // (문제 파일명을 사용하지 않음 - 이전 버그 수정)
        explanationDisplay = '[이미지 해설]';
      }
    } else if (hasExplanation && args.explanationText) {
      // 텍스트 해설이면 내용 표시 (파일명 형식이 아닌 경우만)
      if (!args.explanationText.match(/\[이미지 해설:/)) {
        explanationDisplay = args.explanationText;
      }
    }
    
    // ✅ 로그에는 실제로 전송된 필드만 포함
    const logInput: ApiCallLog['input'] = {
      problem: hasProblem ? problemDisplay : undefined,
      problemImage: hasProblemImage ? args.problemImage : undefined,
      explanationImage: hasExplanationImage ? args.explanationImage : undefined,
      explanationText: hasExplanation ? args.explanationText : undefined,
      explanationDisplay: hasExplanation ? explanationDisplay : undefined,
      userMessage: hasUserMessage ? args.userMessage : '',
      context: hasContext ? args.context : undefined,
      knowledgeElements: hasKnowledgeElements ? args.knowledgeElements : undefined
    };
    
    const logPrompt: ApiCallLog['prompt'] = {
      systemPrompt: args.systemPrompt,
      model: args.model,
      temperature: args.temperature,
      maxOutputTokens: args.maxOutputTokens,
      thinkingBudget: args.thinkingBudget,
      responseMimeType: args.responseMimeType,
      responseSchema: args.responseSchema
    };
    
    try {
      const diagnostic = await callGemini(args);
      
      // 성공 로그 저장
      const log: ApiCallLog = {
        id: logId,
        timestamp: logTimestamp,
        input: logInput,
        prompt: logPrompt,
        output: {
          parsedDiagnostic: diagnostic
        }
      };
      setApiCallLogs(prev => [log, ...prev].slice(0, 50)); // 최대 50개까지만 저장
      
      return diagnostic;
    } catch (error) {
      // 에러 로그 저장
      const log: ApiCallLog = {
        id: logId,
        timestamp: logTimestamp,
        input: logInput,
        prompt: logPrompt,
        output: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
      setApiCallLogs(prev => [log, ...prev].slice(0, 50));
      
      throw error;
    }
  }, [SYSTEM_PROMPT_JSON, activeConfig, currentProblem, contextText]);

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    const inputText = currentInput.trim(); // 입력값 저장
    setCurrentInput(''); // 메시지 전송 직후 입력창 비우기
    
    const studentMessage: Message = {
      id: uid(),
      type: 'student',
      content: inputText,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, studentMessage]);

    try {
      const diagnostic = await sendToGemini(inputText);
      
      // 🔍 디버깅: API 응답 확인
      console.log('🔍 [API 응답 확인]', {
        hasKnowledgeDiagnosis: !!diagnostic.knowledge_diagnosis,
        knowledgeDiagnosisElements: diagnostic.knowledge_diagnosis?.elements?.length || 0,
        diagnosticKeys: Object.keys(diagnostic),
        fullDiagnostic: diagnostic
      });
      
      setCurrentDiagnostic(diagnostic);
      const aiMessage: Message = {
        id: uid(),
        type: 'ai',
        content: diagnostic.next_question, // 권장 다음 질문을 응답으로 표시
        diagnostic,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMessage]);
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
          {/* Problem Card Container (Left Column on desktop, stacked on mobile) */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateRows: '1fr',  // ✅ 진단상태 카드 제거로 단일 행으로 변경
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
                  문제
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddProblemModal(true)}
                    className="px-3 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium rounded-lg hover:bg-blue-50 transition-all duration-200 border border-blue-200"
                  >
                    문제 등록
                  </button>
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
                <div 
                  className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 rounded-lg border border-slate-200/50 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setShowProblemDetail(true)}
                  title="클릭하여 상세 정보 보기"
                >
                  {/* ✅ 문제 이미지 또는 텍스트 표시 */}
                  {currentProblem.imageUrl ? (
                    <img
                      src={currentProblem.imageUrl}
                      alt="문제 이미지"
                      className="w-full max-h-[600px] object-contain border border-gray-200 rounded p-2"
                    />
                  ) : currentProblem.content && !currentProblem.content.startsWith('[이미지 문제:') ? (
                    <div className="text-slate-900 whitespace-pre-wrap leading-relaxed text-base">
                      {currentProblem.content}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      문제 이미지가 없습니다.
                    </div>
                  )}
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
              <div className="flex items-center gap-2">
                {/* 탭 버튼 */}
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  대화
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  호출 로그 ({apiCallLogs.length})
                </button>
                <button
                  onClick={() => setActiveTab('diagnostic')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'diagnostic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  진단 상태
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* ✅ LLM 설정 선택 (로딩/에러 상태 표시) */}
                {isConfigLoading ? (
                  <div className="px-3 py-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
                    설정 불러오는 중...
                  </div>
                ) : configError ? (
                  <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg" title={configError}>
                    AI 연동 설정 필요
                  </div>
                ) : activeLLMConfigs.length > 0 ? (
                  <select
                    value={activeConfig?.id || ''}
                    onChange={(e) => handleConfigChange(e.target.value)}
                    className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200 bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ maxWidth: '200px' }}
                    title={activeConfig?.name || '설정 선택'}
                  >
                    {activeLLMConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                ) : llmConfigs.length > 0 ? (
                  <div className="px-3 py-2 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg" title="활성화된 설정이 없습니다. Admin 페이지에서 설정을 활성화해주세요.">
                    활성화된 설정 없음
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    AI 연동 설정 필요
                  </div>
                )}
                {activeTab === 'chat' && (
                  <button onClick={clearChat} className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                    초기화
                  </button>
                )}
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
            {activeTab === 'chat' ? (
              <>
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
                        <div className="mt-3 p-4 bg-blue-50/80 border border-blue-200/60 rounded-lg backdrop-blur-sm space-y-3">
                          {/* 현재 단계 */}
                          {message.diagnostic.recommended_stage && (
                            <div>
                              <div className="text-xs font-semibold text-blue-900 mb-1">권장 단계</div>
                              <div className="mb-2">{stagePill(message.diagnostic.recommended_stage)}</div>
                            </div>
                          )}
                          
                          {/* 단계 추천 이유 */}
                          {message.diagnostic.stage_reason && (
                            <div>
                              <div className="text-xs font-semibold text-blue-900 mb-1">추천 이유</div>
                              <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">{message.diagnostic.stage_reason}</p>
                            </div>
                          )}
                          
                          {/* 진단 정보 */}
                          {message.diagnostic.diagnosis && (
                            <div>
                              <div className="text-xs font-semibold text-blue-900 mb-2">학습 상태 진단</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/60 rounded p-2">
                                  <div className="text-gray-600">문제 이해도</div>
                                  <div className="font-semibold text-blue-900">{message.diagnostic.diagnosis.problem_understanding === 'high' ? '높음' : message.diagnostic.diagnosis.problem_understanding === 'medium' ? '보통' : '낮음'}</div>
                                </div>
                                <div className="bg-white/60 rounded p-2">
                                  <div className="text-gray-600">개념 지식</div>
                                  <div className="font-semibold text-blue-900">{message.diagnostic.diagnosis.concept_knowledge === 'high' ? '높음' : message.diagnostic.diagnosis.concept_knowledge === 'medium' ? '보통' : '낮음'}</div>
                                </div>
                                <div className="bg-white/60 rounded p-2">
                                  <div className="text-gray-600">오류 패턴</div>
                                  <div className="font-semibold text-blue-900">
                                    {message.diagnostic.diagnosis.error_pattern === 'none' ? '없음' :
                                     message.diagnostic.diagnosis.error_pattern === 'calculation_error' ? '계산 오류' :
                                     message.diagnostic.diagnosis.error_pattern === 'logical_error' ? '논리 오류' :
                                     message.diagnostic.diagnosis.error_pattern === 'concept_confusion' ? '개념 혼동' : '접근 오류'}
                                  </div>
                                </div>
                                <div className="bg-white/60 rounded p-2">
                                  <div className="text-gray-600">자신감</div>
                                  <div className="font-semibold text-blue-900">{message.diagnostic.diagnosis.confidence_level === 'high' ? '높음' : message.diagnostic.diagnosis.confidence_level === 'medium' ? '보통' : '낮음'}</div>
                                </div>
                              </div>
                            </div>
                          )}
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
              </>
            ) : activeTab === 'logs' ? (
              <div className="space-y-3">
                {apiCallLogs.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    호출 로그가 없습니다.
                    <br />
                    AI와 대화를 시작하면 로그가 표시됩니다.
                  </div>
                ) : (
                  apiCallLogs.map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div className="text-xs font-semibold text-gray-700">{log.timestamp}</div>
                        {log.output.error ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">에러</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">성공</span>
                        )}
                      </div>
                      
                      {/* 인풋 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-500 rounded"></div>
                          인풋
                        </div>
                        <div className="bg-blue-50 rounded p-3 text-xs space-y-2">
                          {/* ✅ 선택된 필드만 표시 */}
                          {(log.input.problem !== undefined || log.input.problemImage !== undefined) && (
                            <div>
                              <span className="font-medium text-gray-700">문제:</span>
                              {log.input.problemImage ? (
                                <div className="mt-2">
                                  <img 
                                    src={log.input.problemImage} 
                                    alt="문제 이미지" 
                                    className="max-w-full max-h-60 rounded border border-gray-300"
                                  />
                                </div>
                              ) : log.input.problem ? (
                                <div className="mt-1 text-gray-600 whitespace-pre-wrap">
                                  {log.input.problem}
                                </div>
                              ) : null}
                            </div>
                          )}
                          {log.input.userMessage && (
                            <div>
                              <span className="font-medium text-gray-700">학생 메시지:</span>
                              <div className="mt-1 text-gray-600">{log.input.userMessage}</div>
                            </div>
                          )}
                          {(log.input.explanationDisplay !== undefined || log.input.explanationImage !== undefined) && (
                            <div>
                              <span className="font-medium text-gray-700">해설:</span>
                              {log.input.explanationImage ? (
                                <div className="mt-2">
                                  <img 
                                    src={log.input.explanationImage} 
                                    alt="해설 이미지" 
                                    className="max-w-full max-h-60 rounded border border-gray-300"
                                  />
                                </div>
                              ) : log.input.explanationDisplay ? (
                                <div className="mt-1 text-gray-600 whitespace-pre-wrap">
                                  {log.input.explanationDisplay}
                                </div>
                              ) : null}
                            </div>
                          )}
                          {log.input.knowledgeElements && log.input.knowledgeElements.length > 0 && (
                            <div>
                              <span className="font-medium text-gray-700">지식요소:</span>
                              <div className="mt-1 text-gray-600">
                                {log.input.knowledgeElements.map((ke, idx) => (
                                  <div key={idx} className="text-xs">
                                    - {ke.name} ({ke.category}, {ke.cognitiveLevel})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.input.context !== undefined && (
                            <div>
                              <span className="font-medium text-gray-700">컨텍스트:</span>
                              <div className="mt-1 text-gray-600 whitespace-pre-wrap text-xs">{log.input.context}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 프롬프트 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <div className="w-1 h-4 bg-purple-500 rounded"></div>
                          프롬프트
                        </div>
                        <div className="bg-purple-50 rounded p-3 text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium text-gray-700">모델:</span>
                              <span className="ml-2 text-gray-600">{log.prompt.model}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Temperature:</span>
                              <span className="ml-2 text-gray-600">{log.prompt.temperature}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Max Tokens:</span>
                              <span className="ml-2 text-gray-600">{log.prompt.maxOutputTokens}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Thinking Budget:</span>
                              <span className="ml-2 text-gray-600">{log.prompt.thinkingBudget}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">시스템 프롬프트:</span>
                            <div className="mt-1 bg-white rounded p-2 text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {log.prompt.systemPrompt}
                            </div>
                          </div>
                          {log.prompt.responseSchema !== undefined && log.prompt.responseSchema !== null && (
                            <div>
                              <span className="font-medium text-gray-700">응답 스키마:</span>
                              <div className="mt-1 bg-white rounded p-2 text-gray-600 max-h-40 overflow-y-auto">
                                <pre className="text-xs">{JSON.stringify(log.prompt.responseSchema, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 아웃풋 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <div className="w-1 h-4 bg-green-500 rounded"></div>
                          아웃풋
                        </div>
                        <div className="bg-green-50 rounded p-3 text-xs">
                          {log.output.error ? (
                            <div className="text-red-700 font-medium">{log.output.error}</div>
                          ) : log.output.parsedDiagnostic ? (
                            <div className="space-y-2">
                              <div className="bg-white rounded p-2 max-h-60 overflow-y-auto">
                                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.output.parsedDiagnostic, null, 2)}</pre>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500">응답 데이터 없음</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'diagnostic' ? (
              <div>
                {currentDiagnostic ? (
                  <div className="bg-white rounded-lg p-4 sm:p-5">
                    {/* 리포트 헤더 */}
                    <div className="border-b border-gray-200 pb-3 mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        지식요소 진단 리포트
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">학생의 지식요소별 숙련도 분석 결과</p>
                    </div>

                    {/* 지식요소 진단 결과 */}
                    {currentDiagnostic.knowledge_diagnosis ? (
                      currentDiagnostic.knowledge_diagnosis.elements && currentDiagnostic.knowledge_diagnosis.elements.length > 0 ? (
                        <>
                          {/* 전체 숙련도 요약 */}
                          {currentDiagnostic.knowledge_diagnosis.overall_mastery_score !== undefined && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-gray-600 mb-1">전체 숙련도 점수</div>
                                  <div className="text-2xl font-bold text-blue-900">
                                    {currentDiagnostic.knowledge_diagnosis.overall_mastery_score}<span className="text-sm font-normal text-gray-600">/100</span>
                                  </div>
                                </div>
                                {currentDiagnostic.knowledge_diagnosis.uncertainty && (
                                  <div className="text-right">
                                    <div className="text-xs text-gray-600 mb-1">신뢰도</div>
                                    <div className={`text-sm font-semibold ${
                                      currentDiagnostic.knowledge_diagnosis.uncertainty === 'high' ? 'text-red-600' :
                                      currentDiagnostic.knowledge_diagnosis.uncertainty === 'medium' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      {currentDiagnostic.knowledge_diagnosis.uncertainty === 'high' ? '낮음' :
                                       currentDiagnostic.knowledge_diagnosis.uncertainty === 'medium' ? '보통' : '높음'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 지식요소별 상세 리포트 */}
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <div className="w-1 h-4 bg-blue-500 rounded"></div>
                              지식요소별 숙련도 분석
                            </h4>
                            <div className="space-y-3">
                              {currentDiagnostic.knowledge_diagnosis.elements.map((element, idx) => {
                                const masteryColor = element.mastery === 'high' 
                                  ? 'bg-green-50 border-green-200' 
                                  : element.mastery === 'medium'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-red-50 border-red-200';
                                const masteryBadgeColor = element.mastery === 'high' 
                                  ? 'bg-green-500 text-white' 
                                  : element.mastery === 'medium'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-red-500 text-white';
                                
                                // 지식요소 이름 찾기
                                const ke = currentProblem?.knowledgeElements?.find(ke => ke.id === element.ke_id);
                                const keName = ke?.name || element.ke_id;
                                
                                // 문제-지식요소 매핑 정보 찾기
                                const keMap = currentProblem?.keMaps?.find(map => map.keId === element.ke_id);
                                
                                return (
                                  <div
                                    key={idx}
                                    className={`border-l-4 rounded-r-lg p-3 ${masteryColor} hover:shadow-sm transition-shadow`}
                                    style={{ borderLeftColor: element.mastery === 'high' ? '#10b981' : element.mastery === 'medium' ? '#eab308' : '#ef4444' }}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-semibold text-gray-900">{keName}</span>
                                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${masteryBadgeColor}`}>
                                            {element.mastery === 'high' ? '높음' : element.mastery === 'medium' ? '보통' : '낮음'}
                                          </span>
                                        </div>
                                        {keMap && (
                                          <div className="text-xs text-gray-500 mb-1">
                                            필요 레벨: {keMap.requiredLevel} | 가중치: {keMap.weight}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-700 space-y-1.5">
                                      <div>
                                        <span className="font-semibold text-gray-900">근거:</span>
                                        <span className="ml-2">{element.evidence}</span>
                                      </div>
                                      {element.next_action && (
                                        <div>
                                          <span className="font-semibold text-blue-700">권장 행동:</span>
                                          <span className="ml-2 text-blue-600">{element.next_action}</span>
                                        </div>
                                      )}
                                      {ke && (
                                        <div className="flex gap-2 mt-2">
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                            {ke.category === 'concept' ? '개념' : 
                                             ke.category === 'principle' ? '원리' : 
                                             ke.category === 'procedure' ? '절차' : '통합'}
                                          </span>
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                            {ke.cognitiveLevel === 'remember' ? '기억' :
                                             ke.cognitiveLevel === 'understand' ? '이해' :
                                             ke.cognitiveLevel === 'apply' ? '적용' :
                                             ke.cognitiveLevel === 'analyze' ? '분석' :
                                             ke.cognitiveLevel === 'synthesize' ? '종합' : '평가'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 마이크로 평가 제안 */}
                          {currentDiagnostic.micro_assessments && currentDiagnostic.micro_assessments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <div className="w-1 h-4 bg-indigo-500 rounded"></div>
                                추가 확인 문제 제안
                              </h4>
                              <div className="space-y-2">
                                {currentDiagnostic.micro_assessments.map((assessment, idx) => {
                                  const keName = currentProblem?.knowledgeElements?.find(ke => ke.id === assessment.ke_id)?.name || assessment.ke_id;
                                  return (
                                    <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs">
                                      <div className="font-semibold text-indigo-900 mb-1">{keName}</div>
                                      <div className="text-indigo-700">{assessment.prompt}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-8 text-sm">
                          지식요소 진단 결과가 없습니다.
                        </div>
                      )
                    ) : (
                      <div className="text-center text-gray-500 py-8 text-sm">
                        지식요소 진단이 아직 수행되지 않았습니다.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    진단 정보가 없습니다.
                    <br />
                    학생이 메시지를 보내면 진단 결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            ) : null}
              </div>

              {activeTab === 'chat' && (
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
                      disabled={!currentInput.trim() || isLoading || !activeConfig || isConfigLoading}
                      className="px-5 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-500 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-all duration-200"
                      aria-label="메시지 전송"
                      title={!activeConfig || isConfigLoading ? 'AI 연동 설정을 불러오는 중입니다...' : ''}
                    >
                      전송
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 시스템 프롬프트 UI 섹션 제거 - 프롬프트 내용은 코드에 유지 */}
      </div>

      {/* 문제 상세 정보 모달 */}
      {showProblemDetail && currentProblem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProblemDetail(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900">문제 상세 정보</h2>
              <button
                onClick={() => setShowProblemDetail(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 문제 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded"></div>
                  문제
                </h3>
                {currentProblem.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={currentProblem.imageUrl}
                      alt="문제 이미지"
                      className="w-full max-h-[500px] object-contain border border-gray-200 rounded p-2 bg-gray-50"
                    />
                  </div>
                )}
                {currentProblem.content && !currentProblem.content.startsWith('[이미지 문제:') && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{currentProblem.content}</p>
                  </div>
                )}
              </div>

              {/* 해설 */}
              {(currentProblem.explanationImageUrl || currentProblem.explanationText) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-5 bg-orange-500 rounded"></div>
                    해설
                  </h3>
                  {currentProblem.explanationImageUrl && (
                    <div className="mb-3">
                      <img
                        src={currentProblem.explanationImageUrl}
                        alt="해설 이미지"
                        className="w-full max-h-[500px] object-contain border border-orange-200 rounded p-2 bg-orange-50"
                      />
                    </div>
                  )}
                  {currentProblem.explanationText && !currentProblem.explanationText.startsWith('[이미지 해설:') && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-gray-800 whitespace-pre-wrap">{currentProblem.explanationText}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 비고 */}
              {currentProblem.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded"></div>
                    비고
                  </h3>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{currentProblem.notes}</p>
                  </div>
                </div>
              )}

              {/* 관련 지식 요소 */}
              {currentProblem.knowledgeElements && currentProblem.knowledgeElements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded"></div>
                    관련 지식 요소
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white border border-gray-200 rounded-lg">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">구분</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">지식요소</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">내용 설명</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">출처(성취기준)</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">인지 수준</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentProblem.knowledgeElements.map((ke, idx) => {
                          const keMap = currentProblem.keMaps?.find(map => map.keId === ke.id);
                          return (
                            <tr key={ke.id || idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                                {ke.category === 'concept' ? '개념' : 
                                 ke.category === 'principle' ? '원리' : 
                                 ke.category === 'procedure' ? '절차' : '통합'}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900">{ke.name}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{ke.description || '-'}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{ke.source || '-'}</td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                                {ke.cognitiveLevel === 'remember' ? '기억' :
                                 ke.cognitiveLevel === 'understand' ? '이해' :
                                 ke.cognitiveLevel === 'apply' ? '적용' :
                                 ke.cognitiveLevel === 'analyze' ? '분석' :
                                 ke.cognitiveLevel === 'synthesize' ? '종합' : '평가'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 메타 정보 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {currentProblem.grade && (
                    <div>
                      <span className="font-semibold text-gray-700">학년:</span> {currentProblem.grade}
                    </div>
                  )}
                  {currentProblem.unit && (
                    <div>
                      <span className="font-semibold text-gray-700">태그명:</span> {currentProblem.unit}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-gray-700">생성:</span> {currentProblem.createdAt}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">수정:</span> {currentProblem.updatedAt}
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowProblemDetail(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문제 등록 모달 */}
      {showAddProblemModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={cancelAddProblem}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900">새 문제 추가</h2>
              <button
                onClick={cancelAddProblem}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">문제 제목 *</label>
                <input
                  type="text"
                  value={newProblem.title || ''}
                  onChange={(e) => setNewProblem(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 이차방정식 근의 공식"
                />
              </div>

              {/* 학년/태그명 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelect
                  label="학년"
                  placeholder="선택하세요"
                  options={grades}
                  value={newProblem.grade || ''}
                  onChange={(value) => setNewProblem(prev => ({ ...prev, grade: value }))}
                  onAddNew={handleAddGrade}
                  emptyText="학년 없음"
                />
                <SearchableSelect
                  label="태그명"
                  placeholder="선택하세요"
                  options={units}
                  value={newProblem.unit || ''}
                  onChange={(value) => setNewProblem(prev => ({ ...prev, unit: value }))}
                  onAddNew={handleAddUnit}
                  emptyText="태그명 없음"
                />
              </div>

              {/* 문제 입력 방식 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">문제 입력 방식</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      inputMode === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    텍스트
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      inputMode === 'image'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    이미지
                  </button>
                </div>

                {inputMode === 'text' ? (
                  <textarea
                    value={newProblem.content || ''}
                    onChange={(e) => setNewProblem(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="문제 내용을 입력하세요..."
                  />
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'problem')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      이미지 선택
                    </button>
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} alt="미리보기" className="max-w-full h-auto border border-gray-300 rounded" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">해설 (선택사항)</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setExplanationInputMode('text')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      explanationInputMode === 'text'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    텍스트
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplanationInputMode('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      explanationInputMode === 'image'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    이미지
                  </button>
                </div>

                {explanationInputMode === 'text' ? (
                  <textarea
                    value={newProblem.explanationText || ''}
                    onChange={(e) => setNewProblem(prev => ({ ...prev, explanationText: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={4}
                    placeholder="해설을 입력하세요..."
                  />
                ) : (
                  <div>
                    <input
                      ref={explanationFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'explanation')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => explanationFileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      해설 이미지 선택
                    </button>
                    {explanationImagePreview && (
                      <div className="mt-3">
                        <img src={explanationImagePreview} alt="해설 미리보기" className="max-w-full h-auto border border-orange-300 rounded" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={newProblem.notes || ''}
                  onChange={(e) => setNewProblem(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="메모나 비고사항을 입력하세요..."
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={cancelAddProblem}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={addProblem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathTutorDiagnostic;
