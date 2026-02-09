export interface Dress {
  id: string;
  name: string;
  category: string;
  image: string;
  isPro: boolean;
}

export interface DressCategory {
  id: string;
  name: string;
  emoji: string;
  dresses: Dress[];
}

export const dressCategories: DressCategory[] = [
  {
    id: 'aline',
    name: 'A-Line',
    emoji: '✨',
    dresses: [
      { id: 'a1', name: 'Aurora', category: 'aline', image: '/dresses/aline-1.jpg', isPro: false },
      { id: 'a2', name: 'Bella', category: 'aline', image: '/dresses/aline-2.jpg', isPro: false },
      { id: 'a3', name: 'Celeste', category: 'aline', image: '/dresses/aline-1.jpg', isPro: true },
      { id: 'a4', name: 'Diana', category: 'aline', image: '/dresses/aline-2.jpg', isPro: true },
      { id: 'a5', name: 'Elena', category: 'aline', image: '/dresses/aline-1.jpg', isPro: true },
      { id: 'a6', name: 'Fiona', category: 'aline', image: '/dresses/aline-2.jpg', isPro: true },
    ],
  },
  {
    id: 'ballgown',
    name: 'Ball Gown',
    emoji: '👑',
    dresses: [
      { id: 'b1', name: 'Grace', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: false },
      { id: 'b2', name: 'Harper', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: false },
      { id: 'b3', name: 'Iris', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: true },
      { id: 'b4', name: 'Jasmine', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: true },
      { id: 'b5', name: 'Kate', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: true },
      { id: 'b6', name: 'Luna', category: 'ballgown', image: '/dresses/ballgown-1.jpg', isPro: true },
    ],
  },
  {
    id: 'mermaid',
    name: 'Mermaid',
    emoji: '🧜‍♀️',
    dresses: [
      { id: 'm1', name: 'Marina', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: false },
      { id: 'm2', name: 'Nadia', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: false },
      { id: 'm3', name: 'Olivia', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: true },
      { id: 'm4', name: 'Penelope', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: true },
      { id: 'm5', name: 'Quinn', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: true },
      { id: 'm6', name: 'Rose', category: 'mermaid', image: '/dresses/mermaid-1.jpg', isPro: true },
    ],
  },
  {
    id: 'sheath',
    name: 'Sheath',
    emoji: '💫',
    dresses: [
      { id: 's1', name: 'Sophia', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: false },
      { id: 's2', name: 'Taylor', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: false },
      { id: 's3', name: 'Uma', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: true },
      { id: 's4', name: 'Violet', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: true },
      { id: 's5', name: 'Willow', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: true },
      { id: 's6', name: 'Xena', category: 'sheath', image: '/dresses/sheath-1.jpg', isPro: true },
    ],
  },
  {
    id: 'tea',
    name: 'Tea Length',
    emoji: '🌸',
    dresses: [
      { id: 't1', name: 'Yasmine', category: 'tea', image: '/dresses/tea-1.jpg', isPro: false },
      { id: 't2', name: 'Zara', category: 'tea', image: '/dresses/tea-1.jpg', isPro: false },
      { id: 't3', name: 'Aria', category: 'tea', image: '/dresses/tea-1.jpg', isPro: true },
      { id: 't4', name: 'Bianca', category: 'tea', image: '/dresses/tea-1.jpg', isPro: true },
      { id: 't5', name: 'Camille', category: 'tea', image: '/dresses/tea-1.jpg', isPro: true },
      { id: 't6', name: 'Dahlia', category: 'tea', image: '/dresses/tea-1.jpg', isPro: true },
    ],
  },
  {
    id: 'boho',
    name: 'Bohemian',
    emoji: '🌿',
    dresses: [
      { id: 'bo1', name: 'Eden', category: 'boho', image: '/dresses/boho-1.jpg', isPro: false },
      { id: 'bo2', name: 'Flora', category: 'boho', image: '/dresses/boho-1.jpg', isPro: false },
      { id: 'bo3', name: 'Gaia', category: 'boho', image: '/dresses/boho-1.jpg', isPro: true },
      { id: 'bo4', name: 'Haven', category: 'boho', image: '/dresses/boho-1.jpg', isPro: true },
      { id: 'bo5', name: 'Ivy', category: 'boho', image: '/dresses/boho-1.jpg', isPro: true },
      { id: 'bo6', name: 'Juniper', category: 'boho', image: '/dresses/boho-1.jpg', isPro: true },
    ],
  },
];
