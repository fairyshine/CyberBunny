import { codeToHtml, createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import type { CodeThemePreset } from '@openbunny/shared/stores/settings';

const FALLBACK_LANGUAGE = 'plaintext';

type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'tsx'
  | 'jsx'
  | 'bash'
  | 'json'
  | 'python'
  | 'html'
  | 'css'
  | 'yaml'
  | 'markdown'
  | 'sql';

type SupportedTheme =
  | 'github-light-default'
  | 'github-dark-default'
  | 'light-plus'
  | 'dark-plus'
  | 'one-light'
  | 'one-dark-pro'
  | 'rose-pine-dawn'
  | 'rose-pine-moon'
  | 'kanagawa-lotus'
  | 'kanagawa-wave'
  | 'aurora-x'
  | 'synthwave-84';

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;
type LanguageModuleLoader = () => Promise<{ default: any[] }>;
type ThemeModuleLoader = () => Promise<{ default: any }>;

const CODE_THEME_MAP: Record<CodeThemePreset, { light: SupportedTheme; dark: SupportedTheme }> = {
  github: { light: 'github-light-default', dark: 'github-dark-default' },
  vscode: { light: 'light-plus', dark: 'dark-plus' },
  one: { light: 'one-light', dark: 'one-dark-pro' },
  'rose-pine': { light: 'rose-pine-dawn', dark: 'rose-pine-moon' },
  kanagawa: { light: 'kanagawa-lotus', dark: 'kanagawa-wave' },
  aurora: { light: 'aurora-x', dark: 'synthwave-84' },
};

const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'bash',
  'json',
  'python',
  'html',
  'css',
  'yaml',
  'markdown',
  'sql',
] as const satisfies readonly SupportedLanguage[];

const LANGUAGE_LOADERS: Record<SupportedLanguage, LanguageModuleLoader> = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  jsx: () => import('@shikijs/langs/jsx'),
  bash: () => import('@shikijs/langs/bash'),
  json: () => import('@shikijs/langs/json'),
  python: () => import('@shikijs/langs/python'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  yaml: () => import('@shikijs/langs/yaml'),
  markdown: () => import('@shikijs/langs/markdown'),
  sql: () => import('@shikijs/langs/sql'),
};

const THEME_LOADERS: Record<SupportedTheme, ThemeModuleLoader> = {
  'github-light-default': () => import('@shikijs/themes/github-light-default'),
  'github-dark-default': () => import('@shikijs/themes/github-dark-default'),
  'light-plus': () => import('@shikijs/themes/light-plus'),
  'dark-plus': () => import('@shikijs/themes/dark-plus'),
  'one-light': () => import('@shikijs/themes/one-light'),
  'one-dark-pro': () => import('@shikijs/themes/one-dark-pro'),
  'rose-pine-dawn': () => import('@shikijs/themes/rose-pine-dawn'),
  'rose-pine-moon': () => import('@shikijs/themes/rose-pine-moon'),
  'kanagawa-lotus': () => import('@shikijs/themes/kanagawa-lotus'),
  'kanagawa-wave': () => import('@shikijs/themes/kanagawa-wave'),
  'aurora-x': () => import('@shikijs/themes/aurora-x'),
  'synthwave-84': () => import('@shikijs/themes/synthwave-84'),
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLanguages = new Set<SupportedLanguage>();
const loadedThemes = new Set<SupportedTheme>();

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
    });
  }

  return highlighterPromise;
}

async function ensureLanguageLoaded(highlighter: Highlighter, language: SupportedLanguage): Promise<void> {
  if (loadedLanguages.has(language)) return;

  const languageModule = await LANGUAGE_LOADERS[language]();
  await highlighter.loadLanguage(...languageModule.default);
  loadedLanguages.add(language);
}

async function ensureThemeLoaded(highlighter: Highlighter, theme: SupportedTheme): Promise<void> {
  if (loadedThemes.has(theme)) return;

  const themeModule = await THEME_LOADERS[theme]();
  await highlighter.loadTheme(themeModule.default);
  loadedThemes.add(theme);
}

export function normalizeCodeLanguage(language?: string): string {
  if (!language) return FALLBACK_LANGUAGE;

  const normalized = language.trim().toLowerCase();
  if (['js', 'mjs', 'cjs', 'javascript'].includes(normalized)) return 'javascript';
  if (['jsx'].includes(normalized)) return 'jsx';
  if (['ts', 'mts', 'cts', 'typescript'].includes(normalized)) return 'typescript';
  if (['tsx'].includes(normalized)) return 'tsx';
  if (['sh', 'shell', 'zsh', 'bash', 'shellscript'].includes(normalized)) return 'bash';
  if (['py', 'python'].includes(normalized)) return 'python';
  if (['yml', 'yaml'].includes(normalized)) return 'yaml';
  if (normalized === 'md') return 'markdown';
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(normalized)) return normalized;

  return FALLBACK_LANGUAGE;
}

export function resolveCodeTheme(preset: CodeThemePreset, isDark: boolean): SupportedTheme {
  const themeSet = CODE_THEME_MAP[preset] ?? CODE_THEME_MAP.github;
  return isDark ? themeSet.dark : themeSet.light;
}

export async function highlightCodeBlock(
  code: string,
  language: string | undefined,
  isDark: boolean,
  preset: CodeThemePreset,
): Promise<string> {
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (normalizedLanguage === FALLBACK_LANGUAGE) return '';

  const highlighter = await getHighlighter();
  const theme = resolveCodeTheme(preset, isDark);
  await Promise.all([
    ensureLanguageLoaded(highlighter, normalizedLanguage as SupportedLanguage),
    ensureThemeLoaded(highlighter, theme),
  ]);

  return codeToHtml(highlighter, code, {
    lang: normalizedLanguage,
    theme,
  });
}
