import { Languages } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';

const LANGUAGES = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'vi', labelKey: 'language.vi' }
];

export default function LanguageToggle({ className }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur',
        className
      )}
      role="group"
      aria-label="Language"
    >
      <Languages className="ml-1.5 hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setLang(language.code)}
          aria-pressed={lang === language.code}
          className={cn(
            'touch-target rounded-full px-2 py-1 text-[11px] font-extrabold tracking-wide transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.96] sm:px-2.5',
            lang === language.code
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          )}
        >
          {t(language.labelKey)}
        </button>
      ))}
    </div>
  );
}
