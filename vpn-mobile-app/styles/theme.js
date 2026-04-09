export const theme = {
  colors: {
    // Core backgrounds — near-black with slight blue tint
    background:              '#0a0a0a',
    surface:                 '#0a0a0a',
    onBackground:            '#f0f0f0',

    // Surface layers
    surfaceContainerLowest:  '#000000',
    surfaceContainerLow:     '#111111',
    surfaceContainerHigh:    '#1a1a1a',
    surfaceBright:           '#222222',
    surfaceVariant:          'rgba(30,30,30,0.8)',

    // NVIDIA-inspired green accent
    primary:                 '#76b900',   // NVIDIA green
    primaryContainer:        '#8fd400',
    primaryDim:              '#5c9000',
    secondary:               '#bff230',   // bright lime accent
    tertiary:                '#a7a7a7',
    error:                   '#e52020',

    // Text
    onSurface:               '#f0f0f0',
    onSurfaceVariant:        '#898989',
    outline:                 '#5e5e5e',
    outlineVariant:          'rgba(94,94,94,0.2)',
    surfaceTint:             '#76b900',

    // Gradients
    glassBlur:               20,
    linearGradient:          ['#76b900', '#5c9000'],
    gradientAngle:           135,
  },

  fonts: {
    display: 'Manrope_700Bold',
    headline: 'Manrope_700Bold',
    body: 'Inter_400Regular',
    label: 'Inter_400Regular',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    huge: 64,
  },

  roundness: {
    full: 9999,
    lg: 4,    // sharp corners — NVIDIA style
    md: 2,
    sm: 2,
  },
};
