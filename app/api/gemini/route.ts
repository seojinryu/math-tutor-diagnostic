import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 서버 사이드에서만 접근 가능한 API 키
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. 서버 환경 변수 GEMINI_API_KEY를 확인하세요.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      model,
      systemPrompt,
      userParts,
      generationConfig
    } = body;

    if (!model || !systemPrompt || !userParts || !generationConfig) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Gemini API 호출
    // API 키는 URL 쿼리 파라미터로 전달 (Gemini API 권장 방식)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: userParts
          }
        ],
        generationConfig
      })
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = '응답 본문을 읽을 수 없습니다.';
      }
      
      console.error('Gemini API 오류:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // 처음 500자만 로깅
      });
      
      // 에러 텍스트에서 JSON 파싱 시도
      let errorDetails = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorDetails = parsed.error?.message || parsed.error || JSON.stringify(parsed);
      } catch {
        // JSON이 아니면 원본 텍스트 사용
      }
      
      return NextResponse.json(
        { 
          error: `Gemini API 오류: ${response.status} ${response.statusText}`,
          details: errorDetails.length > 500 ? errorDetails.substring(0, 500) + '...' : errorDetails
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('서버 오류:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

