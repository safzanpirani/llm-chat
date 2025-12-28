// SVG Benchmark prompt library
// Categories: classic landmarks, abstract concepts, technical, nature, impossible objects, symbols

export interface SVGPrompt {
  id: string
  category: string
  name: string
  prompt: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  description?: string
}

export const SVG_PROMPTS: SVGPrompt[] = [
  // Classic landmarks
  {
    id: 'pelican',
    category: 'animals',
    name: 'Pelican',
    prompt: 'Draw a pelican in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'easy',
    description: 'Classic LLM SVG benchmark - tests basic animal shape understanding',
  },
  {
    id: 'golden-gate',
    category: 'landmarks',
    name: 'Golden Gate Bridge',
    prompt: 'Draw the Golden Gate Bridge in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Iconic suspension bridge - tests structural understanding',
  },
  {
    id: 'nyc-skyline',
    category: 'landmarks',
    name: 'New York Skyline',
    prompt: 'Draw the New York City skyline in SVG, including recognizable buildings like the Empire State Building. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Multiple buildings with varying heights and details',
  },
  {
    id: 'taj-mahal',
    category: 'landmarks',
    name: 'Taj Mahal',
    prompt: 'Draw the Taj Mahal in SVG with its distinctive dome and minarets. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Symmetrical architecture with domes and towers',
  },
  {
    id: 'eiffel-tower',
    category: 'landmarks',
    name: 'Eiffel Tower',
    prompt: 'Draw the Eiffel Tower in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Lattice structure tower - tests geometric patterns',
  },
  {
    id: 'great-wall',
    category: 'landmarks',
    name: 'Great Wall of China',
    prompt: 'Draw a section of the Great Wall of China winding through mountains in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Wall following terrain - tests perspective and depth',
  },
  {
    id: 'sydney-opera',
    category: 'landmarks',
    name: 'Sydney Opera House',
    prompt: 'Draw the Sydney Opera House with its distinctive sail-shaped roof in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Curved shell structures - tests organic shapes',
  },
  {
    id: 'colosseum',
    category: 'landmarks',
    name: 'Roman Colosseum',
    prompt: 'Draw the Roman Colosseum in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Circular amphitheater with arches - tests repetition and perspective',
  },

  // Animals
  {
    id: 'elephant',
    category: 'animals',
    name: 'Elephant',
    prompt: 'Draw an elephant in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'easy',
  },
  {
    id: 'butterfly',
    category: 'animals',
    name: 'Butterfly',
    prompt: 'Draw a butterfly with symmetrical wing patterns in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Tests symmetry and pattern generation',
  },
  {
    id: 'octopus',
    category: 'animals',
    name: 'Octopus',
    prompt: 'Draw an octopus with all eight tentacles visible in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Multiple curved appendages - tests complex organic forms',
  },

  // Abstract concepts
  {
    id: 'happiness',
    category: 'abstract',
    name: 'Happiness',
    prompt: 'Create an abstract SVG representation of happiness. Use colors, shapes, and composition to convey the emotion. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
    description: 'Abstract emotional representation - tests creative interpretation',
  },
  {
    id: 'time-passing',
    category: 'abstract',
    name: 'Time Passing',
    prompt: 'Create an abstract SVG that represents the concept of time passing. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
  },
  {
    id: 'music-visualization',
    category: 'abstract',
    name: 'Music',
    prompt: 'Create an SVG that visually represents music or a melody. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },
  {
    id: 'chaos-order',
    category: 'abstract',
    name: 'Chaos to Order',
    prompt: 'Create an SVG that shows a transition from chaos on the left to order on the right. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
  },

  // Technical diagrams
  {
    id: 'circuit-board',
    category: 'technical',
    name: 'Circuit Board',
    prompt: 'Draw a section of a circuit board with traces, components, and connection points in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },
  {
    id: 'flowchart',
    category: 'technical',
    name: 'Flowchart',
    prompt: 'Draw a flowchart for a simple login process (start, input credentials, validate, success/failure branches, end) in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'dna-helix',
    category: 'technical',
    name: 'DNA Double Helix',
    prompt: 'Draw a DNA double helix structure in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Twisted ladder structure - tests 3D representation in 2D',
  },
  {
    id: 'atom-model',
    category: 'technical',
    name: 'Atom Model',
    prompt: 'Draw a Bohr model of an atom with nucleus and electron orbits in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },

  // Natural phenomena
  {
    id: 'aurora',
    category: 'nature',
    name: 'Aurora Borealis',
    prompt: 'Draw the Northern Lights (Aurora Borealis) over a mountain landscape in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
    description: 'Gradient colors and flowing shapes',
  },
  {
    id: 'ocean-wave',
    category: 'nature',
    name: 'Ocean Wave',
    prompt: 'Draw a large ocean wave, like the Great Wave off Kanagawa style, in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },
  {
    id: 'solar-eclipse',
    category: 'nature',
    name: 'Solar Eclipse',
    prompt: 'Draw a solar eclipse with corona visible in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'tree-seasons',
    category: 'nature',
    name: 'Four Seasons Tree',
    prompt: 'Draw a tree showing all four seasons (spring, summer, fall, winter) in one image in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
  },

  // Impossible objects
  {
    id: 'penrose-triangle',
    category: 'impossible',
    name: 'Penrose Triangle',
    prompt: 'Draw a Penrose triangle (impossible triangle) in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Classic impossible object - tests understanding of visual paradoxes',
  },
  {
    id: 'escher-stairs',
    category: 'impossible',
    name: 'Escher Stairs',
    prompt: 'Draw an Escher-style impossible staircase that loops infinitely in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
  },
  {
    id: 'impossible-cube',
    category: 'impossible',
    name: 'Impossible Cube',
    prompt: 'Draw an impossible cube (Necker cube variant) in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },

  // Logos and symbols
  {
    id: 'yin-yang',
    category: 'symbols',
    name: 'Yin Yang',
    prompt: 'Draw a yin yang symbol in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'easy',
  },
  {
    id: 'peace-sign',
    category: 'symbols',
    name: 'Peace Sign',
    prompt: 'Draw a peace sign symbol in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'easy',
  },
  {
    id: 'recycling',
    category: 'symbols',
    name: 'Recycling Symbol',
    prompt: 'Draw the recycling symbol (three chasing arrows) in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
    description: 'Interlocking arrows - tests understanding of Möbius-like forms',
  },
  {
    id: 'olympic-rings',
    category: 'symbols',
    name: 'Olympic Rings',
    prompt: 'Draw the Olympic rings with correct colors and interlocking pattern in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'celtic-knot',
    category: 'symbols',
    name: 'Celtic Knot',
    prompt: 'Draw a Celtic knot pattern in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },

  // Objects
  {
    id: 'bicycle',
    category: 'objects',
    name: 'Bicycle',
    prompt: 'Draw a bicycle in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'hourglass',
    category: 'objects',
    name: 'Hourglass',
    prompt: 'Draw an hourglass with sand flowing in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'chess-knight',
    category: 'objects',
    name: 'Chess Knight',
    prompt: 'Draw a chess knight piece in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'origami-crane',
    category: 'objects',
    name: 'Origami Crane',
    prompt: 'Draw an origami paper crane in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },

  // Scenes
  {
    id: 'campfire',
    category: 'scenes',
    name: 'Campfire Scene',
    prompt: 'Draw a campfire scene with flames, logs, and stars in the night sky in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'underwater',
    category: 'scenes',
    name: 'Underwater Scene',
    prompt: 'Draw an underwater ocean scene with fish, coral, and bubbles in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'hard',
  },
  {
    id: 'space-scene',
    category: 'scenes',
    name: 'Space Scene',
    prompt: 'Draw a space scene with planets, stars, and a rocket ship in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },

  // Faces and expressions
  {
    id: 'human-face',
    category: 'faces',
    name: 'Human Face',
    prompt: 'Draw a realistic human face with proper proportions in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
    description: 'Tests understanding of human anatomy and proportions',
  },
  {
    id: 'cat-face',
    category: 'faces',
    name: 'Cat Face',
    prompt: 'Draw a cat face with whiskers and expressive eyes in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'easy',
  },

  // Text and typography
  {
    id: 'stylized-letter',
    category: 'typography',
    name: 'Stylized Letter A',
    prompt: 'Draw a highly stylized, decorative letter "A" in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'medium',
  },
  {
    id: 'ambigram',
    category: 'typography',
    name: 'Ambigram',
    prompt: 'Create an ambigram of the word "HELLO" that reads the same upside down in SVG. Output only valid SVG code, nothing else.',
    difficulty: 'extreme',
  },
]

export const PROMPT_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'landmarks', name: 'Landmarks' },
  { id: 'animals', name: 'Animals' },
  { id: 'abstract', name: 'Abstract' },
  { id: 'technical', name: 'Technical' },
  { id: 'nature', name: 'Nature' },
  { id: 'impossible', name: 'Impossible Objects' },
  { id: 'symbols', name: 'Symbols' },
  { id: 'objects', name: 'Objects' },
  { id: 'scenes', name: 'Scenes' },
  { id: 'faces', name: 'Faces' },
  { id: 'typography', name: 'Typography' },
]

export const DIFFICULTY_COLORS = {
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-orange-500',
  extreme: 'bg-red-500',
}
