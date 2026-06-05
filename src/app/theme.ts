export const THEME_STYLES = {
  peach: {
    id: 'peach' as const,
    name: '桃色暖光',
    primary: '#fb7185',
    secondary: '#fda4af',
    bg: '#fff5f5',
    light: '#fff1f2',
    accentText: 'text-rose-600',
    border: 'border-rose-200',
    primaryBg: 'bg-rose-500',
    primaryHoverBg: 'hover:bg-rose-600',
    primaryLight: '#fff1f2',
  },
  beige: {
    id: 'beige' as const,
    name: '经典优雅米',
    primary: '#d4a574',
    secondary: '#e7c29f',
    bg: '#fafaf9',
    light: '#fdfaf6',
    accentText: 'text-[#a0744a]',
    border: 'border-amber-200/60',
    primaryBg: 'bg-[#d4a574]',
    primaryHoverBg: 'hover:bg-[#c29260]',
    primaryLight: '#fdfaf6',
  },
};

export type ThemeId = keyof typeof THEME_STYLES;

