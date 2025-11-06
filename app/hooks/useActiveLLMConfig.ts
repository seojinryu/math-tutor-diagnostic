'use client';
import { useState, useEffect } from 'react';
import type { LLMConfig } from '../admin/prompt/page';
import { DEFAULT_INPUT_SCHEMA, DEFAULT_RESPONSE_SCHEMA } from '../admin/prompt/page';

interface UseActiveLLMConfigReturn {
  config: LLMConfig | null;
  configs: LLMConfig[];  // 전체 설정 목록
  activeConfigs: LLMConfig[];  // ✅ 활성화된 설정 목록만
  isLoading: boolean;
  error: string | null;
  setActiveConfig: (configId: string) => void;
}

/**
 * Active LLM Config를 LocalStorage에서 로드하고 관리하는 커스텀 훅
 * 
 * 기능:
 * - LocalStorage에서 LLM 설정 목록 로드
 * - 활성 설정 자동 선택 (activeConfigId 또는 isActive 또는 첫 번째)
 * - storage 이벤트 감지 (다른 탭에서 변경 시)
 * - llmConfigUpdated 커스텀 이벤트 감지 (같은 탭 내 변경 시)
 */
export function useActiveLLMConfig(): UseActiveLLMConfigReturn {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [activeConfigs, setActiveConfigs] = useState<LLMConfig[]>([]);  // ✅ 활성화된 설정 목록
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nowTime = () =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date());

  const uid = () => Math.random().toString(36).slice(2);

  const loadActiveConfig = () => {
    console.log('🔄 [useActiveLLMConfig] Loading active config...');
    
    try {
      setIsLoading(true);
      setError(null);

      // 1. LocalStorage에서 설정 목록 읽기
      const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
      const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');

      console.log('📦 [useActiveLLMConfig] storedConfigs:', storedConfigs);
      console.log('🎯 [useActiveLLMConfig] activeConfigId:', activeConfigId);

      if (!storedConfigs) {
        console.warn('⚠️ [useActiveLLMConfig] No configs in localStorage');
        // ✅ 기본 설정 자동 시드
        const defaultSystemPrompt = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하고 가르치는 교육용 AI입니다. 주어진 학생의 응답과 문제 및 해설 데이터를 분석하여 다음을 수행하세요: 

### **입력 데이터**

- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}

- **해설**: {해설 텍스트, 예: "(x-2)(x-3)=0이므로 근은 2, 3입니다."}

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

   - 진단결과 폴리아 단계에 적합한 단계별 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?")
  
   - 문제 풀이는 해설의 논리구조를 따르되 해설자료가 있음을 언급하지 않음
 
   - 어투는 친근한 대화체

   - 4단계(되돌아보기)는 AI가 직접 해당 문제의 포인트와 풀이과정에서 학생이 알아야할 핵심 포인트를 정리해주는 것으로 대체

4. **피드백 완료 여부 판단**:

   - 학생이 정답 도출에 성공했는지 여부 판단 

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

        const defaultConfig: LLMConfig = {
          id: uid(),
          name: '기본 LLM 설정',
          description: '폴리아 4단계 기반 기본 진단 설정',
          version: 'v1.0.0',
          systemPrompt: defaultSystemPrompt,
          userPrompt: '',
          inputSchema: DEFAULT_INPUT_SCHEMA as unknown as typeof DEFAULT_INPUT_SCHEMA,
          outputSchema: DEFAULT_RESPONSE_SCHEMA as unknown as typeof DEFAULT_RESPONSE_SCHEMA,
          responseMimeType: 'application/json',
          provider: 'gemini',
          model: 'gemini-2.5-pro',
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingBudget: 1200,
          createdAt: nowTime(),
          updatedAt: nowTime(),
          isActive: true,
          isSystem: true,
        };

        const seeded = [defaultConfig];
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(seeded));
        localStorage.setItem('math_tutor_active_llm_config_id', defaultConfig.id);
        // 바로 다음 로직에서 읽힐 수 있도록 storedConfigs 값을 갱신
        return loadActiveConfig();
      }

      // 2. JSON 파싱
      let parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
      console.log('📋 [useActiveLLMConfig] Parsed configs:', parsedConfigs.length, 'items');

      if (parsedConfigs.length === 0) {
        console.warn('⚠️ [useActiveLLMConfig] Empty configs array');
        // ✅ 비어있으면 기본 설정 시드
        const defaultSystemPrompt = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하고 가르치는 교육용 AI입니다. 주어진 학생의 응답과 문제 및 해설 데이터를 분석하여 다음을 수행하세요: 

### **입력 데이터**

- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}

