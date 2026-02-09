// Configuration for 500 unique wedding gown generation
// 6 attribute dimensions with prompt-friendly descriptions

export interface NecklineConfig {
  name: string;
  slug: string;
  count: number;
  promptDescription: string;
  id?: string; // Will be populated from database
}

// 10 necklines × 50 gowns each = 500 total
export const NECKLINES: NecklineConfig[] = [
  {
    name: 'Sweetheart',
    slug: 'sweetheart',
    count: 50,
    promptDescription: 'sweetheart neckline with a romantic heart-shaped dip at the center',
  },
  {
    name: 'V-Neck',
    slug: 'v-neck',
    count: 50,
    promptDescription: 'elegant V-neck plunging neckline that elongates the torso',
  },
  {
    name: 'Off-Shoulder',
    slug: 'off-shoulder',
    count: 50,
    promptDescription: 'off-the-shoulder neckline sitting elegantly below the shoulders',
  },
  {
    name: 'Strapless',
    slug: 'strapless',
    count: 50,
    promptDescription: 'classic strapless neckline with a straight across cut',
  },
  {
    name: 'Halter',
    slug: 'halter',
    count: 50,
    promptDescription: 'halter neckline with straps wrapping around the neck',
  },
  {
    name: 'Illusion',
    slug: 'illusion',
    count: 50,
    promptDescription: 'illusion neckline with sheer fabric and delicate embellishments',
  },
  {
    name: 'Scoop',
    slug: 'scoop',
    count: 50,
    promptDescription: 'scoop neckline with a rounded U-shape cut',
  },
  {
    name: 'Square',
    slug: 'square',
    count: 50,
    promptDescription: 'square neckline with straight horizontal cut and right angles',
  },
  {
    name: 'High Neck',
    slug: 'high-neck',
    count: 50,
    promptDescription: 'high neck neckline covering the collarbone elegantly',
  },
  {
    name: 'Bateau',
    slug: 'bateau',
    count: 50,
    promptDescription: 'bateau boat neckline following the collarbone from shoulder to shoulder',
  },
];

// 8 silhouettes with prompt descriptions
export interface AttributeConfig {
  name: string;
  promptDescription: string;
}

export const SILHOUETTES: AttributeConfig[] = [
  { name: 'A-Line', promptDescription: 'A-line silhouette that flares gently from the waist' },
  { name: 'Ball Gown', promptDescription: 'dramatic ball gown silhouette with fitted bodice and full voluminous skirt' },
  { name: 'Mermaid', promptDescription: 'mermaid silhouette hugging the body and flaring at the knee' },
  { name: 'Trumpet', promptDescription: 'trumpet fit-and-flare silhouette fitted through the hips and flaring mid-thigh' },
  { name: 'Sheath', promptDescription: 'sleek sheath column silhouette following the natural body line' },
  { name: 'Empire', promptDescription: 'empire waist silhouette with raised waistline just below the bust' },
  { name: 'Tea-Length', promptDescription: 'tea-length midi silhouette falling between the knee and ankle' },
  { name: 'Jumpsuit', promptDescription: 'modern bridal jumpsuit with elegant wide-leg trousers' },
];

// 7 sleeve styles with prompt descriptions
export const SLEEVE_STYLES: AttributeConfig[] = [
  { name: 'Sleeveless', promptDescription: 'sleeveless design showing bare shoulders and arms' },
  { name: 'Cap Sleeve', promptDescription: 'delicate cap sleeves covering just the shoulder' },
  { name: 'Short Sleeve', promptDescription: 'short sleeves extending to mid-upper arm' },
  { name: '3/4 Sleeve', promptDescription: 'three-quarter length sleeves ending at the forearm' },
  { name: 'Long Sleeve', promptDescription: 'full-length fitted long sleeves extending to the wrist' },
  { name: 'Bell Sleeve', promptDescription: 'dramatic bell sleeves flaring from the elbow' },
  { name: 'Off-Shoulder Drape', promptDescription: 'draped off-shoulder sleeves framing the shoulders' },
];

