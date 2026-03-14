import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import './types';
import type { Module, Newable, NewableModule } from 'i18next';

// Read persisted language from Zustand store in localStorage
function getPersistedLanguage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('webagent-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const lang = parsed?.state?.language;
      if (lang && lang !== 'system') return lang;
    }
  } catch {
    // ignore
  }
  return null;
}

// Resolve system language to supported locale
function resolveSystemLanguage(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  const nav = navigator.language || '';
  return nav.startsWith('zh') ? 'zh-CN' : 'en-US';
}

const persistedLang = getPersistedLanguage();
const initialLang = persistedLang || resolveSystemLanguage();

type I18nPlugin = Module | NewableModule<Module> | Newable<Module>;

const registeredPlugins = new Set<I18nPlugin>();
let initPromise: Promise<typeof i18n> | null = null;

function registerPlugin(plugin: I18nPlugin): void {
  if (registeredPlugins.has(plugin)) {
    return;
  }

  i18n.use(plugin);
  registeredPlugins.add(plugin);
}

export function initializeSharedI18n(plugins: I18nPlugin[] = []): Promise<typeof i18n> {
  if (initPromise) {
    const hasLatePlugins = plugins.some((plugin) => !registeredPlugins.has(plugin));
    if (hasLatePlugins) {
      throw new Error('Shared i18n was already initialized before registering all plugins.');
    }
    return initPromise;
  }

  registerPlugin(LanguageDetector);
  plugins.forEach(registerPlugin);

  initPromise = i18n.init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: initialLang,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: [], // We handle detection ourselves above
    },
  }).then(() => i18n);

  return initPromise;
}

export default i18n;
