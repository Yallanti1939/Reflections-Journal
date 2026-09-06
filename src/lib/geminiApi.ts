import { ReflectionMode } from '../types';

export interface GeminiReflectRequest {
  prompt: string;
  mode: ReflectionMode;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  title?: string;
}

export interface GeminiReflectResponse {
  reply: string;
  modelUsed: string;
  mode: ReflectionMode;
}

export async function sendReflectionRequest(
  data: GeminiReflectRequest
): Promise<GeminiReflectResponse> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Server responded with status ${response.status}`
    );
  }

  return response.json();
}

export async function generateAutoTitle(text: string): Promise<string> {
  try {
    const response = await fetch('/api/gemini/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) return 'Personal Reflection';
    const data = await response.json();
    return data.title || 'Personal Reflection';
  } catch (err) {
    console.warn('Auto-title generation error:', err);
    return 'Personal Reflection';
  }
}
