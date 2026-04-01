export type ConceptSceneSource = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  keywords?: string[];
  visualMotifs?: string[];
  definition?: string;
  whyItMatters?: string;
  debate?: string;
  related?: string[];
};

export type Vec3 = [number, number, number];

export type SceneObjectKind =
  | 'plinth'
  | 'core'
  | 'barrier'
  | 'ring'
  | 'plate'
  | 'shell'
  | 'terrain'
  | 'beam'
  | 'marker';

export type SceneObject = {
  id: string;
  kind: SceneObjectKind;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  accent: string;
  opacity: number;
  roughness: number;
  glow: number;
};

export type ScenePalette = {
  background: string;
  surface: string;
  ink: string;
  accent: string;
  accentSoft: string;
  accentWarm: string;
  mist: string;
};

export type SceneCamera = {
  distance: number;
  pitch: number;
  yaw: number;
  zoom: number;
};

export type SceneMotion = {
  orbit: number;
  bob: number;
  drift: number;
  parallax: number;
};

export type SceneLighting = {
  ambient: number;
  key: number;
  rim: number;
};

export type ScenePoster = {
  title: string;
  subtitle: string;
  category: string;
  lines: string[];
};

export type SceneSpec = {
  version: 1;
  slug: string;
  title: string;
  category: string;
  summary: string;
  seed: number;
  palette: ScenePalette;
  camera: SceneCamera;
  motion: SceneMotion;
  lighting: SceneLighting;
  objects: SceneObject[];
  poster: ScenePoster;
};

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mix(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}

