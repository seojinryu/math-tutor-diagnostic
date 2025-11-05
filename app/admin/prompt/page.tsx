'use client';
import { useState, useEffect } from 'react';
import {
  Save,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle,
  Info,
  Edit3,
  Maximize2,
  Check
} from 'lucide-react';

const SYSTEM_PROMPT_BASE = `당신은 폴리아(Polya)의 4단계 문제해결 접근법(① 문제 이해하기, ② 계획 세우기, ③ 계획 실행하기, ④ 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 AI 튜터입니다.

또한, 문제 해결에 필요한 지식 요소(개념·원리·절차·통합)를 분석하고, 학생의 발화와 풀이를 근거로 각 요소별 숙련도와 다음 학습 행동을 제안합니다.

🧩 입력 데이터

문제: {문제 텍스트}

해설: {공식 또는 해설 텍스트}

학생 응답: {학생의 답변, 풀이 과정, 질문 등}

컨텍스트 (선택): {이전 대화, 과거 오류 패턴, 학습 이력}

지식요소목록:

[

  {"id":"KE1","이름":"삼각비의 정의","구분":"개념","인지수준":"이해"},

  {"id":"KE2","이름":"특수각의 삼각비 값","구분":"개념","인지수준":"기억"},

  {"id":"KE3","이름":"삼각비의 관계식","구분":"원리","인지수준":"적용"},

  {"id":"KE4","이름":"범위 고려","구분":"절차","인지수준":"분석"},

  {"id":"KE5","이름":"문제 해결 종합","구분":"통합","인지수준":"종합"}

]

🎯 AI의 임무

1. 학생 상태 진단 (폴리아 기반)

학생의 응답과 해설을 비교하여 다음을 판단합니다:

문제 이해도: (low/medium/high)

개념 지식: (low/medium/high)

오류 패턴: (none / calculation_error / logical_error / concept_confusion / approach_error)

자신감 수준: (low/medium/high)

2. 지식요소별 진단 및 근거 제시

문제를 해결하는 데 필요한 각 지식 요소(KE) 별로 다음을 산출하세요:

mastery: 숙련 수준 (low/medium/high)

evidence: 학생의 발화 또는 식에서 판단한 구체 근거 문장

cognitive_level: 해당 요소의 인지 수준(기억/이해/적용/분석/종합)

next_action: 해당 요소 보강을 위한 구체 행동 제안 (예: "특수각 표 외우기", "범위 부등식 다시 써보기")

또한 전체 숙련도를 overall_mastery_score(0~100)로 요약하고, 판단이 불확실하면 uncertainty: high로 표시합니다.

3. 폴리아 단계 추천

학생 상태와 진단 결과를 바탕으로, 현재 적절한 폴리아 단계(1~4)를 제시합니다.

"recommended_stage": 1~4

"stage_reason": 왜 이 단계를 추천하는지 간결한 이유 설명

4. 후속 대화(힌트/질문) 제시

"next_question": 학생의 상태와 부족한 지식요소에 맞는 후속 질문 또는 힌트

힌트는 반드시 해설에 등장하는 개념을 기반으로 할 것

폴리아 4단계 중 "되돌아보기(4단계)"에서는 학생이 배운 핵심 개념과 오개념을 AI가 직접 요약 정리해준다.

5. 마이크로 평가(micro-assessment)

부족한 지식요소가 있을 경우, 해당 요소를 즉석에서 점검할 1문항 퀴즈를 제안한다.

예: "sin30°, cos45°, tan60°의 값을 써보자."

6. 피드백 완료 여부

"feedback_completed": true/false

학생이 이해했거나 학습 목표를 달성했을 경우 true로 설정.

🧾 출력 형식 예시

{

  "diagnosis": {

    "problem_understanding": "high",

    "concept_knowledge": "medium",

    "error_pattern": "concept_confusion",

    "confidence_level": "medium"

  },

  "knowledge_diagnosis": {

    "elements": [

      {

        "ke_id": "KE2",

        "mastery": "medium",

        "evidence": "학생이 cos60°=1/2는 알았으나 sin45°를 혼동함",

        "cognitive_level": "기억",

        "next_action": "특수각의 삼각비 표를 다시 써보며 암기 점검하기"

      },

      {

        "ke_id": "KE4",

        "mastery": "low",

        "evidence": "15°<x<60°에서 2x-30°의 범위 설정을 놓침",

        "cognitive_level": "분석",

        "next_action": "부등식 변형 규칙 복습하기"

      }

    ],

    "overall_mastery_score": 68,

    "uncertainty": "medium"

  },

  "recommended_stage": "3",

  "stage_reason": "핵심 개념은 이해했지만 일부 특수각 및 범위 분석에서 약간의 혼동이 있음.",

  "next_question": "15°<x<60°이면 2x−30°의 범위는 어떻게 될까?",

  "micro_assessments": [

    {"ke_id":"KE2","prompt":"sin30°, cos45°, tan60°의 값을 각각 써보자."}

  ],

  "feedback_completed": "false"

}

💡 추가 규칙

모든 근거(evidence)는 학생의 실제 발화나 풀이에서 인용된 짧은 문장으로 제시한다.

**불확실(uncertainty=high)**일 경우, 먼저 micro-assessment를 던지고 이후 재진단한다.

다음 힌트는 반드시 해설의 수식·개념·관계식을 기반으로 한다.

"되돌아보기(4단계)"에서는 통합(종합) 요소에 대해

핵심 개념 요약

실수 포인트 정리

다음 학습 추천 1가지

를 제시한다.

🌱 이 시스템의 목표

학생의 발화 기반 지식요소 단위 진단 + 폴리아 단계별 피드백을 통합

결과적으로 교사에게는 근거가 보이는 진단 리포트,

학생에게는 맞춤형 대화형 학습 경험을 제공한다.`;

