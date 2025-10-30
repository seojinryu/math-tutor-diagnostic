'use client';
import { useState, useEffect } from 'react';
import {
  Save,
  Key,
  Globe,
  Shield,
  Database,
  Bell,
  Palette,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Settings {
  api: {
    geminiApiKey: string;
    apiTimeout: number;
    maxRetries: number;
  };
  system: {
    defaultDifficulty: 'easy' | 'medium' | 'hard';
    autoSave: boolean;
    maxProblems: number;
    maxConversations: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'ko' | 'en';
    showDebugInfo: boolean;
    compactMode: boolean;
  };
  notifications: {
    enableNotifications: boolean;
    soundEnabled: boolean;
    emailAlerts: boolean;
  };
  data: {
    autoBackup: boolean;
    backupInterval: number; // hours
    retentionDays: number;
  };
}

const SettingsManagement = () => {
  const [settings, setSettings] = useState<Settings>({
    api: {
      geminiApiKey: '',
      apiTimeout: 30000,
      maxRetries: 3
    },
    system: {
      defaultDifficulty: 'medium',
      autoSave: true,
      maxProblems: 1000,
      maxConversations: 10000
    },
    ui: {
      theme: 'light',
      language: 'ko',
      showDebugInfo: false,
      compactMode: false
    },
    notifications: {
      enableNotifications: true,
      soundEnabled: true,
      emailAlerts: false
    },
    data: {
      autoBackup: true,
      backupInterval: 24,
      retentionDays: 30
    }
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('api');

  // 설정 로드
  useEffect(() => {
    const storedSettings = localStorage.getItem('math_tutor_settings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    // API 키 로드
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (apiKey) {
      setSettings(prev => ({
        ...prev,
        api: { ...prev.api, geminiApiKey: apiKey }
      }));
    }
  }, []);

  // 설정 저장
  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('math_tutor_settings', JSON.stringify(settings));

      // API 키 별도 저장
      if (settings.api.geminiApiKey) {
        localStorage.setItem('gemini_api_key', settings.api.geminiApiKey);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 설정 내보내기
  const exportSettings = () => {
    const exportData = {
      ...settings,
      api: { ...settings.api, geminiApiKey: '[HIDDEN]' } // API 키 숨김
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-tutor-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 설정 가져오기
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(prev => ({ ...prev, ...imported }));
          alert('설정을 가져왔습니다.');
        } catch (error) {
          alert('설정 파일 형식이 올바르지 않습니다.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // 데이터 초기화
  const resetData = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('math_tutor_problems');
      localStorage.removeItem('math_tutor_custom_prompt');
      localStorage.removeItem('math_tutor_prompt_versions');
      localStorage.removeItem('math_tutor_settings');
      alert('모든 데이터가 초기화되었습니다. 페이지를 새로고침하세요.');
    }
  };

  // 백업 생성
  const createBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      problems: JSON.parse(localStorage.getItem('math_tutor_problems') || '[]'),
      prompt: localStorage.getItem('math_tutor_custom_prompt'),
      promptVersions: JSON.parse(localStorage.getItem('math_tutor_prompt_versions') || '[]'),
      settings: settings
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-tutor-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'api', name: 'API 설정', icon: Key },
    { id: 'system', name: '시스템', icon: Database },
    { id: 'ui', name: '인터페이스', icon: Palette },
    { id: 'notifications', name: '알림', icon: Bell },
    { id: 'data', name: '데이터', icon: Shield }
  ];

  const updateSettings = (section: keyof Settings, key: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
          <p className="text-gray-600 mt-1">애플리케이션 설정을 관리합니다</p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="inline-flex items-center px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            설정 가져오기
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
            />
          </label>
          <button
            onClick={exportSettings}
            className="inline-flex items-center px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            설정 내보내기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 탭 네비게이션 */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 설정 내용 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              {/* API 설정 */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">API 설정</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gemini API 키
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={settings.api.geminiApiKey}
                            onChange={(e) => updateSettings('api', 'geminiApiKey', e.target.value)}
                            className="w-full p-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="API 키를 입력하세요"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKey ? '숨기기' : '보기'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API 타임아웃 (ms)
                          </label>
                          <input
                            type="number"
                            value={settings.api.apiTimeout}
                            onChange={(e) => updateSettings('api', 'apiTimeout', parseInt(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1000"
                            max="300000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            최대 재시도 횟수
                          </label>
                          <input
                            type="number"
                            value={settings.api.maxRetries}
                            onChange={(e) => updateSettings('api', 'maxRetries', parseInt(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 시스템 설정 */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 설정</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          기본 난이도
                        </label>
                        <select
                          value={settings.system.defaultDifficulty}
                          onChange={(e) => updateSettings('system', 'defaultDifficulty', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="easy">쉬움</option>
                          <option value="medium">보통</option>
                          <option value="hard">어려움</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoSave"
                          checked={settings.system.autoSave}
                          onChange={(e) => updateSettings('system', 'autoSave', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="autoSave" className="ml-2 text-sm text-gray-700">
                          자동 저장 활성화
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            최대 문제 수
                          </label>
                          <input
                            type="number"
                            value={settings.system.maxProblems}
                            onChange={(e) => updateSettings('system', 'maxProblems', parseInt(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="10000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            최대 대화 수
                          </label>
                          <input
                            type="number"
                            value={settings.system.maxConversations}
                            onChange={(e) => updateSettings('system', 'maxConversations', parseInt(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                            max="100000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UI 설정 */}
              {activeTab === 'ui' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">인터페이스 설정</h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            테마
                          </label>
                          <select
                            value={settings.ui.theme}
                            onChange={(e) => updateSettings('ui', 'theme', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="light">라이트</option>
                            <option value="dark">다크</option>
                            <option value="auto">자동</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            언어
                          </label>
                          <select
                            value={settings.ui.language}
                            onChange={(e) => updateSettings('ui', 'language', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="showDebugInfo"
                            checked={settings.ui.showDebugInfo}
                            onChange={(e) => updateSettings('ui', 'showDebugInfo', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="showDebugInfo" className="ml-2 text-sm text-gray-700">
                            디버그 정보 표시
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="compactMode"
                            checked={settings.ui.compactMode}
                            onChange={(e) => updateSettings('ui', 'compactMode', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="compactMode" className="ml-2 text-sm text-gray-700">
                            컴팩트 모드
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 알림 설정 */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 설정</h3>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="enableNotifications"
                            checked={settings.notifications.enableNotifications}
                            onChange={(e) => updateSettings('notifications', 'enableNotifications', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="enableNotifications" className="ml-2 text-sm text-gray-700">
                            알림 활성화
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="soundEnabled"
                            checked={settings.notifications.soundEnabled}
                            onChange={(e) => updateSettings('notifications', 'soundEnabled', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="soundEnabled" className="ml-2 text-sm text-gray-700">
                            알림음 활성화
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="emailAlerts"
                            checked={settings.notifications.emailAlerts}
                            onChange={(e) => updateSettings('notifications', 'emailAlerts', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="emailAlerts" className="ml-2 text-sm text-gray-700">
                            이메일 알림
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 데이터 설정 */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">데이터 관리</h3>

                    <div className="space-y-6">
                      {/* 백업 설정 */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">백업 설정</h4>
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="autoBackup"
                              checked={settings.data.autoBackup}
                              onChange={(e) => updateSettings('data', 'autoBackup', e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="autoBackup" className="ml-2 text-sm text-gray-700">
                              자동 백업 활성화
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                백업 간격 (시간)
                              </label>
                              <input
                                type="number"
                                value={settings.data.backupInterval}
                                onChange={(e) => updateSettings('data', 'backupInterval', parseInt(e.target.value))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="1"
                                max="168"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                보관 기간 (일)
                              </label>
                              <input
                                type="number"
                                value={settings.data.retentionDays}
                                onChange={(e) => updateSettings('data', 'retentionDays', parseInt(e.target.value))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="1"
                                max="365"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 데이터 관리 액션 */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">데이터 관리</h4>
                        <div className="space-y-3">
                          <button
                            onClick={createBackup}
                            className="w-full sm:w-auto inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            백업 생성
                          </button>

                          <div className="border-t pt-4">
                            <div className="flex items-center mb-3">
                              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                              <span className="text-sm font-medium text-red-600">위험 구역</span>
                            </div>
                            <button
                              onClick={resetData}
                              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              모든 데이터 초기화
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                              이 작업은 되돌릴 수 없습니다. 반드시 백업을 생성한 후 진행하세요.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saveStatus === 'saving'}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                  saveStatus === 'saving'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : saveStatus === 'saved'
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <>저장 중...</>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    저장됨
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    설정 저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;