'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  Eye,
  X,
  Image,
  ChevronDown
} from 'lucide-react';

interface KnowledgeElement {
  id: string;
  name: string; // 이름
  category: 'concept' | 'principle' | 'procedure' | 'integration';
  description: string;
  source: string; // 성취기준코드
  cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'synthesize' | 'evaluate';
  weight?: number; // 가중치 (0~1)
  prereqIds?: string[]; // 선행요소 ID 목록
  exampleQuestions?: string[]; // 예시문항/미니퀴즈
}

interface ProblemKEMap {
  problemId: string;
  keId: string;
  weight: number; // 가중치 (0~1)
  requiredLevel: number; // 숙련 필요 레벨 (1~4)
  evidenceRules: {
    correctAnswer?: string[]; // 정답 패턴 키워드
    intermediateSteps?: string[]; // 중간식 패턴 키워드
    errorPatterns?: string[]; // 오류패턴 키워드
  };
}

interface Problem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  explanationImageUrl?: string;
  explanationText?: string;
  grade?: string;
  unit?: string;
  notes?: string;
  knowledgeElements?: KnowledgeElement[];
  keMaps?: ProblemKEMap[]; // 문제-지식요소 매핑
  createdAt: string;
  updatedAt: string;
}

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

const ProblemsManagement = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [viewingProblem, setViewingProblem] = useState<Problem | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [explanationInputMode, setExplanationInputMode] = useState<'text' | 'image'>('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [explanationImageFile, setExplanationImageFile] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const explanationFileInputRef = useRef<HTMLInputElement>(null);
  
  // 학년/단원 목록 관리
  const [grades, setGrades] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [achievementStandards, setAchievementStandards] = useState<string[]>([]);

  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    title: '',
    content: '',
    grade: '',
    unit: '',
    explanationText: '',
    notes: ''
  });

  // 지식 요소 관리
  const [knowledgeElements, setKnowledgeElements] = useState<KnowledgeElement[]>([]);
  const [editingKnowledgeElement, setEditingKnowledgeElement] = useState<KnowledgeElement | null>(null);
  const [isAddingKnowledgeElement, setIsAddingKnowledgeElement] = useState(false);
  const [newKnowledgeElement, setNewKnowledgeElement] = useState<Partial<KnowledgeElement>>({
    category: 'concept',
    name: '',
    description: '',
    source: '',
    cognitiveLevel: 'remember',
    weight: 0.5,
    prereqIds: [],
    exampleQuestions: []
  });

  const nowTime = () =>
    new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date());

  const uid = () => Math.random().toString(36).slice(2);

  // 로컬스토리지에서 문제 및 학년/단원 목록 로드
  useEffect(() => {
    const storedProblems = localStorage.getItem('math_tutor_problems');
    if (storedProblems) {
      try {
        setProblems(JSON.parse(storedProblems));
      } catch (e) {
        console.error('Failed to load problems:', e);
      }
    }

    // 학년/단원 목록 로드
    const storedGrades = localStorage.getItem('math_tutor_grades');
    const storedUnits = localStorage.getItem('math_tutor_units');
    const storedAchievementStandards = localStorage.getItem('math_tutor_achievement_standards');
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
    if (storedAchievementStandards) {
      try {
        setAchievementStandards(JSON.parse(storedAchievementStandards));
      } catch (e) {
        console.error('Failed to load achievement standards:', e);
      }
    }
  }, []);

  // 문제 저장
  const saveProblems = (problemsToSave: Problem[]) => {
    localStorage.setItem('math_tutor_problems', JSON.stringify(problemsToSave));
    setProblems(problemsToSave);
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

  // 성취기준 추가
  const handleAddAchievementStandard = (value: string) => {
    const updatedStandards = [...achievementStandards, value].sort();
    setAchievementStandards(updatedStandards);
    localStorage.setItem('math_tutor_achievement_standards', JSON.stringify(updatedStandards));
  };

  // 필터링된 문제
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         problem.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = !selectedGrade || problem.grade === selectedGrade;
    const matchesUnit = !selectedUnit || problem.unit === selectedUnit;

    return matchesSearch && matchesGrade && matchesUnit;
  });

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'problem' | 'explanation') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'problem') {
          setImageFile(file);
          setImagePreview(result);
          setNewProblem(prev => ({
            ...prev,
            imageUrl: result,
            content: `[이미지 문제: ${file.name}]`
          }));
        } else {
          setExplanationImageFile(file);
          setExplanationImagePreview(result);
          setNewProblem(prev => ({
            ...prev,
            explanationImageUrl: result
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
      knowledgeElements: knowledgeElements.length > 0 ? knowledgeElements : undefined,
      createdAt: nowTime(),
      updatedAt: nowTime()
    };

    saveProblems([...problems, problem]);
    resetForm();
    setIsAddModalOpen(false);
  };

  // 문제 수정
  const updateProblem = () => {
    if (!editingProblem || !newProblem.title?.trim()) {
      alert('문제 제목을 입력해주세요.');
      return;
    }

    const updatedProblems = problems.map(p =>
      p.id === editingProblem.id
        ? {
            ...p,
            title: newProblem.title!.trim(),
            content: newProblem.content?.trim() || '',
            imageUrl: newProblem.imageUrl,
            explanationImageUrl: newProblem.explanationImageUrl,
            explanationText: newProblem.explanationText?.trim() || undefined,
            grade: newProblem.grade?.trim() || '',
            unit: newProblem.unit?.trim() || '',
            notes: newProblem.notes?.trim() || undefined,
            knowledgeElements: knowledgeElements.length > 0 ? knowledgeElements : undefined,
            updatedAt: nowTime()
          }
        : p
    );

    saveProblems(updatedProblems);
    resetForm();
    setEditingProblem(null);
  };

  // 문제 삭제
  const deleteProblem = (problemId: string) => {
    if (confirm('이 문제를 삭제하시겠습니까?')) {
      saveProblems(problems.filter(p => p.id !== problemId));
    }
  };

  // 폼 리셋
  const resetForm = () => {
    setNewProblem({
      title: '',
      content: '',
      grade: '',
      unit: '',
      explanationText: '',
      notes: ''
    });
    setKnowledgeElements([]);
    setEditingKnowledgeElement(null);
    setIsAddingKnowledgeElement(false);
    setNewKnowledgeElement({
      category: 'concept',
      name: '',
      description: '',
      source: '',
      cognitiveLevel: 'remember',
      weight: 0.5,
      prereqIds: [],
      exampleQuestions: []
    });
    setInputMode('text');
    setExplanationInputMode('text');
    setImageFile(null);
    setImagePreview(null);
    setExplanationImageFile(null);
    setExplanationImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (explanationFileInputRef.current) explanationFileInputRef.current.value = '';
  };

  // 편집 시작
  const startEdit = (problem: Problem) => {
    setEditingProblem(problem);
    setNewProblem({
      title: problem.title,
      content: problem.content,
      imageUrl: problem.imageUrl,
      explanationImageUrl: problem.explanationImageUrl,
      explanationText: problem.explanationText,
      grade: problem.grade,
      unit: problem.unit,
      notes: problem.notes || ''
    });
    setKnowledgeElements(problem.knowledgeElements || []);
    setIsAddingKnowledgeElement(false);
    if (problem.imageUrl) {
      setInputMode('image');
      setImagePreview(problem.imageUrl);
    } else {
      setInputMode('text');
    }
    if (problem.explanationImageUrl) {
      setExplanationInputMode('image');
      setExplanationImagePreview(problem.explanationImageUrl);
    } else {
      setExplanationInputMode('text');
    }
  };

  // 지식 요소 추가/수정
  const saveKnowledgeElement = () => {
    if (!newKnowledgeElement.name?.trim() || !newKnowledgeElement.description?.trim()) {
      alert('지식요소 이름과 내용 설명을 입력해주세요.');
      return;
    }

    if (editingKnowledgeElement) {
      // 수정
      setKnowledgeElements(knowledgeElements.map(ke =>
        ke.id === editingKnowledgeElement.id
          ? {
              ...newKnowledgeElement,
              id: editingKnowledgeElement.id,
              name: newKnowledgeElement.name!.trim(),
              description: newKnowledgeElement.description!.trim(),
              source: newKnowledgeElement.source?.trim() || '',
              category: newKnowledgeElement.category!,
              cognitiveLevel: newKnowledgeElement.cognitiveLevel!,
              weight: newKnowledgeElement.weight ?? 0.5,
              prereqIds: newKnowledgeElement.prereqIds ?? [],
              exampleQuestions: newKnowledgeElement.exampleQuestions ?? []
            } as KnowledgeElement
          : ke
      ));
      setEditingKnowledgeElement(null);
    } else {
      // 추가
      const newElement: KnowledgeElement = {
        id: uid(),
        category: newKnowledgeElement.category!,
        name: newKnowledgeElement.name!.trim(),
        description: newKnowledgeElement.description!.trim(),
        source: newKnowledgeElement.source?.trim() || '',
        cognitiveLevel: newKnowledgeElement.cognitiveLevel!,
        weight: newKnowledgeElement.weight ?? 0.5,
        prereqIds: newKnowledgeElement.prereqIds ?? [],
        exampleQuestions: newKnowledgeElement.exampleQuestions ?? []
      };
      setKnowledgeElements([...knowledgeElements, newElement]);
    }

    // 폼 초기화
    setNewKnowledgeElement({
      category: 'concept',
      name: '',
      description: '',
      source: '',
      cognitiveLevel: 'remember',
      weight: 0.5,
      prereqIds: [],
      exampleQuestions: []
    });
    setIsAddingKnowledgeElement(false);
  };

  // 지식 요소 편집 시작
  const startEditKnowledgeElement = (element: KnowledgeElement) => {
    setEditingKnowledgeElement(element);
    setIsAddingKnowledgeElement(false);
    setNewKnowledgeElement({
      category: element.category,
      name: element.name,
      description: element.description,
      source: element.source,
      cognitiveLevel: element.cognitiveLevel,
      weight: element.weight ?? 0.5,
      prereqIds: element.prereqIds ?? [],
      exampleQuestions: element.exampleQuestions ?? []
    });
  };

  // 지식 요소 삭제
  const deleteKnowledgeElement = (elementId: string) => {
    if (confirm('이 지식 요소를 삭제하시겠습니까?')) {
      setKnowledgeElements(knowledgeElements.filter(ke => ke.id !== elementId));
    }
  };

  // 지식 요소 편집 취소
  const cancelEditKnowledgeElement = () => {
    setEditingKnowledgeElement(null);
    setIsAddingKnowledgeElement(false);
    setNewKnowledgeElement({
      category: 'concept',
      name: '',
      description: '',
      source: '',
      cognitiveLevel: 'remember',
      weight: 0.5,
      prereqIds: [],
      exampleQuestions: []
    });
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문제 관리</h1>
          <p className="text-gray-600 mt-1">수학 문제를 관리하고 편집합니다</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 문제 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          {/* 검색 바 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문제 제목, 내용 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 학년/단원 필터 */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 학년 필터 */}
            <div className="flex-1">
              <SearchableSelect
                placeholder="모든 학년"
                options={grades}
                value={selectedGrade}
                onChange={(value) => {
                  setSelectedGrade(value);
                  setSelectedUnit(''); // 학년 변경 시 단원 초기화
                }}
                onAddNew={handleAddGrade}
                emptyText="학년 없음"
              />
            </div>

            {/* 태그명 필터 */}
            <div className="flex-1">
              <SearchableSelect
                placeholder="모든 태그명"
                options={units}
                value={selectedUnit}
                onChange={setSelectedUnit}
                onAddNew={handleAddUnit}
                emptyText="태그명 없음"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 문제 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              문제 목록 ({filteredProblems.length}개)
            </h2>
          </div>

          {filteredProblems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">등록된 문제가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem) => (
                <div key={problem.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{problem.title}</h3>
                        {problem.imageUrl && (
                          <Image className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {problem.content && !problem.content.startsWith('[이미지 문제:') 
                          ? problem.content 
                          : problem.imageUrl 
                            ? '이미지 문제' 
                            : '문제 내용 없음'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {problem.grade && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {problem.grade}
                          </span>
                        )}
                        {problem.unit && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                            {problem.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setViewingProblem(problem)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(problem)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProblem(problem.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 추가/편집 모달 */}
      {(isAddModalOpen || editingProblem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProblem ? '문제 편집' : '새 문제 추가'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProblem(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">문제 제목 *</label>
                <input
                  type="text"
                  value={newProblem.title}
                  onChange={(e) => setNewProblem(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 이차방정식 근의 공식"
                />
              </div>

              {/* 메타 정보 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelect
                  label="학년"
                  placeholder="선택하세요"
                  options={grades}
                  value={newProblem.grade || ''}
                  onChange={(value) => {
                    setNewProblem(prev => ({ ...prev, grade: value }));
                  }}
                  onAddNew={handleAddGrade}
                  emptyText="학년 없음"
                />
                <SearchableSelect
                  label="태그명"
                  placeholder="선택하세요"
                  options={units}
                  value={newProblem.unit || ''}
                  onChange={(value) => {
                    setNewProblem(prev => ({ ...prev, unit: value }));
                  }}
                  onAddNew={handleAddUnit}
                  emptyText="태그명 없음"
                />
              </div>

              {/* 문제 입력 방식 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">문제 입력 방식</label>
                <div className="flex gap-2 mb-3">
                  <button
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
                    value={newProblem.content}
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

              {/* 관련 지식 요소 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">관련 지식 요소</label>
                  {!isAddingKnowledgeElement && !editingKnowledgeElement && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingKnowledgeElement(true);
                        setEditingKnowledgeElement(null);
                        setNewKnowledgeElement({
                          category: 'concept',
                          name: '',
                          description: '',
                          source: '',
                          cognitiveLevel: 'remember',
                          weight: 0.5,
                          prereqIds: [],
                          exampleQuestions: []
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + 지식 요소 추가
                    </button>
                  )}
                </div>

                {/* 지식 요소 목록 */}
                {knowledgeElements.length > 0 && (
                  <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">구분</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">지식요소</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">내용 설명</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">출처(성취기준)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">인지 수준</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">작업</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {knowledgeElements.map((ke) => (
                            <tr key={ke.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {ke.category === 'concept' ? '개념' : 
                                 ke.category === 'principle' ? '원리' : 
                                 ke.category === 'procedure' ? '절차' : '통합'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900">{ke.name}</td>
                              <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">{ke.description}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{ke.source || '-'}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {ke.cognitiveLevel === 'remember' ? '기억' :
                                 ke.cognitiveLevel === 'understand' ? '이해' :
                                 ke.cognitiveLevel === 'apply' ? '적용' :
                                 ke.cognitiveLevel === 'analyze' ? '분석' :
                                 ke.cognitiveLevel === 'synthesize' ? '종합' : '평가'}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditKnowledgeElement(ke)}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="편집"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteKnowledgeElement(ke.id)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 지식 요소 추가/편집 폼 */}
                {(isAddingKnowledgeElement || editingKnowledgeElement) && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">출처(성취기준)</label>
                      <SearchableSelect
                        placeholder="선택하세요"
                        options={achievementStandards}
                        value={newKnowledgeElement.source || ''}
                        onChange={(value) => {
                          setNewKnowledgeElement(prev => ({ ...prev, source: value }));
                        }}
                        onAddNew={handleAddAchievementStandard}
                        emptyText="성취기준 없음"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">구분 *</label>
                        <select
                          value={newKnowledgeElement.category || 'concept'}
                          onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, category: e.target.value as KnowledgeElement['category'] }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="concept">개념</option>
                          <option value="principle">원리</option>
                          <option value="procedure">절차</option>
                          <option value="integration">통합</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">인지 수준 *</label>
                        <select
                          value={newKnowledgeElement.cognitiveLevel || 'remember'}
                          onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, cognitiveLevel: e.target.value as KnowledgeElement['cognitiveLevel'] }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="remember">기억</option>
                          <option value="understand">이해</option>
                          <option value="apply">적용</option>
                          <option value="analyze">분석</option>
                          <option value="synthesize">종합</option>
                          <option value="evaluate">평가</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">지식요소 이름 *</label>
                      <input
                        type="text"
                        value={newKnowledgeElement.name || ''}
                        onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="예: 삼각비의 정의"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">내용 설명 *</label>
                      <textarea
                        value={newKnowledgeElement.description || ''}
                        onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={2}
                        placeholder="예: 직각삼각형에서 sin, cos, tan의 비 정의"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">가중치 (0~1)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={newKnowledgeElement.weight ?? 0.5}
                          onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0.5 }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">선행요소 ID (쉼표로 구분)</label>
                        <input
                          type="text"
                          value={newKnowledgeElement.prereqIds?.join(', ') || ''}
                          onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, prereqIds: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="예: KE1, KE2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">예시문항/미니퀴즈 (한 줄에 하나씩)</label>
                      <textarea
                        value={newKnowledgeElement.exampleQuestions?.join('\n') || ''}
                        onChange={(e) => setNewKnowledgeElement(prev => ({ ...prev, exampleQuestions: e.target.value.split('\n').filter(s => s.trim()) }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={3}
                        placeholder="예: sin 30°의 값을 구하세요.&#10;cos 45°의 값을 구하세요."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingKnowledgeElement && (
                        <button
                          type="button"
                          onClick={cancelEditKnowledgeElement}
                          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          취소
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={saveKnowledgeElement}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {editingKnowledgeElement ? '수정' : '추가'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProblem(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={editingProblem ? updateProblem : addProblem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingProblem ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 보기 모달 */}
      {viewingProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{viewingProblem.title}</h2>
                <button
                  onClick={() => setViewingProblem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 메타 정보 */}
              <div className="flex flex-wrap gap-2">
                {viewingProblem.grade && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {viewingProblem.grade}
                  </span>
                )}
                {viewingProblem.unit && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {viewingProblem.unit}
                  </span>
                )}
              </div>

              {/* 문제 내용 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">문제</h3>
                {viewingProblem.imageUrl ? (
                  <div>
                    <img
                      src={viewingProblem.imageUrl}
                      alt="문제 이미지"
                      className="w-full max-h-64 object-contain border border-gray-200 rounded p-2 mb-2"
                    />
                    {viewingProblem.content && !viewingProblem.content.startsWith('[이미지 문제:') && (
                      <p className="text-gray-600 text-sm">{viewingProblem.content}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">{viewingProblem.content}</p>
                )}
              </div>

              {/* 해설 */}
              {(viewingProblem.explanationImageUrl || viewingProblem.explanationText) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">해설</h3>
                  {viewingProblem.explanationImageUrl && (
                    <img
                      src={viewingProblem.explanationImageUrl}
                      alt="해설 이미지"
                      className="w-full max-h-64 object-contain border border-orange-200 rounded p-2 bg-orange-50 mb-2"
                    />
                  )}
                  {viewingProblem.explanationText && (
                    <p className="text-gray-800 whitespace-pre-wrap bg-orange-50 p-3 rounded">
                      {viewingProblem.explanationText}
                    </p>
                  )}
                </div>
              )}

              {/* 비고 */}
              {viewingProblem.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">비고</h3>
                  <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {viewingProblem.notes}
                  </p>
                </div>
              )}

              {/* 관련 지식 요소 */}
              {viewingProblem.knowledgeElements && viewingProblem.knowledgeElements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">관련 지식 요소</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">구분</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">지식요소</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">내용 설명</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">출처(성취기준)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">인지 수준</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewingProblem.knowledgeElements.map((ke) => (
                            <tr key={ke.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {ke.category === 'concept' ? '개념' : 
                                 ke.category === 'principle' ? '원리' : 
                                 ke.category === 'procedure' ? '절차' : '통합'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900 font-medium">{ke.name}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{ke.description}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{ke.source || '-'}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {ke.cognitiveLevel === 'remember' ? '기억' :
                                 ke.cognitiveLevel === 'understand' ? '이해' :
                                 ke.cognitiveLevel === 'apply' ? '적용' :
                                 ke.cognitiveLevel === 'analyze' ? '분석' :
                                 ke.cognitiveLevel === 'synthesize' ? '종합' : '평가'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 생성/수정 시간 */}
              <div className="text-sm text-gray-500 border-t pt-4">
                <p>생성: {viewingProblem.createdAt}</p>
                <p>수정: {viewingProblem.updatedAt}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemsManagement;