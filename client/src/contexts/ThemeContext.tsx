import { createContext, useContext } from 'react'

export interface ThemeDefinition {
  name: string
  mode: 'light' | 'dark'
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  text2: string
  accent: string
  gradient: string
  previewColors: string[]
  groupColors: string[]
}

export const THEMES: ThemeDefinition[] = [
  {
    name: 'Default',
    mode: 'light',
    bg: '#f0f2f5',
    surface: '#ffffff',
    surface2: '#e8eaed',
    border: 'rgba(0,0,0,0.09)',
    text: '#09090b',
    text2: '#71717a',
    accent: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    previewColors: ['#f0f2f5', '#e8eaed', '#2563eb'],
    groupColors: ['#ffffff'],
  },
  {
    name: 'Dark',
    mode: 'dark',
    bg: '#0a0a0f',
    surface: '#111118',
    surface2: '#111a28',
    border: 'rgba(37,99,235,0.18)',
    text: '#f0f4ff',
    text2: '#7d8faa',
    accent: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    previewColors: ['#0a0a0f', '#111a28', '#2563eb'],
    groupColors: ['#0f1a28', '#111e30', '#101828', '#131f2e'],
  },
  {
    name: 'Midnight',
    mode: 'dark',
    bg: '#050814',
    surface: '#0d1117',
    surface2: '#161b22',
    border: 'rgba(125,211,252,0.18)',
    text: '#e2f8ff',
    text2: '#7d8ea0',
    accent: '#7dd3fc',
    gradient: 'linear-gradient(135deg, #7dd3fc 0%, #1d4ed8 100%)',
    previewColors: ['#050814', '#0d2a35', '#7dd3fc'],
    groupColors: ['#0d1117', '#0d1f2d', '#0d1a2d', '#1a0d2d'],
  },
  {
    name: 'Rainbow',
    mode: 'light',
    bg: '#f5f0ff',
    surface: '#ffffff',
    surface2: '#ede9fe',
    border: '#ddd6fe',
    text: '#1a1a2e',
    text2: '#6b5fa0',
    accent: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    previewColors: ['#fce7f3', '#ede9fe', '#dbeafe'],
    groupColors: ['#ffeaec', '#fef0e0', '#fef6d5', '#e5fdec', '#e4f0fe', '#e9f6fe', '#f2f0fe'],
  },
  {
    name: 'Ocean',
    mode: 'light',
    bg: '#f0f9ff',
    surface: '#ffffff',
    surface2: '#e0f2fe',
    border: '#bae6fd',
    text: '#0c1e3a',
    text2: '#4a6d8c',
    accent: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0891b2 100%)',
    previewColors: ['#dbeafe', '#e0f7fa', '#bae6fd'],
    groupColors: ['#dbeafe', '#ccfbf1', '#cffafe', '#e0f2fe'],
  },
  {
    name: 'Forest',
    mode: 'light',
    bg: '#f0fdf4',
    surface: '#ffffff',
    surface2: '#dcfce7',
    border: '#bbf7d0',
    text: '#052e16',
    text2: '#4a7c59',
    accent: '#16a34a',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
    previewColors: ['#dcfce7', '#d1fae5', '#a7f3d0'],
    groupColors: ['#dcfce7', '#d1fae5', '#d9f99d', '#bbf7d0'],
  },
  {
    name: 'Sunset',
    mode: 'light',
    bg: '#fffbf0',
    surface: '#ffffff',
    surface2: '#fef3c7',
    border: '#fde68a',
    text: '#1c1009',
    text2: '#92400e',
    accent: '#d97706',
    gradient: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
    previewColors: ['#fef3c7', '#fce7f3', '#fde68a'],
    groupColors: ['#ffe4e6', '#fef3c7', '#fed7aa', '#fecdd3'],
  },
  {
    name: 'Lavender',
    mode: 'light',
    bg: '#faf5ff',
    surface: '#ffffff',
    surface2: '#f3e8ff',
    border: '#e9d5ff',
    text: '#1a0a2e',
    text2: '#7e5aa2',
    accent: '#9333ea',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
    previewColors: ['#f3e8ff', '#fce7f3', '#e9d5ff'],
    groupColors: ['#f3e8ff', '#fce7f3', '#e9d5ff', '#ede9fe'],
  },
  {
    name: 'Nord',
    mode: 'light',
    bg: '#eceff4',
    surface: '#ffffff',
    surface2: '#e5e9f0',
    border: '#d8dee9',
    text: '#2e3440',
    text2: '#4c566a',
    accent: '#5e81ac',
    gradient: 'linear-gradient(135deg, #5e81ac 0%, #81a1c1 100%)',
    previewColors: ['#e5e9f0', '#d8dee9', '#5e81ac'],
    groupColors: ['#e5e9f0', '#d8dee9', '#dbe4ee', '#eceff4'],
  },
  {
    name: 'Mono',
    mode: 'light',
    bg: '#f8f9fa',
    surface: '#ffffff',
    surface2: '#f1f3f5',
    border: '#dee2e6',
    text: '#212529',
    text2: '#6c757d',
    accent: '#343a40',
    gradient: 'linear-gradient(135deg, #343a40 0%, #495057 100%)',
    previewColors: ['#f1f3f5', '#e9ecef', '#dee2e6'],
    groupColors: ['#f8fafc', '#f1f5f9', '#f5f5f5', '#e2e8f0'],
  },
]

interface ThemeContextType {
  theme: ThemeDefinition
  setThemeByName: (name: string) => void
}

export const ThemeContext = createContext<ThemeContextType>({ theme: THEMES[0], setThemeByName: () => {} })

export const useTheme = () => useContext(ThemeContext)
