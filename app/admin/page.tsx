'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  MessageCircle,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Settings
} from 'lucide-react';

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  status: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProblems: 0,
    totalConversations: 0,
    activeUsers: 0,
    successRate: 0
  });

  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    // 로컬스토리지에서 통계 데이터 로드
    const problems = JSON.parse(localStorage.getItem('math_tutor_problems') || '[]');
    setStats(prev => ({
      ...prev,
      totalProblems: problems.length
    }));

    // 최근 활동 데이터 시뮬레이션
    setRecentActivity([
      {
        id: 1,
        type: 'problem_added',
        message: '새 문제가 추가되었습니다: "이차방정식 근의 공식"',
        time: '5분 전',
        status: 'success'
      },
      {
        id: 2,
        type: 'conversation',
        message: '학생이 문제를 성공적으로 해결했습니다',
        time: '12분 전',
        status: 'success'
      },
      {
        id: 3,
        type: 'prompt_updated',
        message: '시스템 프롬프트가 업데이트되었습니다',
        time: '1시간 전',
        status: 'info'
      },
      {
        id: 4,
        type: 'error',
        message: 'API 호출 오류가 발생했습니다',
        time: '2시간 전',
        status: 'error'
      }
    ]);
  }, []);

  const statCards = [
    {
      title: '등록된 문제',
      value: stats.totalProblems,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: '총 대화',
      value: stats.totalConversations,
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: '성공률',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">수학 AI 튜터 시스템 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  {getActivityIcon(activity.type, activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">빠른 액션</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <Link
                href="/admin/problems"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">새 문제 추가</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>

              <Link
                href="/admin/prompt"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">프롬프트 편집</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">시스템 설정</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>

              <Link
                href="/"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">수업 화면 보기</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">시스템 상태</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">API 상태</p>
              <p className="text-xs text-gray-500">정상</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">데이터베이스</p>
              <p className="text-xs text-gray-500">정상</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">스토리지</p>
              <p className="text-xs text-gray-500">주의</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;