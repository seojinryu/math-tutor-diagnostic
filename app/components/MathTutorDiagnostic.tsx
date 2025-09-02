'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Send, MessageCircle, Brain, Settings, BookOpen, Key } from 'lucide-react';

interface DiagnosticData {
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

interface Message {
  type: 'student' | 'llm';
  content: string;
  timestamp: string;
  diagnostic?: DiagnosticData | null;
  rawResponse?: string;
  isError?: boolean;
}

const MathTutorDiagnostic = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentProblem, setCurrentProblem] = useState(
    '어느 달팽이는 한 시간에 42m를 갑니다. 이 달팽이가 같은 빠르기로 20분 동안 갈 수 있는 거리는 몇 m입니까?\n객관식 보기: ① 13m ② 13¾m ③ 14m ④ 14⅓m'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini');
  const [currentDiagnostic, setCurrentDiagnostic] = useState<DiagnosticData | null>(null);

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

  // JSON-only 강제 버전의 시스템 프롬프트
  const SYSTEM_PROMPT_JSON_ONLY = useMemo(() => {
    return (
      SYSTEM_PROMPT_BASE +
      '\n\n---\n반드시 위의 형식과 일치하는 **순수 JSON 객체 하나만** 출력하세요. 코드블록(```), 마크다운, 주석, 추가 설명, 접두/접미 텍스트를 금지합니다.'
    );
  }, []);

  const nowTime = () => new Date().toLocaleTimeString();

  // --- Gemini 응답 파서(보강판): text, inlineData 모두 처리, finishReason/차단 사유 노출 ---
  const safeExtractTextFromGemini = (data: any): string => {
    const blocked = data?.promptFeedback?.blockReason;
    const candidates = data?.candidates as Array<any> | undefined;
    if (!candidates?.length) {
      if (blocked) throw new Error(`안전성 정책으로 차단됨: ${blocked}`);
      throw new Error('응답에 candidates가 없습니다.');
    }

    const c0 = candidates[0];
    const parts: any[] = c0?.content?.parts ?? [];

    const decodeInline = (b64: string) => {
      try {
        if (typeof atob === 'function') return atob(b64);
        // Node/SSR 대비
        // @ts-ignore
        return Buffer.from(b64, 'base64').toString('utf-8');
      } catch {
        return '';
      }
    };

    const texts: string[] = [];
    for (const p of parts) {
      if (typeof p?.text === 'string') texts.push(p.text);
      else if (p?.inlineData?.data) texts.push(decodeInline(p.inlineData.data));
      else if (p?.functionCall?.name) texts.push(`[functionCall:${p.functionCall.name}]`);
    }

    const text = texts.join('').trim();

    if (!text) {
      const finish = c0?.finishReason;
      if (blocked) throw new Error(`안전성 정책으로 차단됨: ${blocked}`);
      if (finish && finish !== 'STOP') throw new Error(`출력 중단: ${finish}`);
      throw new Error('응답에 텍스트가 없습니다. (parts 형식 미일치 가능)');
    }
    return text;
  };

  // JSON 추출기(여전히 다른 모델에서 보호적으로 사용)
  const extractJSON = (text: string): DiagnosticData | null => {
    try {
      // 코드블록 제거 시도
      const block = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (block) return JSON.parse(block[1]);

      // 첫 중괄호 ~ 마지막 중괄호 범위 파싱 시도
      const i = text.indexOf('{');
      const j = text.lastIndexOf('}');
      if (i !== -1 && j !== -1 && j > i) {
        const maybe = text.slice(i, j + 1);
        return JSON.parse(maybe);
      }
      return null;
    } catch {
      return null;
    }
  };

  // --- 각 프로바이더 호출 ---
  const callGemini = async (userMessage: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    `${SYSTEM_PROMPT_JSON_ONLY}\n\n` +
                    `### 실제 입력 데이터\n` +
                    `- 문제: ${currentProblem}\n` +
                    `- 학생 응답: ${userMessage}\n` +
                    `- 컨텍스트: ${messages.map((m) => `${m.type}: ${m.content}`).join('\n')}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            topK: 40,
            topP: 1,
            maxOutputTokens: 1000,
            // JSON만 받도록 강제
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini API 오류: ${res.status} ${res.statusText} - ${t}`);
    }
    const data = await res.json();
    const text = safeExtractTextFromGemini(data); // string(JSON)

    // JSON만 오도록 강제했으므로 바로 파싱 검증
    try {
      JSON.parse(text);
    } catch (e: any) {
      throw new Error(`JSON 파싱 실패: ${e?.message || e}`);
    }
    return text; // JSON 문자열을 반환
  };

  const callOpenAI = async (userMessage: string) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_JSON_ONLY },
          {
            role: 'user',
            content:
              `### 실제 입력 데이터\n` +
              `- 문제: ${currentProblem}\n` +
              `- 학생 응답: ${userMessage}\n` +
              `- 컨텍스트: ${messages.map((m) => `${m.type}: ${m.content}`).join('\n')}`,
          },
        ],
        temperature: 0,
        max_tokens: 1000,
        // JSON 모드가 가능한 엔드포인트에선 response_format을 쓸 수 있지만
        // 호환성을 위해 프롬프트 강제 + 파서로 처리
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI API 오류: ${res.status} ${res.statusText} - ${t}`);
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('OpenAI 응답에 content가 없습니다.');

    // 가능하면 바로 JSON 파싱(검증) 후 원문 반환
    const json = extractJSON(content) ?? (() => { throw new Error('OpenAI 응답에서 JSON을 찾지 못했습니다.'); })();
    return JSON.stringify(json);
  };

  const callClaude = async (userMessage: string) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        system: SYSTEM_PROMPT_JSON_ONLY,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content:
              `### 실제 입력 데이터\n` +
              `- 문제: ${currentProblem}\n` +
              `- 학생 응답: ${userMessage}\n` +
              `- 컨텍스트: ${messages.map((m) => `${m.type}: ${m.content}`).join('\n')}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Claude API 오류: ${res.status} ${res.statusText} - ${t}`);
    }
    const data = await res.json();
    const contentArr = (data?.content ?? []) as Array<{ type: string; text: string }>;
    const text = contentArr.map((c) => (c?.type === 'text' ? c.text : '')).join('').trim();
    if (!text) throw new Error('Claude 응답에 텍스트가 없습니다.');

    const json = extractJSON(text) ?? (() => { throw new Error('Claude 응답에서 JSON을 찾지 못했습니다.'); })();
    return JSON.stringify(json);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    if (!apiKey) {
      alert('API 키를 먼저 입력해주세요.');
      return;
    }

    setIsLoading(true);
    const studentMessage: Message = {
      type: 'student',
      content: currentInput,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, studentMessage]);

    try {
      let llmResponse = '';
      if (apiProvider === 'gemini') llmResponse = await callGemini(currentInput);
      else if (apiProvider === 'openai') llmResponse = await callOpenAI(currentInput);
      else llmResponse = await callClaude(currentInput);

      // 여기서부터는 llmResponse가 가능하면 순수 JSON 문자열이라고 가정
      let jsonData: DiagnosticData | null = null;
      try {
        jsonData = JSON.parse(llmResponse);
      } catch {
        jsonData = extractJSON(llmResponse);
      }

      const responseText = jsonData ? '' : llmResponse.replace(/```json[\s\S]*?```/g, '').trim();

      if (jsonData) setCurrentDiagnostic(jsonData);

      const llmMessage: Message = {
        type: 'llm',
        content: responseText || '(응답이 JSON만 포함되어 있습니다)',
        diagnostic: jsonData,
        timestamp: nowTime(),
        rawResponse: llmResponse,
      };
      setMessages((prev) => [...prev, llmMessage]);
      setCurrentInput('');
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : '알 수 없는 오류';
      const errorMessage: Message = {
        type: 'llm',
        content: `오류가 발생했습니다: ${errorText}`,
        timestamp: nowTime(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim() && typeof window !== 'undefined') {
      localStorage.setItem(`${apiProvider}_api_key`, apiKey);
      setShowApiKeyInput(false);
    }
  };

  const clearApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${apiProvider}_api_key`);
    }
    setApiKey('');
    setShowApiKeyInput(true);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentDiagnostic(null);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800',
      '2': 'bg-green-100 text-green-800',
      '3': 'bg-orange-100 text-orange-800',
      '4': 'bg-purple-100 text-purple-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      '1': '문제 이해하기',
      '2': '계획 세우기',
      '3': '계획 실행하기',
      '4': '되돌아보기',
    };
    return labels[stage] || '단계 미정';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${apiProvider}_api_key`);
      if (saved) {
        setApiKey(saved);
        setShowApiKeyInput(false);
      } else {
        setShowApiKeyInput(true);
      }
    }
  }, [apiProvider]);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Brain className="text-blue-600" />
          수학 교육용 LLM 진단 시스템
        </h1>
        <p className="text-gray-600">폴리아의 4단계 문제해결 접근법을 기반으로 학생의 학습 상태를 실시간 진단합니다.</p>
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
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value as 'gemini' | 'openai' | 'claude')}
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
                    onChange={(e) => setApiKey(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 max-w-md"
                  />
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
          <button onClick={clearApiKey} className="text-sm text-green-600 hover:text-green-800">
            API 키 변경
          </button>
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
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-sm rounded-lg p-3 ${
                    message.isError
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : message.type === 'student'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{message.type === 'student' ? '학생' : 'LLM'}</div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="학생 메시지를 입력하세요..."
                className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading || !apiKey}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={16} />
                전송
              </button>
            </div>
          </div>
        </div>

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
                <div className="mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(currentDiagnostic.recommended_stage)}`}>
                    단계 {currentDiagnostic.recommended_stage}: {getStageLabel(currentDiagnostic.recommended_stage)}
                  </span>
                </div>

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
                  .map((m, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(m.diagnostic!.recommended_stage)}`}>
                            단계 {m.diagnostic!.recommended_stage}: {getStageLabel(m.diagnostic!.recommended_stage)}
                          </span>
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
          <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{SYSTEM_PROMPT_BASE}\n\n[실행 정책]\n- 모델 응답은 가능하면 순수 JSON으로 받습니다.\n- Gemini는 responseMimeType을 application/json으로 강제합니다.\n- OpenAI/Claude는 프롬프트로 JSON만 출력하도록 지시하고, 응답에서 JSON을 추출/검증합니다.</pre>
        </div>
      </div>
    </div>
  );
};

export default MathTutorDiagnostic;