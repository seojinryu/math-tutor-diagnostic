'use client';
import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Brain, FileText, Settings, BookOpen, Key } from 'lucide-react';

interface Message {
  type: 'student' | 'llm';
  content: string;
  timestamp: string;
  diagnostic?: any;
  rawResponse?: string;
  isError?: boolean;
}

const MathTutorDiagnostic = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentProblem, setCurrentProblem] = useState('어느 달팽이는 한 시간에 42m를 갑니다. 이 달팽이가 같은 빠르기로 20분 동안 갈 수 있는 거리는 몇 m입니까?\n객관식 보기: ① 13m ② 13¾m ③ 14m ④ 14⅓m');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [apiProvider, setApiProvider] = useState('openai');

  const SYSTEM_PROMPT = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 LLM입니다. 

주어진 학생의 응답과 문제 데이터를 분석하여 다음을 수행하세요:

### **임무**
1. **학생 상태 진단**:
   - **문제 이해도**: 학생이 문제의 요구사항을 파악했는지? (low/medium/high)
   - **개념 지식**: 관련 수학 개념을 이해하는 수준 (low/medium/high)
   - **오류 패턴**: 계산 실수, 논리 오류, 개념 혼동, 접근법 선택 오류 등 식별 (none/calculation_error/logical_error/concept_confusion/approach_error)
   - **학습 스타일**: 시각적/논리적/실험적/unknown 중 선호 추정
   - **자신감 수준**: 학생의 답변에서 드러나는 태도 (low/medium/high)

2. **폴리아 4단계 추천**: 진단 결과에 따라 적합한 폴리아 단계(1~4) 추천

3. **다음 질문 제안**: 학생의 상태에 맞춘 후속 질문 또는 힌트

### **출력 형식**
먼저 학생에게 할 말을 자연스럽게 답변하고, 그 다음에 반드시 다음 JSON 형식으로 진단 결과를 제공하세요:

\`\`\`json
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
}
\`\`\`

현재 문제: ${currentProblem}
이전 대화 내역: ${messages.map(m => `${m.type}: ${m.content}`).join('\n')}`;

  // OpenAI API 호출
  const callOpenAI = async (userMessage: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  // Claude API 호출 (Anthropic)
  const callClaude = async (userMessage: string) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: `${SYSTEM_PROMPT}\n\n학생 응답: ${userMessage}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  // JSON 추출 함수
  const extractJSON = (text: string) => {
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // JSON이 코드 블록 없이 있을 수도 있음
      const lines = text.split('\n');
      let jsonStart = -1;
      let jsonEnd = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('{')) {
          jsonStart = i;
        }
        if (lines[i].trim().endsWith('}') && jsonStart !== -1) {
          jsonEnd = i;
          break;
        }
      }
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = lines.slice(jsonStart, jsonEnd + 1).join('\n');
        return JSON.parse(jsonStr);
      }
      
      return null;
    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    if (!apiKey) {
      alert('API 키를 먼저 입력해주세요.');
      return;
    }

    setIsLoading(true);
    
    try {
      const studentMessage: Message = {
        type: 'student',
        content: currentInput,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, studentMessage]);

      // API 호출
      let llmResponse;
      if (apiProvider === 'openai') {
        llmResponse = await callOpenAI(currentInput);
      } else {
        llmResponse = await callClaude(currentInput);
      }

      // 응답에서 LLM 답변과 JSON 분리
      const jsonData = extractJSON(llmResponse);
      const responseText = llmResponse.replace(/```json[\s\S]*?```/g, '').trim();

      const llmMessage: Message = {
        type: 'llm',
        content: responseText,
        diagnostic: jsonData,
        timestamp: new Date().toLocaleTimeString(),
        rawResponse: llmResponse
      };

      setMessages(prev => [...prev, llmMessage]);
      setCurrentInput('');
      
    } catch (error) {
      console.error('API 호출 오류:', error);
      const errorMessage: Message = {
        type: 'llm',
        content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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
    if (apiKey.trim()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${apiProvider}_api_key`, apiKey);
      }
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
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800',
      '2': 'bg-green-100 text-green-800', 
      '3': 'bg-orange-100 text-orange-800',
      '4': 'bg-purple-100 text-purple-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      '1': '문제 이해하기',
      '2': '계획 세우기',
      '3': '계획 실행하기', 
      '4': '되돌아보기'
    };
    return labels[stage] || '단계 미정';
  };

  // 컴포넌트 로드 시 저장된 API 키 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem(`${apiProvider}_api_key`);
      if (savedKey) {
        setApiKey(savedKey);
        setShowApiKeyInput(false);
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

      {/* API 키 설정 */}
      {showApiKeyInput && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <Key className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">
                  LLM API를 사용하려면 API 키를 입력하세요.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="claude">Anthropic (Claude)</option>
                  </select>
                  <input
                    type="password"
                    placeholder={`${apiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API 키를 입력하세요`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 max-w-md"
                  />
                  <button
                    onClick={saveApiKey}
                    className="bg-yellow-600 text-white px-4 py-1 rounded text-sm hover:bg-yellow-700"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showApiKeyInput && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <Key className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-green-700">
              {apiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API 키가 설정되었습니다.
            </span>
          </div>
          <button
            onClick={clearApiKey}
            className="text-sm text-green-600 hover:text-green-800"
          >
            API 키 변경
          </button>
        </div>
      )}

      {/* 현재 문제 */}
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
        {/* 채팅 영역 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-blue-600" size={20} />
                학생-LLM 대화
              </h2>
              <button
                onClick={clearChat}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
              >
                대화 초기화
              </button>
            </div>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                학생의 첫 메시지를 기다리고 있습니다...
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm rounded-lg p-3 ${
                  message.isError
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : message.type === 'student' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm font-medium mb-1">
                    {message.type === 'student' ? '학생' : 'LLM'}
                  </div>
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">{message.timestamp}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="학생 메시지를 입력하세요..."
                className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* 진단 결과 영역 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="text-purple-600" size={20} />
              실시간 진단 결과
            </h2>
          </div>
          
          <div className="p-4 h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                학생이 메시지를 보내면<br />진단 결과가 여기에 표시됩니다.
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .filter(m => m.type === 'llm' && m.diagnostic)
                  .map((message, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(message.diagnostic.recommended_stage)}`}>
                            단계 {message.diagnostic.recommended_stage}: {getStageLabel(message.diagnostic.recommended_stage)}
                          </span>
                          <span className="text-xs text-gray-500">{message.timestamp}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded p-3 mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">진단 상태</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>문제 이해도: <span className="font-medium">{message.diagnostic.diagnosis.problem_understanding}</span></div>
                          <div>개념 지식: <span className="font-medium">{message.diagnostic.diagnosis.concept_knowledge}</span></div>
                          <div>오류 패턴: <span className="font-medium">{message.diagnostic.diagnosis.error_pattern}</span></div>
                          <div>자신감: <span className="font-medium">{message.diagnostic.diagnosis.confidence_level}</span></div>
                        </div>
                      </div>

                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-gray-900 mb-2">JSON 출력</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{JSON.stringify(message.diagnostic, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Settings className="text-gray-600" size={20} />
          시스템 프롬프트 (폴리아 4단계 기반 진단)
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
{SYSTEM_PROMPT}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MathTutorDiagnostic;