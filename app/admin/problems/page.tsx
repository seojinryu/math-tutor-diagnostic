'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  X,
  Check,
  Image
} from 'lucide-react';

interface Problem {
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

const ProblemsManagement = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [viewingProblem, setViewingProblem] = useState<Problem | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [explanationImageFile, setExplanationImageFile] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const explanationFileInputRef = useRef<HTMLInputElement>(null);

  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    title: '',
    content: '',
    category: '',
    grade: '',
    unit: '',
    difficulty: 'medium',
    explanationText: ''
  });

  const nowTime = () =>
    new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(new Date());

  const uid = () => Math.random().toString(36).slice(2);

  // 로컬스토리지에서 문제 로드
  useEffect(() => {
    const storedProblems = localStorage.getItem('math_tutor_problems');
    if (storedProblems) {
      try {
        setProblems(JSON.parse(storedProblems));
      } catch (e) {
        console.error('Failed to load problems:', e);
      }
    }
  }, []);

  // 문제 저장
  const saveProblems = (problemsToSave: Problem[]) => {
    localStorage.setItem('math_tutor_problems', JSON.stringify(problemsToSave));
    setProblems(problemsToSave);
  };

  // 필터링된 문제
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         problem.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (problem.category && problem.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || problem.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || problem.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // 고유 카테고리 목록
  const categories = [...new Set(problems.map(p => p.category).filter(Boolean))];

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
      category: newProblem.category?.trim() || '',
      grade: newProblem.grade?.trim() || '',
      unit: newProblem.unit?.trim() || '',
      difficulty: newProblem.difficulty || 'medium',
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
            category: newProblem.category?.trim() || '',
            grade: newProblem.grade?.trim() || '',
            unit: newProblem.unit?.trim() || '',
            difficulty: newProblem.difficulty || 'medium',
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
      category: '',
      grade: '',
      unit: '',
      difficulty: 'medium',
      explanationText: ''
    });
    setInputMode('text');
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
      category: problem.category,
      grade: problem.grade,
      unit: problem.unit,
      difficulty: problem.difficulty
    });
    if (problem.imageUrl) {
      setInputMode('image');
      setImagePreview(problem.imageUrl);
    }
    if (problem.explanationImageUrl) {
      setExplanationImagePreview(problem.explanationImageUrl);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return '미정';
    }
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문제 제목, 내용, 카테고리 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">모든 카테고리</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">모든 난이도</option>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
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
                        {problem.content || '이미지 문제'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {problem.grade && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {problem.grade}
                          </span>
                        )}
                        {problem.category && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {problem.category}
                          </span>
                        )}
                        {problem.unit && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                            {problem.unit}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyText(problem.difficulty)}
                        </span>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                  <input
                    type="text"
                    value={newProblem.grade}
                    onChange={(e) => setNewProblem(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 중3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">단원</label>
                  <input
                    type="text"
                    value={newProblem.unit}
                    onChange={(e) => setNewProblem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 이차방정식"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">분류</label>
                  <input
                    type="text"
                    value={newProblem.category}
                    onChange={(e) => setNewProblem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 함수"
                  />
                </div>
              </div>

              {/* 난이도 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                <select
                  value={newProblem.difficulty}
                  onChange={(e) => setNewProblem(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">쉬움</option>
                  <option value="medium">보통</option>
                  <option value="hard">어려움</option>
                </select>
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

                <div className="space-y-4">
                  {/* 해설 이미지 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">해설 이미지</label>
                    <input
                      ref={explanationFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'explanation')}
                      className="hidden"
                    />
                    <button
                      onClick={() => explanationFileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      해설 이미지 선택
                    </button>
                    {explanationImagePreview && (
                      <div className="mt-2">
                        <img src={explanationImagePreview} alt="해설 미리보기" className="max-w-full h-auto border border-orange-300 rounded" />
                      </div>
                    )}
                  </div>

                  {/* 해설 텍스트 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">해설 텍스트</label>
                    <textarea
                      value={newProblem.explanationText}
                      onChange={(e) => setNewProblem(prev => ({ ...prev, explanationText: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="해설을 입력하세요..."
                    />
                  </div>
                </div>
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
                {viewingProblem.category && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {viewingProblem.category}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(viewingProblem.difficulty)}`}>
                  {getDifficultyText(viewingProblem.difficulty)}
                </span>
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
                    {viewingProblem.content && (
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