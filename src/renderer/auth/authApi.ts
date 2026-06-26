/**
 * Xamong Auth API — Xenesis Desk 전용
 * src/api/XamongApi.tsx 의 로그인/회원가입 로직을 Electron 환경에 맞게 재구현.
 * window.XCON 의존성 없이 동작하며 localStorage 를 사용해 세션을 유지한다.
 */

/**
 * 개발 환경(Vite dev server, localhost)에서는 Vite proxy(/xamong-api)를 경유하고,
 * Electron 빌드(file:// 또는 app://)에서는 직접 Xamong 서버로 요청한다.
 * Electron 환경은 CORS 제약이 없으므로 직접 호출해도 무방하다.
 */
const isDev =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const XAMONG_DEFAULT_API_URL = isDev ? '' : 'https://www.xamong.com';
const XAMONG_DEV_PROXY_PREFIX = '/xamong-api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: string;
  avatar?: string;
  plan?: string;
  subscription?: string;
}

// ── 디바이스 ID (한 번 생성 후 localStorage 에 영속) ─────────────────────────
const getDeviceId = (): string => {
  const KEY = 'xc_desk_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

// ── 요청 헤더 ──────────────────────────────────────────────────────────────────
const buildHeaders = (includeAuth: boolean): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'device-id': getDeviceId(),
    'device-type': 'WEB',
    'app-name': 'Xamong-AI',
    'app-version': '1.0.0',
    'dtx-tx-id': crypto.randomUUID(),
    'session-id': '-',
    'runtime-id': '-',
    'dtx-lang-type': 'ko',
  };

  let accessToken = '';
  if (includeAuth) {
    try {
      const session = JSON.parse(localStorage.getItem('sessionInfo') || '{}');
      accessToken = session?.access_token ?? '';
    } catch {
      /* ignore */
    }
  }

  headers['dtx-login-token'] = accessToken || '-';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  return headers;
};

// ── Base64 인코딩 헬퍼 ────────────────────────────────────────────────────────
const encodeContent = (params: object): string => btoa(unescape(encodeURIComponent(JSON.stringify(params))));

// ── 공통 요청 처리 ────────────────────────────────────────────────────────────
const handleRequest = async (
  endpoint: string, // '/login' | '/request' | '/command'
  command: string,
  params: object,
  apiBaseUrl: string,
): Promise<any> => {
  let payload: string;
  let authRequired = false;

  if (endpoint === '/command') {
    // /command: binary payload — command:base64content
    const content = encodeContent(params);
    payload = `${command}:${content}`;
  } else if ((params as any).loginUid !== undefined) {
    // /login: plain JSON (loginUid 포함)
    payload = JSON.stringify(params);
  } else {
    // /request 등: 감싸진 JSON
    authRequired = true;
    const content = encodeContent(params);
    payload = JSON.stringify({ uid: '-99', command, content, reqDt: '' });
  }

  // 개발 환경: Vite proxy prefix 추가 → /xamong-api/login 등으로 우회
  const base = apiBaseUrl || XAMONG_DEFAULT_API_URL;
  const url = isDev ? `${XAMONG_DEV_PROXY_PREFIX}${endpoint}` : `${base}${endpoint}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(authRequired),
    body: payload,
  });

  if (!res.ok) {
    let msg = `HTTP error! status: ${res.status}`;
    try {
      const d = await res.json();
      msg = d.message || d.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    const data = await res.json();
    if (data?.error) throw new Error(data.error.message || 'Server error');
    return data;
  }
  return await res.text();
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** 이메일/비밀번호 로그인. 성공 시 AuthUser 반환, 실패 시 Error throw */
export const authApiLogin = async (email: string, password: string): Promise<AuthUser> => {
  const loginResult = await handleRequest(
    '/login',
    'login',
    {
      loginUid: '-99',
      userid: email,
      password,
      accessCode: localStorage.getItem('autoLogin') ? 'Y' : 'N',
      reserve: 'XamongApi',
      reserv1: 'password',
      reserv2: 'default-xamong',
      reserv3: '300c44a3-bd5d-4bc8-8d9e-8c02f9ef65ec',
    },
    XAMONG_DEFAULT_API_URL,
  );

  if (loginResult?.returnCode) {
    throw new Error(`${loginResult.errorMessage}(${loginResult.errorCode})`);
  }
  localStorage.setItem('sessionInfo', JSON.stringify(loginResult));

  // 사용자 상세 정보 조회
  const userInfo = await handleRequest('/request', 'userinfo', { userid: email }, XAMONG_DEFAULT_API_URL);
  if (userInfo?.returnCode) {
    throw new Error(`${userInfo.errorMessage}(${userInfo.errorCode})`);
  }
  localStorage.setItem('userInfo', JSON.stringify(userInfo));

  const user: AuthUser = {
    id: userInfo.userid,
    name: userInfo.username || userInfo.nickname || email.split('@')[0],
    email: userInfo.email || email,
    provider: 'email',
    avatar: userInfo.profile_image || '',
    plan: String(userInfo.level ?? '1'),
    subscription: userInfo.status || '',
  };

  localStorage.setItem('xamong_user', JSON.stringify(user));
  localStorage.setItem('xamong_logged_in', 'true');
  return user;
};

/** 회원가입. 성공 시 true, 실패 시 Error throw */
export const authApiRegister = async (email: string, password: string, name: string): Promise<boolean> => {
  const result = await handleRequest('/command', 'signup', { email, password, username: name }, XAMONG_DEFAULT_API_URL);

  if (result?.returnCode === 'F' || result?.successYn === 'N') {
    throw new Error(result.errorMessage || 'Sign up failed');
  }
  return true;
};

/** 로그아웃 — 모든 로컬 세션 데이터 삭제 */
export const authApiLogout = (): void => {
  const KEYS = ['sessionInfo', 'userInfo', 'xamong_user', 'xamong_logged_in', 'xamong_token', 'registerData'];
  KEYS.forEach((k) => localStorage.removeItem(k));
};

/** 앱 시작 시 저장된 로그인 상태 복원 */
export const authApiLoadUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('xamong_user');
    const flag = localStorage.getItem('xamong_logged_in');
    if (raw && flag === 'true') return JSON.parse(raw) as AuthUser;
  } catch {
    /* ignore */
  }
  return null;
};

/** API error → English message */
export const authGetErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const m = error.message;
    if (m.includes('401')) return 'Authentication required. Please sign in again.';
    if (m.includes('403')) return 'Permission denied.';
    if (m.includes('409')) return 'Email already registered.';
    if (m.includes('422')) return 'Invalid input data.';
    if (m.includes('429')) return 'Too many requests. Please try again later.';
    if (m.includes('500')) return 'Server error. Please try again later.';
    if (m.includes('fetch') || m.includes('Failed to fetch')) return 'Check network connection.';
    return m;
  }
  return 'An unknown error occurred.';
};
