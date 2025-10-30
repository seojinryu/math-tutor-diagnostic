'use client';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  FileText,
  Settings,
  Search,
  Menu,
  X,
  Brain
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    {
      name: '대시보드',
      href: '/admin',
      icon: Home,
      current: pathname === '/admin'
    },
    {
      name: '문제 관리',
      href: '/admin/problems',
      icon: BookOpen,
      current: pathname === '/admin/problems'
    },
    {
      name: '프롬프트 관리',
      href: '/admin/prompt',
      icon: FileText,
      current: pathname === '/admin/prompt'
    },
    {
      name: '설정',
      href: '/admin/settings',
      icon: Settings,
      current: pathname === '/admin/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* 사이드바 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">수학 AI 어드민</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* 수업 화면으로 돌아가기 */}
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            href="/"
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            수업 화면으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="lg:pl-64">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* 글로벌 검색 */}
            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="문제, 프롬프트, 설정 검색..."
                />
              </div>
            </div>

            {/* 사용자 정보 */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">관리자</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;