// Icons from Lucide React that can be used in smart-layout cells
export const AVAILABLE_ICONS = [
  // Communication
  'MessageCircle',
  'Mail',
  'Phone',
  'Send',
  'Megaphone',
  'MessagesSquare',
  // Security
  'Shield',
  'Lock',
  'Key',
  'ShieldCheck',
  'Eye',
  'EyeOff',
  // Objectives
  'Target',
  'Flag',
  'Award',
  'Trophy',
  'Star',
  'CheckCircle',
  // People
  'User',
  'Users',
  'UserCheck',
  'UserPlus',
  'Heart',
  'HandHeart',
  // Time
  'Clock',
  'Calendar',
  'Timer',
  'Hourglass',
  'History',
  'CalendarCheck',
  // Finance
  'DollarSign',
  'CreditCard',
  'Wallet',
  'PiggyBank',
  'TrendingUp',
  'TrendingDown',
  // Media
  'Image',
  'Video',
  'Music',
  'Camera',
  'Film',
  'Mic',
  // Technology
  'Laptop',
  'Smartphone',
  'Monitor',
  'Cpu',
  'Database',
  'Cloud',
  // Organisation
  'Building',
  'Briefcase',
  'FolderOpen',
  'FileText',
  'Clipboard',
  'LayoutGrid',
  // Travel
  'Plane',
  'Car',
  'MapPin',
  'Compass',
  'Globe',
  'Navigation',
  // Health
  'Activity',
  'HeartPulse',
  'Stethoscope',
  'Pill',
  'Thermometer',
  'Brain',
  // Learning
  'GraduationCap',
  'Book',
  'BookOpen',
  'Lightbulb',
  'Puzzle',
  'Pen',
  // General
  'Settings',
  'Wrench',
  'Rocket',
  'Zap',
  'Sparkles',
  'ArrowRight',
];

export const FIND_ICONS_PROMPT = `Tu es un expert en design et en selection d'icones. Ta mission est de trouver les icones les plus appropriees pour chaque element d'une liste dans une slide.

# Elements de la liste
{{listItems}}

# Icones disponibles (Lucide React)
${AVAILABLE_ICONS.join(', ')}

# Instructions

Pour chaque element de la liste, selectionne l'icone la plus representative :

1. **Analyse le contenu** :
   - Lis le subtitle et le content de chaque element
   - Identifie le theme ou concept principal

2. **Selectionne l'icone** :
   - Choisis une icone qui represente visuellement le concept
   - Privilegiie la clarte et la comprehension immediate
   - Evite les icones trop generiques si une plus specifique existe

3. **Coherence** :
   - Les icones doivent former un ensemble coherent visuellement
   - Evite de repeter la meme icone pour des elements differents

# Format de sortie

Pour chaque element, retourne :
- index: position dans la liste (0, 1, 2...)
- icon: nom exact de l'icone Lucide

Exemple:
\`\`\`json
{
  "icons": [
    { "index": 0, "icon": "Target" },
    { "index": 1, "icon": "Users" },
    { "index": 2, "icon": "TrendingUp" }
  ]
}
\`\`\`
`;

export function buildFindIconsPrompt(listItems: Array<{ subtitle: string; content: string }>): string {
  return FIND_ICONS_PROMPT.replace(
    '{{listItems}}',
    JSON.stringify(listItems, null, 2)
  );
}
