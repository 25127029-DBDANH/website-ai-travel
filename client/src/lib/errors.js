export function translateApiError(t, error) {
  const code = error?.code || 'default';
  const key = `error.${code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  if (code === 'NETWORK_ERROR') return t('error.network');
  return t('error.default');
}