// 7 train lengths with prompt descriptions
export const TRAIN_LENGTHS: AttributeConfig[] = [
  { name: 'No Train', promptDescription: 'floor-length hemline with no train' },
  { name: 'Sweep', promptDescription: 'subtle sweep train barely brushing the floor' },
  { name: 'Court', promptDescription: 'elegant court train extending 3 feet behind' },
  { name: 'Chapel', promptDescription: 'classic chapel train extending 4-5 feet behind' },
  { name: 'Cathedral', promptDescription: 'dramatic cathedral train extending 6-7 feet behind' },
  { name: 'Royal', promptDescription: 'majestic royal monarch train extending over 8 feet behind' },
  { name: 'Detachable', promptDescription: 'detachable overskirt train for versatile styling' },
];

// 11 fabrics with prompt descriptions
export const FABRICS: AttributeConfig[] = [
  { name: 'Lace', promptDescription: 'intricate French lace with delicate floral patterns' },
  { name: 'Tulle', promptDescription: 'ethereal soft tulle fabric with romantic layers' },
  { name: 'Satin', promptDescription: 'luxurious duchess satin with luminous sheen' },
  { name: 'Silk', promptDescription: 'flowing silk fabric with natural elegant drape' },
  { name: 'Chiffon', promptDescription: 'lightweight flowing chiffon fabric' },
  { name: 'Crepe', promptDescription: 'modern crepe fabric with subtle texture and clean lines' },
  { name: 'Organza', promptDescription: 'crisp sheer organza with structured volume' },
  { name: 'Mikado', promptDescription: 'structured mikado silk with beautiful sheen' },
  { name: 'Taffeta', promptDescription: 'crisp taffeta fabric with subtle shimmer' },
  { name: 'Glitter/Sequin', promptDescription: 'glamorous glitter tulle with sparkling sequin embellishments' },
  { name: 'Mixed', promptDescription: 'mixed fabric combination with lace bodice and tulle skirt' },
];

// 9 aesthetics with prompt descriptions
export const AESTHETICS: AttributeConfig[] = [
  { name: 'Classic', promptDescription: 'timeless classic bridal style with elegant simplicity' },
  { name: 'Modern', promptDescription: 'contemporary modern minimalist design with clean lines' },
  { name: 'Romantic', promptDescription: 'romantic style with soft flowing details and feminine touches' },
  { name: 'Bohemian', promptDescription: 'free-spirited bohemian style with relaxed effortless beauty' },
  { name: 'Glamorous', promptDescription: 'red-carpet glamorous style with luxurious embellishments' },
  { name: 'Vintage', promptDescription: 'vintage-inspired retro style with nostalgic charm' },
  { name: 'Sexy/Bold', promptDescription: 'bold sexy style with daring cuts and alluring details' },
  { name: 'Modest', promptDescription: 'elegant modest style with refined coverage and grace' },
  { name: 'Whimsical', promptDescription: 'whimsical fairy-tale style with playful enchanting details' },
];

// Style tags based on attribute combinations
export const STYLE_TAGS_MAP: Record<string, string[]> = {
  // Fabrics
  'lace': ['romantic', 'vintage', 'classic'],
  'tulle': ['romantic', 'princess', 'ethereal'],
  'satin': ['modern', 'minimalist', 'sleek'],
  'silk': ['elegant', 'luxurious', 'classic'],
  'chiffon': ['ethereal', 'flowy', 'romantic'],
  'crepe': ['modern', 'sleek', 'contemporary'],
  'organza': ['ethereal', 'delicate', 'romantic'],
  'mikado': ['structured', 'modern', 'elegant'],
  'taffeta': ['classic', 'structured', 'formal'],
  'glitter': ['glamorous', 'sparkle', 'bold'],
  'sequin': ['glamorous', 'sparkle', 'bold'],
  // Aesthetics
  'classic': ['timeless', 'elegant', 'traditional'],
  'modern': ['contemporary', 'sleek', 'minimalist'],
  'romantic': ['feminine', 'soft', 'dreamy'],
  'bohemian': ['relaxed', 'natural', 'free-spirited'],
  'glamorous': ['luxurious', 'bold', 'statement'],
  'vintage': ['retro', 'nostalgic', 'timeless'],
  'sexy': ['daring', 'alluring', 'bold'],
  'modest': ['refined', 'graceful', 'elegant'],
  'whimsical': ['playful', 'fairy-tale', 'enchanting'],
  // Silhouettes
  'ball gown': ['princess', 'dramatic', 'formal'],
  'mermaid': ['glamorous', 'fitted', 'dramatic'],
  'a-line': ['classic', 'flattering', 'versatile'],
  'sheath': ['sleek', 'modern', 'sophisticated'],
  'empire': ['romantic', 'flowing', 'elegant'],
  'jumpsuit': ['modern', 'trendy', 'unique'],
};

