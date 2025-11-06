import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-gray-600">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      </div>
    </div>
  );
}

