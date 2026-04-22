export interface VideoTheme {
  bg: string;
  text: string;
  accent: string;
}

export const themes: Record<string, VideoTheme> = {
  dark: {
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    text: '#ffffff',
    accent: 'rgba(255,255,255,0.75)',
  },
  light: {
    bg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    text: '#1a1a2e',
    accent: '#495057',
  },
  blue: {
    bg: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
    text: '#ffffff',
    accent: 'rgba(187,222,251,0.85)',
  },
  warm: {
    bg: 'linear-gradient(135deg, #1a0a00 0%, #3e1c00 50%, #5d2e00 100%)',
    text: '#fff3e0',
    accent: 'rgba(255,204,128,0.85)',
  },
  green: {
    bg: 'linear-gradient(135deg, #0a1a0a 0%, #1b3a1b 50%, #2e5a2e 100%)',
    text: '#e8f5e9',
    accent: 'rgba(165,214,167,0.85)',
  },
};

export function getTheme(name?: string): VideoTheme {
  return themes[name ?? 'dark'] ?? themes.dark;
}