- **해설**: {해설 텍스트, 예: "(x-2)(x-3)=0이므로 근은 2, 3입니다."}

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

   - 진단결과 폴리아 단계에 적합한 단계별 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?")
  
   - 문제 풀이는 해설의 논리구조를 따르되 해설자료가 있음을 언급하지 않음
 
   - 어투는 친근한 대화체

   - 4단계(되돌아보기)는 AI가 직접 해당 문제의 포인트와 풀이과정에서 학생이 알아야할 핵심 포인트를 정리해주는 것으로 대체

4. **피드백 완료 여부 판단**:

   - 학생이 정답 도출에 성공했는지 여부 판단 

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

        const defaultConfig: LLMConfig = {
          id: uid(),
          name: '기본 LLM 설정',
          description: '폴리아 4단계 기반 기본 진단 설정',
          version: 'v1.0.0',
          systemPrompt: defaultSystemPrompt,
          userPrompt: '',
          inputSchema: DEFAULT_INPUT_SCHEMA as unknown as typeof DEFAULT_INPUT_SCHEMA,
          outputSchema: DEFAULT_RESPONSE_SCHEMA as unknown as typeof DEFAULT_RESPONSE_SCHEMA,
          responseMimeType: 'application/json',
          provider: 'gemini',
          model: 'gemini-2.5-pro',
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingBudget: 1200,
          createdAt: nowTime(),
          updatedAt: nowTime(),
          isActive: true,
          isSystem: true,
        };

        const seeded = [defaultConfig];
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(seeded));
        localStorage.setItem('math_tutor_active_llm_config_id', defaultConfig.id);
        return loadActiveConfig();
      }

      // ✅ 2-1. 시스템 기본 설정 존재 보장 (과거 버전에서 삭제된 사용자를 위해 복원)
      const hasSystemDefault = parsedConfigs.some(c => c.isSystem);
      if (!hasSystemDefault) {
        const defaultSystemPrompt = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하고 가르치는 교육용 AI입니다. 주어진 학생의 응답과 문제 및 해설 데이터를 분석하여 다음을 수행하세요: 

### **입력 데이터**

- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}

- **해설**: {해설 텍스트, 예: "(x-2)(x-3)=0이므로 근은 2, 3입니다."}

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

   - 진단결과 폴리아 단계에 적합한 단계별 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?")
  
   - 문제 풀이는 해설의 논리구조를 따르되 해설자료가 있음을 언급하지 않음
 
   - 어투는 친근한 대화체

   - 4단계(되돌아보기)는 AI가 직접 해당 문제의 포인트와 풀이과정에서 학생이 알아야할 핵심 포인트를 정리해주는 것으로 대체

