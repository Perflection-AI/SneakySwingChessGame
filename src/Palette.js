const Palette = {
  white: '#FFFFFF',
  black: '#000000',

  red: {
    300: '#FEF2F2',
    500: '#F8A282',
    700: '#EF4444',
  },
  yellow: {
    300: '#FBF8EE',
    500: '#FFE99F',
    700: '#A88D37',
  },
  green: {
    300: '#E8F3D8',
    500: '#B8D085',
    700: '#719342',
  },
  gray: {
    100: '#F2F2F2',
    300: '#CDCDCD',
    500: '#828282',
    700: '#4E4E4E',
  },
  blue: {
    300: '#F3F9FF',
    500: '#88E2E0',
    700: '#008BFF',
  },

  brand: {
    primary: '#719241',
  },
  status: {
    success: '#B8D085',
    error: '#EF4444',
    info: '#008BFF',
  },

  effect: {
    player_stat:  { base: '#008BFF', bg: 'rgba(0,139,255,0.15)',  border: 'rgba(0,139,255,0.5)',  text: '#008BFF', solidBg: '#EBF5FF', label: 'STAT' },
    weather:      { base: '#D97706', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', text: '#D97706', solidBg: '#FFF8E1', label: 'WEATHER' },
    animal_event: { base: '#059669', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.5)', text: '#059669', solidBg: '#ECFDF5', label: 'ANIMAL' },
    brainrot_meta:{ base: '#7C3AED', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.5)', text: '#7C3AED', solidBg: '#F3E8FF', label: 'BRAINROT' },
  },

  outcome: {
    holed: '#4CAF50',
    miracle: '#4CAF50',
    pinseeker: '#4CAF50',
    great: '#719342',
    good: '#719342',
    clean: '#719342',
    okay: '#C49A2A',
    missed: '#D97706',
    bad: '#EF4444',
  },
}

export default Palette