// 기본 입력 스키마
export const DEFAULT_INPUT_SCHEMA = {
  type: "object",
  properties: {
    problem: {
      type: "string",
      description: "문제 텍스트(이미지 문제면 간단 설명)"
    },
    explanation: {
      type: "string",
      description: "문제의 공식 해설 텍스트"
    },
    userMessage: {
      type: "string",
      description: "학생의 최신 입력(답변/질문/풀이 등)"
    },
    context: {
      type: "string",
      description: "이전 대화 요약, 학습 스타일/오류 패턴 등",
      default: ""
    },
    knowledgeElements: {
      type: "array",
      description: "문제와 관련된 지식요소 목록",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "지식요소 ID"
          },
          name: {
            type: "string",
            description: "지식요소 이름"
          },
          category: {
            type: "string",
            enum: ["concept", "principle", "procedure", "integration"],
            description: "지식요소 구분 (개념/원리/절차/통합)"
          },
          cognitiveLevel: {
            type: "string",
            enum: ["remember", "understand", "apply", "analyze", "synthesize", "evaluate"],
            description: "인지 수준 (기억/이해/적용/분석/종합/평가)"
          }
        },
        required: ["id", "name", "category", "cognitiveLevel"]
      }
    }
  },
  required: ["userMessage"],
  additionalProperties: false
} as const;

// 기본 출력 스키마
export const DEFAULT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    diagnosis: {
      type: "OBJECT",
      properties: {
        problem_understanding: { type: "STRING", enum: ["low","medium","high"] },
        concept_knowledge: { type: "STRING", enum: ["low","medium","high"] },
        error_pattern: { type: "STRING", enum: ["none","calculation_error","logical_error","concept_confusion","approach_error"] },
        confidence_level: { type: "STRING", enum: ["low","medium","high"] }
      },
      required: ["problem_understanding","concept_knowledge","error_pattern","confidence_level"]
    },
    knowledge_diagnosis: {
      type: "OBJECT",
      properties: {
        elements: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              ke_id: { type: "STRING" },
              mastery: { type: "STRING", enum: ["low", "medium", "high"] },
              evidence: { type: "STRING" },
              cognitive_level: { type: "STRING" },
              next_action: { type: "STRING" }
            },
            required: ["ke_id", "mastery", "evidence", "cognitive_level", "next_action"]
          }
        },
        overall_mastery_score: { type: "NUMBER" },
        uncertainty: { type: "STRING", enum: ["low", "medium", "high"] }
      },
      required: ["elements", "overall_mastery_score", "uncertainty"]
    },
    recommended_stage: { type: "STRING", enum: ["1","2","3","4"] },
    stage_reason: { type: "STRING" },
    next_question: { type: "STRING" },
    micro_assessments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ke_id: { type: "STRING" },
          prompt: { type: "STRING" }
        },
        required: ["ke_id", "prompt"]
      }
    },
    feedback_completed: { type: "STRING", enum: ["true","false"] }
  },
  required: ["diagnosis","knowledge_diagnosis","recommended_stage","stage_reason","next_question","feedback_completed"]
} as const;