4. **피드백 완료 여부 판단**:

   - 학생이 정답 도출에 성공했는지 여부 판단 

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

        const systemDefault: LLMConfig = {
          id: uid(),
          name: '기본 LLM 설정',
          description: '폴리아 4단계 기반 기본 진단 설정',
          version: 'v1.0.0',
          systemPrompt: defaultSystemPrompt,
          userPrompt: '',
          inputSchema: DEFAULT_INPUT_SCHEMA as unknown as typeof DEFAULT_INPUT_SCHEMA,
          outputSchema: DEFAULT_RESPONSE_SCHEMA as unknown as typeof DEFAULT_RESPONSE_SCHEMA,
          responseMimeType: 'application/json',
          provider: 'gemini',
          model: 'gemini-2.5-pro',
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingBudget: 1200,
          createdAt: nowTime(),
          updatedAt: nowTime(),
          isActive: true, // ✅ 기본 설정은 항상 활성화
          isSystem: true,
        };
        parsedConfigs = [systemDefault, ...parsedConfigs];
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(parsedConfigs));
      }

      // ✅ 2-2. 시스템 기본 설정이 존재하지만 비활성화되어 있다면 강제로 활성화
      const sysIndex = parsedConfigs.findIndex(c => c.isSystem);
      if (sysIndex >= 0 && !parsedConfigs[sysIndex].isActive) {
        parsedConfigs[sysIndex] = { ...parsedConfigs[sysIndex], isActive: true } as LLMConfig;
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(parsedConfigs));
      }

      setConfigs(parsedConfigs);

      // ✅ 3. 활성화된 설정들만 필터링
      const activeOnes = parsedConfigs.filter(c => c.isActive);
      setActiveConfigs(activeOnes);
      console.log('📋 [useActiveLLMConfig] Active configs:', activeOnes.length, 'items');

      // 4. 현재 선택된 설정 찾기 (우선순위: activeConfigId > 활성화된 첫 번째 > 첫 번째)
      let activeConfig: LLMConfig | null = null;

      if (activeConfigId) {
        activeConfig = parsedConfigs.find(c => c.id === activeConfigId) || null;
        // ✅ 선택된 설정이 활성화되어 있지 않으면 null로 처리
        if (activeConfig && !activeConfig.isActive) {
          console.warn('⚠️ [useActiveLLMConfig] Selected config is not active:', activeConfig.name);
          activeConfig = null;
        }
        console.log('🔍 [useActiveLLMConfig] Config by ID:', activeConfig?.name);
      }

      if (!activeConfig && activeOnes.length > 0) {
        // ✅ 활성화된 설정 중 첫 번째 선택
        activeConfig = activeOnes[0];
        console.log('🔍 [useActiveLLMConfig] First active config:', activeConfig.name);
      }

      if (!activeConfig && parsedConfigs.length > 0) {
        // ✅ 활성화된 설정이 없으면 첫 번째 설정을 fallback으로 (이전 동작 유지)
        activeConfig = parsedConfigs[0];
        console.log('🔍 [useActiveLLMConfig] First config as fallback:', activeConfig.name);
      }

      if (activeConfig) {
        console.log('✅ [useActiveLLMConfig] Active config loaded:', {
          name: activeConfig.name,
          model: activeConfig.model,
          isActive: activeConfig.isActive,
          hasSystemPrompt: !!activeConfig.systemPrompt,
          hasInputSchema: !!activeConfig.inputSchema,
          hasOutputSchema: !!activeConfig.outputSchema,
        });

        setConfig(activeConfig);
        
        // activeConfigId가 없거나 선택된 설정이 활성화되지 않은 경우 업데이트
        if (!activeConfigId || activeConfig.id !== activeConfigId) {
          localStorage.setItem('math_tutor_active_llm_config_id', activeConfig.id);
        }
      } else {
        console.error('❌ [useActiveLLMConfig] No valid config found');
        setError('유효한 AI 연동 설정을 찾을 수 없습니다.');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('❌ [useActiveLLMConfig] Error:', err);
      setError(err instanceof Error ? err.message : 'AI 연동 설정 로드 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const setActiveConfig = (configId: string) => {
    console.log('🎯 [useActiveLLMConfig] Setting active config:', configId);
    
    const selectedConfig = configs.find(c => c.id === configId);
    if (selectedConfig) {
      // ✅ 활성화된 설정만 선택 가능하도록 검증
      if (!selectedConfig.isActive) {
        console.warn('⚠️ [useActiveLLMConfig] Selected config is not active:', selectedConfig.name);
        // 활성화되지 않은 설정도 선택은 가능하지만 경고 표시
      }
      setConfig(selectedConfig);
      localStorage.setItem('math_tutor_active_llm_config_id', configId);
      console.log('✅ [useActiveLLMConfig] Active config updated:', selectedConfig.name);
    } else {
      console.error('❌ [useActiveLLMConfig] Config not found:', configId);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 초기 로드
    loadActiveConfig();

    // storage 이벤트 감지 (다른 탭에서 변경)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'math_tutor_llm_configs' || e.key === 'math_tutor_active_llm_config_id') {
        console.log('📡 [useActiveLLMConfig] Storage event detected:', e.key);
        loadActiveConfig();
      }
    };

    // 커스텀 이벤트 감지 (같은 탭 내 변경)
    const handleConfigUpdate = () => {
      console.log('📡 [useActiveLLMConfig] llmConfigUpdated event detected');
      loadActiveConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('llmConfigUpdated', handleConfigUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('llmConfigUpdated', handleConfigUpdate);
    };
  }, []);

  return {
    config,
    configs,
    activeConfigs,  // ✅ 활성화된 설정 목록 추가
    isLoading,
    error,
    setActiveConfig,
  };
}