// Gown naming - elegant names for variety (expanded for 500 gowns)
export const GOWN_NAMES = [
  'Aurora', 'Bella', 'Celeste', 'Diana', 'Elena', 'Fiona', 'Grace', 'Harper',
  'Iris', 'Jasmine', 'Kate', 'Luna', 'Marina', 'Nadia', 'Olivia', 'Penelope',
  'Quinn', 'Rose', 'Sophia', 'Taylor', 'Uma', 'Violet', 'Willow', 'Xena',
  'Yasmine', 'Zara', 'Aria', 'Bianca', 'Camille', 'Dahlia', 'Eden', 'Flora',
  'Gaia', 'Haven', 'Ivy', 'Juniper', 'Kira', 'Layla', 'Mia', 'Nova',
  'Opal', 'Pearl', 'Reign', 'Stella', 'Thea', 'Unity', 'Vera', 'Winter',
  'Ximena', 'Yara', 'Zoe', 'Amara', 'Brielle', 'Clara', 'Daphne', 'Elara',
  'Freya', 'Gemma', 'Hazel', 'Isla', 'Jade', 'Kiara', 'Lila', 'Margot',
  'Natasha', 'Ophelia', 'Piper', 'Quincy', 'Raven', 'Sage', 'Tessa', 'Ursula',
  'Valerie', 'Wren', 'Xyla', 'Yvette', 'Zelda', 'Adele', 'Beatrix', 'Cordelia',
  'Delilah', 'Evangeline', 'Francesca', 'Genevieve', 'Henrietta', 'Imogen', 'Josephine',
  'Katerina', 'Lillian', 'Madeleine', 'Nicolette', 'Odette', 'Priscilla', 'Rosalind',
  'Seraphina', 'Theodora', 'Valentina', 'Wilhelmina', 'Alexandra', 'Bridget', 'Charlotte',
  'Dominique', 'Elizabeth', 'Florence', 'Gwendolyn', 'Helena', 'Isabella', 'Juliet',
  'Katherine', 'Lorraine', 'Margaret', 'Natalie', 'Octavia', 'Patricia', 'Rebecca',
  'Scarlett', 'Tabitha', 'Vanessa', 'Whitney', 'Anastasia', 'Beatrice', 'Cassandra',
  'Daniella', 'Emilia', 'Felicity', 'Gabriella', 'Harriet', 'Isadora', 'Jacqueline',
  'Kendall', 'Luciana', 'Miranda', 'Nicolina', 'Olympia', 'Portia', 'Ramona',
  'Simone', 'Tatiana', 'Veronica', 'Adelaide', 'Clarissa', 'Desiree',
  'Esmeralda', 'Francine', 'Giselle', 'Helene', 'Ingrid', 'Jacinta', 'Katalina',
  'Leonora', 'Melina', 'Nadine', 'Ottilie', 'Paloma', 'Rosanna', 'Susanna',
  'Thomasina', 'Winona', 'Xiomara', 'Yvonne', 'Zephyrine', 'Antoinette',
  'Bernadette', 'Clementine', 'Dorothea', 'Euphemia', 'Florentina', 'Georgiana', 'Henriette',
  // Additional names for 500 gowns
  'Alessandra', 'Bronwyn', 'Celestine', 'Darcy', 'Elodie', 'Fiora', 'Gianna', 'Honora',
  'Iliana', 'Jessamine', 'Keira', 'Liliana', 'Marisol', 'Noelle', 'Oriana', 'Petra',
  'Rosalie', 'Sabrina', 'Tallulah', 'Ursuline', 'Viviana', 'Waverly', 'Yolanda', 'Zinnia',
  'Aurelia', 'Brynne', 'Calista', 'Davina', 'Elspeth', 'Fernanda', 'Guinevere', 'Hyacinth',
  'Ione', 'Jovana', 'Kalliope', 'Lorelei', 'Melisande', 'Nerissa', 'Orla', 'Persephone',
  'Rhiannon', 'Solene', 'Tamsin', 'Undine', 'Venetia', 'Xiomara', 'Yseult', 'Zorah',
  'Arabella', 'Bryony', 'Cosima', 'Dagmar', 'Eloise', 'Faustina', 'Greer', 'Hermione',
  'Ianthe', 'Jocasta', 'Kerenza', 'Lavinia', 'Morgana', 'Nyx', 'Ottilia', 'Philomena',
  'Raphaela', 'Sidonie', 'Temperance', 'Ulrika', 'Violetta', 'Winifred', 'Xanthe', 'Yolande',
  'Amadea', 'Bellatrix', 'Calluna', 'Demelza', 'Eulalia', 'Fern', 'Gardenia', 'Hestia',
  'Io', 'Juno', 'Katriel', 'Liora', 'Meadow', 'Niamh', 'Odessa', 'Pandora',
  'Romilly', 'Serenity', 'Tanith', 'Una', 'Vesper', 'Wisteria', 'Yuki', 'Zara',
  'Anemone', 'Bliss', 'Celestia', 'Dream', 'Ever', 'Fable', 'Glory', 'Harmony',
  'Indigo', 'Journey', 'Kismet', 'Lark', 'Meadow', 'North', 'Ocean', 'Promise',
  'Quest', 'Radiance', 'Snow', 'True', 'Unity', 'Vale', 'Whisper', 'Zephyr',
  'Angel', 'Blossom', 'Crystal', 'Dove', 'Echo', 'Faith', 'Garnet', 'Hope',
  'Ivory', 'Joy', 'Liberty', 'Mercy', 'Noble', 'Patience', 'Ruby', 'Spirit',
  'Trinity', 'Velvet', 'Willow', 'Zelena', 'Amethyst', 'Blanche', 'Coral', 'Diamond',
  'Ember', 'Fawn', 'Goldie', 'Honey', 'Jewel', 'Lake', 'Maple', 'Neva',
  'Oasis', 'Phoenix', 'Rain', 'Saffron', 'Terra', 'Vega', 'Wren', 'Zinnia',
  'Azalea', 'Breeze', 'Cypress', 'Dahlia', 'Elm', 'Fern', 'Grove', 'Heather',
  'Iris', 'Jasper', 'Laurel', 'Magnolia', 'Olive', 'Peony', 'Reed', 'Sage',
  'Thistle', 'Violet', 'Willow', 'Yarrow', 'Astrid', 'Birgit', 'Calla', 'Delia',
  'Estelle', 'Fleur', 'Greta', 'Hilde', 'Ines', 'Josefa', 'Kirsten', 'Lotte',
  'Maren', 'Noor', 'Ottavia', 'Pia', 'Romy', 'Signe', 'Tove', 'Ulla', 'Vilma',
  'Wanda', 'Xenia', 'Ylva', 'Zita', 'Alix', 'Britt', 'Carys', 'Dilys', 'Eira',
  'Ffion', 'Glynis', 'Hafwen', 'Idris', 'Jenna', 'Keelin', 'Luned', 'Morwen',
  'Nerys', 'Olwen', 'Rhosyn', 'Seren', 'Tanwen', 'Venetia', 'Wynne',
];

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getStyleTags(
  fabric: string,
  aesthetic: string,
  silhouette: string
): string[] {
  const tags: string[] = [];
  const searchTerms = [
    fabric.toLowerCase(),
    aesthetic.toLowerCase(),
    silhouette.toLowerCase(),
  ];

  for (const term of searchTerms) {
    for (const [keyword, styleTags] of Object.entries(STYLE_TAGS_MAP)) {
      if (term.includes(keyword)) {
        tags.push(...styleTags);
      }
    }
  }

  // Deduplicate
  return Array.from(new Set(tags));
}