// LLM 설정 인터페이스
export interface LLMConfig {
  id: string;
  // 기본 정보
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  
  // 스키마 정보
  inputSchema?: typeof DEFAULT_INPUT_SCHEMA;
  outputSchema?: typeof DEFAULT_RESPONSE_SCHEMA;
  responseMimeType?: string;
  
  // 프롬프트 정보
  systemPrompt: string;
  userPrompt?: string;
  
  // 모델 설정 및 추가 파라미터
  provider: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
}

const AIManagement = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfig | null>(null);
  
  // 기본 정보
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  
  // 스키마 정보
  const [inputSchema, setInputSchema] = useState<string>(JSON.stringify(DEFAULT_INPUT_SCHEMA, null, 2));
  const [outputSchema, setOutputSchema] = useState<string>(JSON.stringify(DEFAULT_RESPONSE_SCHEMA, null, 2));
  const [responseMimeType, setResponseMimeType] = useState<string>('application/json');
  const [showInputSchema, setShowInputSchema] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);
  
  // ✅ 입력 필드 선택 상태
  const [selectedInputFields, setSelectedInputFields] = useState<Set<string>>(
    new Set(['problem', 'problemImage', 'explanationText', 'explanationImage', 'userMessage', 'context', 'knowledgeElements'])
  );
  
  // 프롬프트 정보
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  
  // 모델 설정
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-2.5-pro');
  const [temperature, setTemperature] = useState(0);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [thinkingBudget, setThinkingBudget] = useState(1800);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  // 설정 로드
  useEffect(() => {
    const storedConfigs = localStorage.getItem('math_tutor_llm_configs');
    const activeConfigId = localStorage.getItem('math_tutor_active_llm_config_id');

    let parsedConfigs: LLMConfig[] = [];

    if (storedConfigs) {
      try {
        parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
      } catch (e) {
        console.error('Failed to load configs:', e);
      }
    }

    // ✅ 기본 설정이 없으면 자동 추가
    if (parsedConfigs.length === 0) {
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

   - 해설 풀이 기반의 단계적인 후속 질문 또는 힌트 (예: "근이 뭔지 설명해볼래?", "계산을 다시 확인해볼까?")

   - 4단계(되돌아보기)는 AI가 직접 해당 문제의 포인트와 풀이과정에서 학생이 알아야할 핵심 포인트를 정리해주는 것으로 대체

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

      const defaultInputSchema = {
        type: "object" as const,
        properties: {
          problemImage: {
            type: "string" as const,
            description: "문제 이미지 URL (Base64)"
          },
          explanationImage: {
            type: "string" as const,
            description: "해설 이미지 URL (Base64)"
          },
          userMessage: {
            type: "string" as const,
            description: "학생의 최신 입력(답변/질문/풀이 등)"
          },
          context: {
            type: "string" as const,
            description: "이전 대화 요약, 학습 스타일/오류 패턴 등",
            default: ""
          },
          problem: {
            type: "string" as const,
            description: "문제 텍스트(이미지 문제면 간단 설명)"
          },
          explanation: {
            type: "string" as const,
            description: "문제의 공식 해설 텍스트"
          }
        },
        required: ["userMessage"] as const,
        additionalProperties: false as const
      };

      const defaultOutputSchema = {
        type: "OBJECT" as const,
        properties: {
          diagnosis: {
            type: "OBJECT" as const,
            properties: {
              problem_understanding: { type: "STRING" as const, enum: ["low", "medium", "high"] as const },
              concept_knowledge: { type: "STRING" as const, enum: ["low", "medium", "high"] as const },
              error_pattern: { type: "STRING" as const, enum: ["none", "calculation_error", "logical_error", "concept_confusion", "approach_error"] as const },
              confidence_level: { type: "STRING" as const, enum: ["low", "medium", "high"] as const }
            },
            required: ["problem_understanding", "concept_knowledge", "error_pattern", "confidence_level"] as const
          },
          recommended_stage: { type: "STRING" as const, enum: ["1", "2", "3", "4"] as const },
          stage_reason: { type: "STRING" as const },
          next_question: { type: "STRING" as const },
          feedback_completed: { type: "STRING" as const, enum: ["true", "false"] as const }
        },
        required: ["diagnosis", "recommended_stage", "stage_reason", "next_question", "feedback_completed"] as const
      };

      const defaultConfig: LLMConfig = {
        id: uid(),
        name: '기본 LLM 설정',
        description: '폴리아 4단계 기반 기본 진단 설정',
        version: 'v1.0.0',
        systemPrompt: defaultSystemPrompt,
        userPrompt: '',
        inputSchema: defaultInputSchema as unknown as typeof DEFAULT_INPUT_SCHEMA,
        outputSchema: defaultOutputSchema as unknown as typeof DEFAULT_RESPONSE_SCHEMA,
        responseMimeType: 'application/json',
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        temperature: 0,
        maxOutputTokens: 8192,
        thinkingBudget: 1800,
        createdAt: nowTime(),
        updatedAt: nowTime(),
        isActive: true
      };

      parsedConfigs = [defaultConfig];
      localStorage.setItem('math_tutor_llm_configs', JSON.stringify(parsedConfigs));
      localStorage.setItem('math_tutor_active_llm_config_id', defaultConfig.id);
    }
    
    setConfigs(parsedConfigs);

    // 활성 설정 로드
    if (parsedConfigs.length > 0) {
      if (activeConfigId) {
        const activeConfig = parsedConfigs.find(c => c.id === activeConfigId);
        if (activeConfig) {
          loadConfig(activeConfig);
          return;
        }
      }

      const activeConfig = parsedConfigs.find(c => c.isActive) || parsedConfigs[0];
      if (activeConfig) {
        loadConfig(activeConfig);
        localStorage.setItem('math_tutor_active_llm_config_id', activeConfig.id);
      }
    }
  }, []);

  useEffect(() => {
    if (configs.length > 0) {
      localStorage.setItem('math_tutor_llm_configs', JSON.stringify(configs));
    }
  }, [configs]);

  // ✅ 선택된 필드에 따라 inputSchema 생성
  const updateInputSchemaFromFields = (fields: Set<string>) => {
    const properties: Record<string, {
      type: string;
      description: string;
      default?: string;
      enum?: string[];
      items?: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
    }> = {};
    
    if (fields.has('problem')) {
      properties.problem = {
        type: "string",
        description: "문제 텍스트(이미지 문제면 간단 설명)"
      };
    }
    if (fields.has('problemImage')) {
      properties.problemImage = {
        type: "string",
        description: "문제 이미지 URL (Base64)"
      };
    }
    if (fields.has('explanationText')) {
      properties.explanation = {
        type: "string",
        description: "문제의 공식 해설 텍스트"
      };
    }
    if (fields.has('explanationImage')) {
      properties.explanationImage = {
        type: "string",
        description: "해설 이미지 URL (Base64)"
      };
    }
    if (fields.has('userMessage')) {
      properties.userMessage = {
        type: "string",
        description: "학생의 최신 입력(답변/질문/풀이 등)"
      };
    }
    if (fields.has('context')) {
      properties.context = {
        type: "string",
        description: "이전 대화 요약, 학습 스타일/오류 패턴 등",
        default: ""
      };
    }
    if (fields.has('knowledgeElements')) {
      properties.knowledgeElements = {
        type: "array",
        description: "문제와 관련된 지식요소 목록",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "지식요소 ID"
            },
            name: {
              type: "string",
              description: "지식요소 이름"
            },
            category: {
              type: "string",
              enum: ["concept", "principle", "procedure", "integration"],
              description: "지식요소 구분 (개념/원리/절차/통합)"
            },
            cognitiveLevel: {
              type: "string",
              enum: ["remember", "understand", "apply", "analyze", "synthesize", "evaluate"],
              description: "인지 수준 (기억/이해/적용/분석/종합/평가)"
            }
          },
          required: ["id", "name", "category", "cognitiveLevel"]
        }
      };
    }
    
    const newSchema = {
      type: "object",
      properties,
      required: fields.has('userMessage') ? ["userMessage"] : [],
      additionalProperties: false
    };
    
    setInputSchema(JSON.stringify(newSchema, null, 2));
  };

  const loadConfig = (config: LLMConfig) => {
    setSelectedConfig(config);
    setName(config.name);
    setDescription(config.description || '');
    setVersion(config.version);
    setSystemPrompt(config.systemPrompt);
    setUserPrompt(config.userPrompt || '');
    setInputSchema(JSON.stringify(config.inputSchema || DEFAULT_INPUT_SCHEMA, null, 2));
    setOutputSchema(JSON.stringify(config.outputSchema || DEFAULT_RESPONSE_SCHEMA, null, 2));
    setResponseMimeType(config.responseMimeType || 'application/json');
    setProvider(config.provider);
    setModel(config.model);
    setTemperature(config.temperature);
    setMaxOutputTokens(config.maxOutputTokens);
    setThinkingBudget(config.thinkingBudget);
    
    // ✅ 입력 필드 선택 상태 로드
    if (config.inputSchema?.properties) {
      const fields = new Set<string>();
      const props = config.inputSchema.properties as Record<string, unknown>;
      if (props.problem) fields.add('problem');
      if (props.problemImage) fields.add('problemImage');
      if (props.explanation) fields.add('explanationText');
      if (props.explanationImage) fields.add('explanationImage');
      if (props.userMessage) fields.add('userMessage');
      if (props.context) fields.add('context');
      if (props.knowledgeElements) fields.add('knowledgeElements');
      setSelectedInputFields(fields);
    } else {
      // 기본값: 모든 필드 선택
      setSelectedInputFields(new Set(['problem', 'problemImage', 'explanationText', 'explanationImage', 'userMessage', 'context', 'knowledgeElements']));
    }
  };

  const startAdding = () => {
    setIsAdding(true);
    setIsEditing(true);
    setSelectedConfig(null);
    setName('');
    setDescription('');
    setVersion('v1.0.0');
    setSystemPrompt(''); // ✅ 새 설정은 빈 값으로 시작 (사용자가 직접 입력)
    setUserPrompt('');
    setInputSchema(JSON.stringify(DEFAULT_INPUT_SCHEMA, null, 2));
    setOutputSchema(JSON.stringify(DEFAULT_RESPONSE_SCHEMA, null, 2));
    setResponseMimeType('application/json');
    setProvider('gemini');
    setModel('gemini-2.5-pro');
    setTemperature(0);
    setMaxOutputTokens(8192);
    setThinkingBudget(1800);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setIsEditing(false);
    if (selectedConfig) {
      loadConfig(selectedConfig);
    }
  };

  const saveConfig = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setSaveStatus('saving');
    try {
      const now = nowTime();
      
      // 스키마 파싱 검증
      let parsedInputSchema, parsedOutputSchema;
      try {
        parsedInputSchema = JSON.parse(inputSchema.trim());
        parsedOutputSchema = JSON.parse(outputSchema.trim());
      } catch (e) {
        alert('스키마 JSON 형식이 올바르지 않습니다. JSON 형식을 확인해주세요.');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }
      
      if (isAdding || !selectedConfig) {
        const newConfig: LLMConfig = {
          id: uid(),
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim(),
          systemPrompt: systemPrompt.trim(),
          userPrompt: userPrompt.trim() || undefined,
          inputSchema: parsedInputSchema,
          outputSchema: parsedOutputSchema,
          responseMimeType: responseMimeType,
          provider: provider,
          model: model,
          temperature: temperature,
          maxOutputTokens: maxOutputTokens,
          thinkingBudget: thinkingBudget,
          createdAt: now,
          updatedAt: now,
          isActive: false
        };

        const updatedConfigs = [...configs, newConfig];
        setConfigs(updatedConfigs);
        setSelectedConfig(newConfig);
        setIsAdding(false);
        setIsEditing(false);
        
        // ✅ localStorage에 저장
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(updatedConfigs));
        console.log('💾 [Admin] New config saved to localStorage:', newConfig.name);
        
        // ✅ 이벤트 발행
        window.dispatchEvent(new Event('llmConfigUpdated'));
      } else {
        const updatedConfig: LLMConfig = {
          ...selectedConfig,
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim(),
          systemPrompt: systemPrompt.trim(),
          userPrompt: userPrompt.trim() || undefined,
          inputSchema: parsedInputSchema,
          outputSchema: parsedOutputSchema,
          responseMimeType: responseMimeType,
          provider: provider,
          model: model,
          temperature: temperature,
          maxOutputTokens: maxOutputTokens,
          thinkingBudget: thinkingBudget,
          updatedAt: now
        };

        const updatedConfigs = configs.map(c => c.id === selectedConfig.id ? updatedConfig : c);
        setConfigs(updatedConfigs);
        setSelectedConfig(updatedConfig);
        setIsEditing(false);
        
        // ✅ localStorage에 저장
        localStorage.setItem('math_tutor_llm_configs', JSON.stringify(updatedConfigs));
        console.log('💾 [Admin] Config updated in localStorage:', updatedConfig.name);
        
        // ✅ 이벤트 발행
        window.dispatchEvent(new Event('llmConfigUpdated'));
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const deleteConfig = (configId: string) => {
    if (configs.length <= 1) {
      alert('최소 하나의 설정은 필요합니다.');
      return;
    }

    if (confirm('이 설정을 삭제하시겠습니까?')) {
      const updatedConfigs = configs.filter(c => c.id !== configId);
      setConfigs(updatedConfigs);
      
      // ✅ localStorage에 저장
      localStorage.setItem('math_tutor_llm_configs', JSON.stringify(updatedConfigs));
      console.log('💾 [Admin] Config deleted:', configId);

      const deletedConfig = configs.find(c => c.id === configId);
      // ✅ 여러 설정 활성화 가능하므로 삭제된 설정이 활성화되어 있어도 다른 활성 설정 유지
      if (selectedConfig?.id === configId) {
        setSelectedConfig(updatedConfigs[0] || null);
        if (updatedConfigs[0]) {
          loadConfig(updatedConfigs[0]);
        }
      }
      
      // ✅ 이벤트 발행
      window.dispatchEvent(new Event('llmConfigUpdated'));
    }
  };

  // ✅ 여러 설정을 활성화/비활성화할 수 있도록 변경
  const toggleActiveConfig = (configId: string) => {
    const updatedConfigs = configs.map(c => 
      c.id === configId 
        ? { ...c, isActive: !c.isActive }  // 토글
        : c  // 다른 설정은 그대로 유지
    );

    setConfigs(updatedConfigs);
    
    // ✅ localStorage에 저장
    localStorage.setItem('math_tutor_llm_configs', JSON.stringify(updatedConfigs));
    
    const toggledConfig = updatedConfigs.find(c => c.id === configId);
    console.log(`💾 [Admin] Config ${toggledConfig?.isActive ? 'activated' : 'deactivated'}:`, configId);

    // ✅ 이벤트 발행
    window.dispatchEvent(new Event('llmConfigUpdated'));
  };

  const selectConfig = (config: LLMConfig) => {
    loadConfig(config);
    setIsAdding(false);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (selectedConfig) {
      setIsEditing(true);
      setIsAdding(false);
    }
  };


  const copySchema = (schema: string, type: 'input' | 'output') => {
    navigator.clipboard.writeText(schema);
    alert(`${type === 'input' ? '입력' : '출력'} 스키마가 복사되었습니다.`);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 연동</h1>
          <p className="text-gray-600 mt-1">LLM 설정을 관리하고 활성화하세요</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={startAdding}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 설정 추가
          </button>
          {!isAdding && selectedConfig && !isEditing && (
          <button
              onClick={startEditing}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
              <Edit3 className="w-4 h-4 mr-2" />
              편집
          </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 설정 목록 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">설정 목록</h3>
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {configs.length === 0 ? (
                <p className="text-sm text-gray-500">설정이 없습니다.</p>
              ) : (
                configs.map((config) => (
                  <div
                    key={config.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConfig?.id === config.id
                        ? 'border-blue-500 bg-blue-50'
                        : config.isActive
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => selectConfig(config)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {config.name}
                          {config.isActive && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                              활성
                            </span>
                          )}
                        </p>
                        {config.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{config.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{config.version}</p>
          </div>
        </div>
                    <div className="flex items-center gap-2 mt-2">
                      {/* ✅ 활성화/비활성화 토글 체크박스 */}
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.isActive}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleActiveConfig(config.id);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className={`text-xs font-medium ${
                          config.isActive ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {config.isActive ? '활성화됨' : '비활성화'}
                        </span>
                      </label>
                      {configs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConfig(config.id);
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 메인 편집 영역 */}
        <div className="lg:col-span-3 space-y-4">
          {selectedConfig || isAdding ? (
            <>
              {/* LLM 기본정보 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
                    <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full font-medium">
                      LLM
                    </span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded mr-2"></span>
                      이름
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isAdding && !isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                        !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded mr-2"></span>
                      설명
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!isAdding && !isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                        !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded mr-2"></span>
                      버전
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      disabled={!isAdding && !isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                        !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
                      상태
                    </label>
                    <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium inline-block">
                      {selectedConfig?.isActive ? '활성' : '비활성'}
                    </div>
                  </div>
                </div>
                {selectedConfig && (
                  <div className="px-6 pb-4 border-t border-gray-200 pt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">생성일:</span>
                      <span className="ml-2 font-medium">{selectedConfig.createdAt}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">수정일:</span>
                      <span className="ml-2 font-medium">{selectedConfig.updatedAt}</span>
                    </div>
                  </div>
                  )}
                </div>

              {/* 스키마 정보 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">스키마 정보</h2>
                </div>
                <div className="p-4 space-y-4">
                  {/* 입력 스키마 */}
                  <div className="border border-gray-200 rounded-lg">
                    <div
                      className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                      onClick={() => setShowInputSchema(!showInputSchema)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 rounded flex items-center justify-center">
                          {showInputSchema ? (
                            <ChevronUp className="w-4 h-4 text-blue-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">JSON</p>
                          <p className="text-sm font-medium text-gray-900">입력 스키마</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                  <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copySchema(inputSchema, 'input');
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                        <button className="p-1 text-gray-500 hover:text-gray-700">
                          <Maximize2 className="w-4 h-4" />
                  </button>
                      </div>
                    </div>
                    {showInputSchema && (
                      <div className="p-4 border-t border-gray-200 space-y-4">
                        {/* ✅ 입력 필드 선택 UI */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            포함할 입력 필드 선택
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'problem', label: '문제 (problem)', description: '문제 텍스트' },
                              { key: 'problemImage', label: '문제 이미지 (problemImage)', description: '문제 이미지 URL' },
                              { key: 'explanationText', label: '해설 텍스트 (explanation)', description: '해설 텍스트' },
                              { key: 'explanationImage', label: '해설 이미지 (explanationImage)', description: '해설 이미지 URL' },
                              { key: 'userMessage', label: '학생 메시지 (userMessage)', description: '학생 입력 (필수)' },
                              { key: 'context', label: '컨텍스트 (context)', description: '이전 대화 요약' },
                              { key: 'knowledgeElements', label: '지식요소 (knowledgeElements)', description: '지식요소 목록' },
                            ].map((field) => (
                              <label
                                key={field.key}
                                className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedInputFields.has(field.key)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                } ${!isAdding && !isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                    <input
                                  type="checkbox"
                                  checked={selectedInputFields.has(field.key)}
                                  onChange={(e) => {
                                    if (isAdding || isEditing) {
                                      const newSet = new Set(selectedInputFields);
                                      if (e.target.checked) {
                                        newSet.add(field.key);
                                      } else {
                                        // userMessage는 필수이므로 제거 불가
                                        if (field.key === 'userMessage') {
                                          alert('학생 메시지(userMessage)는 필수 필드입니다.');
                                          return;
                                        }
                                        newSet.delete(field.key);
                                      }
                                      setSelectedInputFields(newSet);
                                      // ✅ inputSchema 자동 업데이트
                                      updateInputSchemaFromFields(newSet);
                                    }
                                  }}
                                  disabled={!isAdding && !isEditing || field.key === 'userMessage'}
                                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{field.label}</div>
                                  <div className="text-xs text-gray-500">{field.description}</div>
                                </div>
                  </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* JSON 스키마 표시 (읽기 전용) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            생성된 입력 스키마 (JSON)
                          </label>
                          <textarea
                            value={inputSchema}
                            onChange={(e) => {
                              if (isAdding || isEditing) {
                                setInputSchema(e.target.value);
                                // JSON 파싱하여 선택된 필드 업데이트
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  const fields = new Set<string>();
                                  if (parsed.properties?.problem) fields.add('problem');
                                  if (parsed.properties?.problemImage) fields.add('problemImage');
                                  if (parsed.properties?.explanation) fields.add('explanationText');
                                  if (parsed.properties?.explanationImage) fields.add('explanationImage');
                                  if (parsed.properties?.userMessage) fields.add('userMessage');
                                  if (parsed.properties?.context) fields.add('context');
                                  if (parsed.properties?.knowledgeElements) fields.add('knowledgeElements');
                                  setSelectedInputFields(fields);
                                } catch {}
                              }
                            }}
                            disabled={!isAdding && !isEditing}
                            className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-xs resize-none ${
                              !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 출력 스키마 */}
                  <div className="border border-gray-200 rounded-lg">
                    <div
                      className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                      onClick={() => setShowOutputSchema(!showOutputSchema)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 rounded flex items-center justify-center">
                          {showOutputSchema ? (
                            <ChevronUp className="w-4 h-4 text-blue-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">JSON</p>
                          <p className="text-sm font-medium text-gray-900">출력 스키마</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                  <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copySchema(outputSchema, 'output');
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-500 hover:text-gray-700">
                          <Maximize2 className="w-4 h-4" />
                  </button>
                      </div>
                    </div>
                    {showOutputSchema && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Response MIME Type
                          </label>
                          <select
                            value={responseMimeType}
                            onChange={(e) => setResponseMimeType(e.target.value)}
                            disabled={!isAdding && !isEditing}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                              !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                            }`}
                          >
                            <option value="application/json">application/json</option>
                            <option value="text/plain">text/plain</option>
                          </select>
                        </div>
                        <textarea
                          value={outputSchema}
                          onChange={(e) => setOutputSchema(e.target.value)}
                          disabled={!isAdding && !isEditing || responseMimeType !== 'application/json'}
                          className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-xs resize-none ${
                            !isAdding && !isEditing || responseMimeType !== 'application/json' ? 'bg-gray-50 text-gray-600' : 'bg-white'
                          }`}
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>

              {/* 프롬프트 정보 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">프롬프트 정보</h2>
                </div>
                <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시스템 프롬프트
                  </label>
                  <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      disabled={!isAdding && !isEditing}
                      className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none ${
                        !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      유저 프롬프트 (선택사항)
                    </label>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      disabled={!isAdding && !isEditing}
                      className={`w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none ${
                        !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                      placeholder="유저 프롬프트를 입력하세요..."
                    />
                  </div>
                </div>
              </div>

              {/* 모델 설정 및 추가 파라미터 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">모델 설정</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Edit3 className="w-4 h-4 inline mr-2 text-gray-500" />
                        Provider
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                          disabled={!isAdding && !isEditing}
                          className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                            !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                          }`}
                        />
                        {selectedConfig?.isActive && (
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">활성</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Edit3 className="w-4 h-4 inline mr-2 text-gray-500" />
                        Model
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          disabled={!isAdding && !isEditing}
                          className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                            !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                          }`}
                        />
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Gemini</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Edit3 className="w-4 h-4 inline mr-2 text-gray-500" />
                        Temperature
                      </label>
                      <input
                        type="number"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        disabled={!isAdding && !isEditing}
                        min="0"
                        max="2"
                        step="0.1"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                          !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Edit3 className="w-4 h-4 inline mr-2 text-gray-500" />
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={maxOutputTokens}
                        onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                        disabled={!isAdding && !isEditing}
                        min="1"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                          !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Edit3 className="w-4 h-4 inline mr-2 text-gray-500" />
                        Thinking Budget
                      </label>
                      <input
                        type="number"
                        value={thinkingBudget}
                        onChange={(e) => setThinkingBudget(Number(e.target.value))}
                        disabled={!isAdding && !isEditing}
                        min="1"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
                          !isAdding && !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>
            </div>

            {/* 저장 버튼 */}
              {(isAdding || isEditing) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex justify-end items-center space-x-3">
                <button
                    onClick={cancelEditing}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                    onClick={saveConfig}
                    disabled={saveStatus === 'saving' || !name.trim()}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                      saveStatus === 'saving' || !name.trim()
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : saveStatus === 'saved'
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveStatus === 'saving' ? '저장 중...' :
                   saveStatus === 'saved' ? '저장됨' : '저장'}
                </button>
              </div>
            )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">설정을 선택하거나 새 설정을 추가하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIManagement;
