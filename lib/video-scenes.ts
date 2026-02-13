/**
 * Video Scene Configuration
 * 5 romantic backgrounds users can choose for their video generation
 */

export interface VideoScene {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  prompt: string;
}

export const VIDEO_SCENES: VideoScene[] = [
  {
    id: 'paris',
    name: 'Paris Balcony',
    description: 'Eiffel Tower backdrop',
    thumbnail: '/video-scenes/paris.jpg',
    prompt: `The woman in the image is standing on a romantic Parisian balcony with the iconic Eiffel Tower visible in the background. She performs a graceful slow spin, her elegant dress flowing beautifully as she turns. Her hair moves gently in the breeze.

The setting is golden hour in Paris, warm sunlight casting a romantic glow. Ornate wrought iron balcony railing with flowers. The Eiffel Tower stands majestically in the distance against a soft cloudy sky.

Her expression is joyful and dreamy. The camera is static, capturing her full body and the stunning Paris backdrop.`,
  },
  {
    id: 'garden',
    name: 'Flower Garden',
    description: 'Roses and greenery',
    thumbnail: '/video-scenes/garden.jpg',
    prompt: `The woman in the image is standing in a beautiful romantic flower garden filled with roses, peonies, and soft greenery. She performs a graceful slow spin, her elegant dress flowing and catching the sunlight as she turns. Her hair moves gently with the movement.

The setting is a lush garden at golden hour with soft warm sunlight filtering through. Pink and white roses surround her, creating a dreamy romantic atmosphere.

Her expression is joyful and serene, like a bride on her wedding day. The camera is static, capturing her full body and the beautiful floral surroundings.`,
  },
  {
    id: 'tuscany',
    name: 'Tuscany',
    description: 'Italian vineyard sunset',
    thumbnail: '/video-scenes/tuscany.jpg',
    prompt: `The woman in the image is standing in a beautiful Tuscan vineyard at sunset. She performs a graceful slow spin, her elegant dress flowing as she turns. Her hair moves gently in the warm Italian breeze.

The setting is rolling Tuscan hills with rows of grapevines, cypress trees in the distance, and a warm golden sunset painting the sky in oranges and pinks. The grass sways gently. An old Italian villa is visible in the distance.

Her expression is serene and romantic, enjoying the peaceful Italian countryside. The camera is static, capturing her full body and the stunning Tuscany landscape.`,
  },
  {
    id: 'cancun',
    name: 'Cancun Beach',
    description: 'Caribbean paradise',
    thumbnail: '/video-scenes/cancun.jpg',
    prompt: `The woman in the image is standing on a pristine white sand beach in Cancun, Mexico. She performs a graceful slow spin, her elegant dress flowing dramatically in the Caribbean breeze. Her hair dances in the tropical wind.

The setting is a stunning Caribbean beach with powdery white sand, crystal clear turquoise water, and gentle waves lapping at the shore. Palm trees sway in the background. The sky is bright blue with fluffy white clouds.

Her expression is joyful and carefree, like a tropical paradise dream. The camera is static, capturing her full body and the beautiful Caribbean beach scene.`,
  },
  {
    id: 'san-juan',
    name: 'San Juan',
    description: 'Colorful streets',
    thumbnail: '/video-scenes/san-juan.jpg',
    prompt: `The woman in the image is standing on a charming cobblestone street in Old San Juan, Puerto Rico. She performs a graceful slow spin, her elegant dress flowing as she turns. Her hair moves softly.

The setting is the colorful historic streets of Old San Juan with vibrant pastel-colored colonial buildings in pink, yellow, blue, and orange. Wrought iron balconies with flowers. Warm golden hour light illuminates the romantic scene.

Her expression is warm and romantic, enchanted by the colorful surroundings. The camera is static, capturing her full body and the picturesque Puerto Rican streetscape.`,
  },
];

export const VIDEO_NEGATIVE_PROMPT =
  'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background, gray background';

export function getSceneById(id: string): VideoScene | undefined {
  return VIDEO_SCENES.find((scene) => scene.id === id);
}
