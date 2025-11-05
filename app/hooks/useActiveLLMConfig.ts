'use client';
import { useState, useEffect } from 'react';
import type { LLMConfig } from '../admin/prompt/page';

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
        setError('AI 연동 설정이 없습니다. Admin 페이지에서 설정을 추가해주세요.');
        setIsLoading(false);
        return;
      }

      // 2. JSON 파싱
      const parsedConfigs = JSON.parse(storedConfigs) as LLMConfig[];
      console.log('📋 [useActiveLLMConfig] Parsed configs:', parsedConfigs.length, 'items');

      if (parsedConfigs.length === 0) {
        console.warn('⚠️ [useActiveLLMConfig] Empty configs array');
        setError('AI 연동 설정이 비어있습니다. Admin 페이지에서 설정을 추가해주세요.');
        setIsLoading(false);
        return;
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

