const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const SCRIPT_ID = 'google-identity-services';

export const hasGoogleSignIn = Boolean(CLIENT_ID);

let scriptPromise = null;
let initialized = false;
const credentialHandlers = new Set();

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error('GOOGLE_SCRIPT_FAILED'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function ensureGoogleIdentity() {
  if (!hasGoogleSignIn) throw new Error('GOOGLE_NOT_CONFIGURED');

  const google = await loadGoogleScript();
  if (!google?.accounts?.id) throw new Error('GOOGLE_SCRIPT_FAILED');

  if (!initialized) {
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        const handler = [...credentialHandlers].at(-1);
        if (response?.credential) handler?.(response.credential);
      }
    });
    initialized = true;
  }
  return google;
}

// Nhiều nút Google có thể cùng tồn tại (modal đăng nhập + xác nhận xóa tài khoản);
// GIS chỉ nhận một callback nên nút mount sau cùng sẽ nhận credential.
export function registerCredentialHandler(handler) {
  credentialHandlers.add(handler);
  return () => credentialHandlers.delete(handler);
}