function hslToHex(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return `#${toHex(Math.round((r + m) * 255))}${toHex(Math.round((g + m) * 255))}${toHex(Math.round((b + m) * 255))}`;
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeWords(source: ConceptSceneSource) {
  const values = [
    source.title,
    source.category,
    source.summary,
    source.definition ?? '',
    source.whyItMatters ?? '',
    source.debate ?? '',
    ...(source.keywords ?? []),
    ...(source.visualMotifs ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return values
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function derivePalette(seed: number, source: ConceptSceneSource): ScenePalette {
  const category = source.category.toLowerCase();

  if (category.includes('law')) {
    return {
      background: '#f5f1e8',
      surface: '#fffdf8',
      ink: '#1b1b1b',
      accent: '#4b5f7a',
      accentSoft: '#b3c2d4',
      accentWarm: '#d6a16a',
      mist: '#e9e1d3',
    };
  }

  if (category.includes('policy')) {
    return {
      background: '#f3f6f8',
      surface: '#ffffff',
      ink: '#1e242c',
      accent: '#2f5aa8',
      accentSoft: '#b6c8ea',
      accentWarm: '#7b8ea6',
      mist: '#dee6ee',
    };
  }

  return {
    background: '#f5f3ef',
    surface: '#fffdfa',
    ink: '#191b1f',
    accent: seed % 2 === 0 ? '#126b66' : '#3d5f9b',
    accentSoft: '#b6d9d6',
    accentWarm: '#c79b5f',
    mist: '#e6ded2',
  };
}

function deriveMotifs(source: ConceptSceneSource) {
  const words = unique([
    ...(source.visualMotifs ?? []),
    ...(source.keywords ?? []).slice(0, 6),
    ...normalizeWords(source).slice(0, 10),
  ]);

  return words.slice(0, 8);
}

function makeObject(
  id: string,
  kind: SceneObjectKind,
  position: Vec3,
  rotation: Vec3,
  scale: Vec3,
  color: string,
  accent: string,
  opacity = 1,
  roughness = 0.55,
  glow = 0,
): SceneObject {
  return { id, kind, position, rotation, scale, color, accent, opacity, roughness, glow };
}

function buildSceneObjects(source: ConceptSceneSource, seed: number, palette: ScenePalette) {
  const rand = mulberry32(seed);
  const motifs = deriveMotifs(source);
  const category = source.category.toLowerCase();
  const objects: SceneObject[] = [];

  objects.push(
    makeObject(
      'plinth',
      'plinth',
      [0, -1.85, 0],
      [0, 0, 0],
      [4.8, 0.28, 4.8],
      palette.surface,
      palette.mist,
      1,
      0.85,
    ),
  );

  const coreHeight = 1.5 + rand() * 0.8;
  objects.push(
    makeObject(
      'core',
      'core',
      [0, -0.55 + rand() * 0.15, 0],
      [rand() * 0.12, rand() * 0.2, rand() * 0.08],
      [1.1 + rand() * 0.35, coreHeight, 1.1 + rand() * 0.35],
      palette.accent,
      palette.accentWarm,
      1,
      0.4,
      0.2,
    ),
  );

  objects.push(
    makeObject(
      'shell',
      'shell',
      [0, -0.25, 0],
      [0, rand() * 0.2, 0],
      [2.15 + rand() * 0.45, 2.15 + rand() * 0.3, 2.15 + rand() * 0.45],
      palette.accentSoft,
      palette.surface,
      0.42,
      0.3,
      0.1,
    ),
  );

  const ringCount = category.includes('law') ? 4 : category.includes('policy') ? 3 : 2;
  for (let index = 0; index < ringCount; index += 1) {
    const angle = (index / ringCount) * Math.PI * 2;
    const radius = 2.35 + rand() * 0.4;
    objects.push(
      makeObject(
        `ring-${index}`,
        'ring',
        [Math.cos(angle) * radius, -0.15 + rand() * 0.2, Math.sin(angle) * radius],
        [Math.PI / 2 + rand() * 0.12, angle, 0],
        [1.05 + rand() * 0.35, 1.05 + rand() * 0.2, 1.05 + rand() * 0.35],
        index % 2 === 0 ? palette.accentWarm : palette.accent,
        palette.surface,
        0.85,
        0.5,
        0.25,
      ),
    );
  }

  const barrierCount = Math.max(3, Math.min(6, (motifs.length % 5) + 3));
  for (let index = 0; index < barrierCount; index += 1) {
    const angle = (index / barrierCount) * Math.PI * 2 + rand() * 0.22;
    const radius = 2.9 + rand() * 0.35;
    const height = 1.45 + rand() * 0.95;
    objects.push(
      makeObject(
        `barrier-${index}`,
        'barrier',
        [Math.cos(angle) * radius, -0.85 + height / 2, Math.sin(angle) * radius],
        [0.04 * Math.sin(angle), angle + Math.PI / 2, 0.04 * Math.cos(angle)],
        [0.16 + rand() * 0.08, height, 0.28 + rand() * 0.1],
        index % 2 === 0 ? palette.mist : palette.surface,
        palette.accent,
        0.95,
        0.7,
        0.05,
      ),
    );
  }

  const plateCount = category.includes('economics') ? 4 : 3;
  for (let index = 0; index < plateCount; index += 1) {
    const angle = ((index + 1) / (plateCount + 1)) * Math.PI * 2;
    const x = Math.cos(angle) * (1.1 + rand() * 0.9);
    const z = Math.sin(angle) * (1.1 + rand() * 0.9);
    objects.push(
      makeObject(
        `plate-${index}`,
        'plate',
        [x, -1.05 + rand() * 0.3, z],
        [Math.PI / 2 + rand() * 0.15, angle / 2, rand() * 0.12],
        [1.6 + rand() * 0.5, 0.16 + rand() * 0.08, 0.95 + rand() * 0.25],
        index % 2 === 0 ? palette.surface : palette.mist,
        palette.accentWarm,
        0.86,
        0.7,
        0.02,
      ),
    );
  }

  const markerCount = Math.max(2, Math.min(5, motifs.length || 3));
  for (let index = 0; index < markerCount; index += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.1 + rand() * 1.25;
    objects.push(
      makeObject(
        `marker-${index}`,
        'marker',
        [Math.cos(angle) * radius, 0.1 + rand() * 0.8, Math.sin(angle) * radius],
        [rand() * 0.2, angle, rand() * 0.12],
        [0.18 + rand() * 0.07, 0.5 + rand() * 0.5, 0.18 + rand() * 0.07],
        index % 2 === 0 ? palette.accentWarm : palette.accentSoft,
        palette.surface,
        0.95,
        0.65,
        0.1,
      ),
    );
  }

  if (source.slug === 'terra-nullius') {
    objects.push(
      makeObject(
        'terrain',
        'terrain',
        [0, -1.6, 0],
        [Math.PI / 2.8, 0, 0],
        [5.7, 0.35, 4.8],
        palette.mist,
        palette.surface,
        0.95,
        0.9,
        0.02,
      ),
    );
  }

  if (source.slug === 'safetyism') {
    objects.push(
      makeObject(
        'beam',
        'beam',
        [-0.55, 0.55, -0.65],
        [0.15, 0.9, -0.12],
        [2.1, 0.16, 0.16],
        palette.accentSoft,
        palette.surface,
        0.88,
        0.45,
        0.15,
      ),
    );
  }

  return objects;
}

function buildPosterLines(source: ConceptSceneSource, motifs: string[]) {
  const base = source.summary
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const first = base[0] ?? source.definition ?? source.summary;
  const second = source.whyItMatters ?? base[1] ?? '';
  const third = source.debate ?? base[2] ?? '';

  return unique([first, second, third, ...motifs.slice(0, 3).map(sentenceCase)]).slice(0, 4);
}

export function buildConceptSceneSpec(source: ConceptSceneSource): SceneSpec {
  const seed = hashString([
    source.slug,
    source.title,
    source.category,
    source.summary,
    source.definition ?? '',
    source.whyItMatters ?? '',
    source.debate ?? '',
    ...(source.visualMotifs ?? []),
  ].join('::'));

  const palette = derivePalette(seed, source);
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const motifs = deriveMotifs(source);

  const camera: SceneCamera = {
    distance: 8.8 + rand() * 1.8,
    pitch: -0.22 + rand() * 0.14,
    yaw: 0.2 + rand() * 0.25,
    zoom: 1 + rand() * 0.06,
  };

  const motion: SceneMotion = {
    orbit: 0.08 + rand() * 0.08,
    bob: 0.05 + rand() * 0.06,
    drift: 0.12 + rand() * 0.1,
    parallax: 0.2 + rand() * 0.18,
  };

  const lighting: SceneLighting = {
    ambient: 0.35 + rand() * 0.12,
    key: 0.82 + rand() * 0.1,
    rim: 0.42 + rand() * 0.12,
  };

  return {
    version: 1,
    slug: source.slug,
    title: source.title,
    category: source.category,
    summary: source.summary,
    seed,
    palette,
    camera,
    motion,
    lighting,
    objects: buildSceneObjects(source, seed, palette),
    poster: {
      title: source.title,
      subtitle: source.category,
      category: source.category,
      lines: buildPosterLines(source, motifs),
    },
  };
}

export function buildConceptScenePoster(spec: SceneSpec) {
  const width = 1600;
  const height = 1000;
  const bg = spec.palette.background;
  const accent = spec.palette.accent;
  const accentSoft = spec.palette.accentSoft;
  const accentWarm = spec.palette.accentWarm;
  const mist = spec.palette.mist;
  const title = escapeXml(spec.poster.title);
  const subtitle = escapeXml(spec.poster.subtitle);
  const lines = spec.poster.lines.map((line, index) => {
    const y = 230 + index * 82;
    return `<text x="110" y="${y}" fill="${spec.palette.ink}" font-family="Source Serif 4, Georgia, serif" font-size="34" font-weight="500">${escapeXml(line)}</text>`;
  }).join('');

  const rings = Array.from({ length: 3 }, (_, index) => {
    const radius = 200 + index * 88;
    const alpha = mix(0.18, 0.42, index / 2);
    return `<ellipse cx="1140" cy="505" rx="${radius}" ry="${radius * 0.64}" fill="none" stroke="${accent}" stroke-opacity="${alpha}" stroke-width="${28 - index * 5}" transform="rotate(${-18 + index * 9} 1140 505)" />`;
  }).join('');

  const pillars = Array.from({ length: 5 }, (_, index) => {
    const x = 920 + index * 88;
    const h = 180 + ((index % 2 === 0 ? 1 : -1) * 28) + index * 8;
    return `<rect x="${x}" y="${520 - h}" width="34" height="${h}" rx="14" fill="${index % 2 === 0 ? accentWarm : accentSoft}" fill-opacity="${0.82 - index * 0.08}" transform="skewY(-8)" />`;
  }).join('');

  const core = `
    <g transform="translate(1160 520)">
      <circle r="165" fill="${accent}" fill-opacity="0.18" />
      <circle r="108" fill="${accentWarm}" fill-opacity="0.58" />
      <circle r="74" fill="${spec.palette.surface}" fill-opacity="0.9" />
      <rect x="-42" y="-140" width="84" height="280" rx="36" fill="${accent}" fill-opacity="0.76" />
    </g>
  `;

  const caption = `
    <text x="110" y="126" fill="${spec.palette.ink}" font-family="Source Sans 3, Arial, sans-serif" font-size="22" letter-spacing="0.22em" text-transform="uppercase">${subtitle}</text>
    <text x="108" y="184" fill="${spec.palette.ink}" font-family="Source Serif 4, Georgia, serif" font-size="86" font-weight="700">${title}</text>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(spec.poster.title)}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="${mist}" />
        </linearGradient>
        <radialGradient id="glow" cx="62%" cy="48%" r="42%">
          <stop offset="0%" stop-color="${accentSoft}" stop-opacity="0.65" />
          <stop offset="50%" stop-color="${accentWarm}" stop-opacity="0.28" />
          <stop offset="100%" stop-color="${accentWarm}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)" />
      <circle cx="1120" cy="500" r="330" fill="url(#glow)" />
      <circle cx="1120" cy="500" r="470" fill="${accentSoft}" fill-opacity="0.08" />
      <g opacity="0.92">${rings}</g>
      <g opacity="0.95">${pillars}</g>
      ${core}
      <rect x="96" y="600" width="760" height="3" fill="${accent}" fill-opacity="0.28" />
      <text x="110" y="662" fill="${spec.palette.ink}" font-family="Source Sans 3, Arial, sans-serif" font-size="28" letter-spacing="0.04em">${escapeXml(spec.poster.category)}</text>
      ${lines}
    </svg>
  `)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
