'use client';
import { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Copy,
  Download,
  Upload,
  History,
  Eye,
  Edit3,
  FileText
} from 'lucide-react';

const SYSTEM_PROMPT_BASE = `당신은 폴리아의 4단계 문제해결 접근법(1. 문제 이해하기, 2. 계획 세우기, 3. 계획 실행하기, 4. 되돌아보기)을 기반으로 학생의 수학 학습 상태를 진단하는 교육용 AI입니다.
주어진 학생의 응답과 문제 데이터를 분석하여 다음을 수행하세요:

### **입력 데이터**
- **문제**: {문제 텍스트, 예: "이차방정식 x^2 - 5x + 6 = 0의 근을 구하세요."}
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

interface PromptVersion {
  id: string;
  content: string;
  description: string;
  createdAt: string;
  isActive: boolean;
}

const PromptManagement = () => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versionDescription, setVersionDescription] = useState('');
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

  // 프롬프트 로드
  useEffect(() => {
    const storedPrompt = localStorage.getItem('math_tutor_custom_prompt');
    const storedVersions = localStorage.getItem('math_tutor_prompt_versions');

    const prompt = storedPrompt || SYSTEM_PROMPT_BASE;
    setCurrentPrompt(prompt);
    setOriginalPrompt(prompt);

    if (storedVersions) {
      try {
        setPromptVersions(JSON.parse(storedVersions));
      } catch (e) {
        console.error('Failed to load prompt versions:', e);
      }
    }
  }, []);

  // 프롬프트 저장
  const savePrompt = async () => {
    setSaveStatus('saving');
    try {
      // 현재 프롬프트 저장
      localStorage.setItem('math_tutor_custom_prompt', currentPrompt);

      // 새 버전 생성 (내용이 변경된 경우에만)
      if (currentPrompt !== originalPrompt) {
        const newVersion: PromptVersion = {
          id: uid(),
          content: currentPrompt,
          description: versionDescription || '자동 저장',
          createdAt: nowTime(),
          isActive: true
        };

        // 기존 버전들을 비활성화하고 새 버전 추가
        const updatedVersions = promptVersions.map(v => ({ ...v, isActive: false }));
        updatedVersions.unshift(newVersion);

        // 최대 20개 버전까지 유지
        const trimmedVersions = updatedVersions.slice(0, 20);

        setPromptVersions(trimmedVersions);
        localStorage.setItem('math_tutor_prompt_versions', JSON.stringify(trimmedVersions));
        setOriginalPrompt(currentPrompt);
      }

      setVersionDescription('');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 프롬프트 리셋
  const resetPrompt = () => {
    if (confirm('기본 프롬프트로 되돌리시겠습니까? 현재 내용은 저장되지 않습니다.')) {
      setCurrentPrompt(SYSTEM_PROMPT_BASE);
    }
  };

  // 버전 복원
  const restoreVersion = (version: PromptVersion) => {
    if (confirm('이 버전으로 복원하시겠습니까? 현재 내용은 저장되지 않습니다.')) {
      setCurrentPrompt(version.content);
      setIsEditing(false);
    }
  };

  // 클립보드 복사
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt);
      alert('프롬프트가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 프롬프트 내보내기
  const exportPrompt = () => {
    const blob = new Blob([currentPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 프롬프트 가져오기
  const importPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setCurrentPrompt(content);
        }
      };
      reader.readAsText(file);
    }
    // 입력 초기화
    event.target.value = '';
  };

  const hasChanges = currentPrompt !== originalPrompt;

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프롬프트 관리</h1>
          <p className="text-gray-600 mt-1">AI 시스템 프롬프트를 편집하고 관리합니다</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <History className="w-4 h-4 mr-2" />
            버전 기록
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? '편집' : '미리보기'}
          </button>
        </div>
      </div>

      {/* 상태 표시 */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm">
              프롬프트에 저장되지 않은 변경사항이 있습니다.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 메인 편집 영역 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* 툴바 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                      isEditing
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? '편집 중' : '편집 모드'}
                  </button>

                  {hasChanges && (
                    <input
                      type="text"
                      value={versionDescription}
                      onChange={(e) => setVersionDescription(e.target.value)}
                      placeholder="변경 사항 설명 (선택사항)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={exportPrompt}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="내보내기"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <label className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer" title="가져오기">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".txt"
                      onChange={importPrompt}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={resetPrompt}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="기본값으로 리셋"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 프롬프트 편집/미리보기 영역 */}
            <div className="p-6">
              {showPreview ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded-lg border">
                    {currentPrompt}
                  </pre>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시스템 프롬프트
                  </label>
                  <textarea
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                    }`}
                    placeholder="프롬프트를 입력하세요..."
                  />
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            {isEditing && (
              <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setCurrentPrompt(originalPrompt);
                    setIsEditing(false);
                    setVersionDescription('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={savePrompt}
                  disabled={saveStatus === 'saving'}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                    saveStatus === 'saving'
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
          </div>
        </div>

        {/* 사이드바 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 통계 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">프롬프트 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">글자 수:</span>
                <span className="font-medium">{currentPrompt.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">단어 수:</span>
                <span className="font-medium">{currentPrompt.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">줄 수:</span>
                <span className="font-medium">{currentPrompt.split('\n').length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">버전:</span>
                <span className="font-medium">{promptVersions.length}</span>
              </div>
            </div>
          </div>

          {/* 빠른 템플릿 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">빠른 템플릿</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCurrentPrompt(SYSTEM_PROMPT_BASE)}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
              >
                기본 프롬프트
              </button>
              <button
                onClick={() => setCurrentPrompt(currentPrompt + '\n\n### 추가 지침\n- ')}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
              >
                추가 지침 섹션
              </button>
              <button
                onClick={() => setCurrentPrompt(currentPrompt + '\n\n### 예시\n**입력**: \n**출력**: \n')}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
              >
                예시 섹션
              </button>
            </div>
          </div>

          {/* 버전 기록 */}
          {showHistory && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">버전 기록</h3>
              </div>
              <div className="p-4">
                {promptVersions.length === 0 ? (
                  <p className="text-sm text-gray-500">저장된 버전이 없습니다.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {promptVersions.map((version) => (
                      <div
                        key={version.id}
                        className={`p-3 border rounded-lg ${
                          version.isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {version.description}
                              {version.isActive && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  현재
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{version.createdAt}</p>
                          </div>
                          <button
                            onClick={() => restoreVersion(version)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            복원
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {version.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptManagement;