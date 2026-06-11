const STAGES = {
  battlefield: {
    name: 'Battlefield',
    bgColor: '#1a1a2e',
    bgGradient: ['#1a1a2e', '#16213e', '#0f3460'],
    deathBounds: { left: -300, right: 1180, top: -400, bottom: 700 },
    spawnPoints: [
      { x: 200, y: 350 }, { x: 680, y: 350 }, { x: 440, y: 200 }, { x: 440, y: 480 }
    ],
    platforms: [
      // Main stage
      { x: 80, y: 500, w: 720, h: 30, type: 'solid', color: '#4a4e69' },
      // Left platform
      { x: 120, y: 380, w: 200, h: 18, type: 'passthrough', color: '#9a8c98' },
      // Right platform
      { x: 560, y: 380, w: 200, h: 18, type: 'passthrough', color: '#9a8c98' },
      // Top center platform
      { x: 320, y: 280, w: 200, h: 18, type: 'passthrough', color: '#c9ada7' },
    ],
    bgElements: [
      { type: 'star', x: 100, y: 80, r: 2 }, { type: 'star', x: 300, y: 50, r: 1.5 },
      { type: 'star', x: 550, y: 90, r: 2 }, { type: 'star', x: 700, y: 40, r: 1 },
      { type: 'star', x: 200, y: 160, r: 1.5 }, { type: 'star', x: 750, y: 130, r: 2 },
      { type: 'star', x: 50, y: 200, r: 1 }, { type: 'star', x: 830, y: 180, r: 1.5 },
    ]
  },

  skytemple: {
    name: 'Sky Temple',
    bgColor: '#0d1b2a',
    bgGradient: ['#0d1b2a', '#1b263b', '#415a77'],
    deathBounds: { left: -280, right: 1160, top: -400, bottom: 700 },
    spawnPoints: [
      { x: 180, y: 380 }, { x: 700, y: 380 }, { x: 440, y: 250 }, { x: 440, y: 480 }
    ],
    platforms: [
      // Main floor
      { x: 100, y: 510, w: 680, h: 30, type: 'solid', color: '#778da9' },
      // Left floating
      { x: 90, y: 395, w: 180, h: 18, type: 'passthrough', color: '#e0e1dd' },
      // Right floating
      { x: 610, y: 395, w: 180, h: 18, type: 'passthrough', color: '#e0e1dd' },
      // Center upper
      { x: 350, y: 300, w: 180, h: 18, type: 'passthrough', color: '#e0e1dd' },
      // Far sides (lower)
      { x: 30, y: 475, w: 100, h: 18, type: 'passthrough', color: '#b0b8c1' },
      { x: 750, y: 475, w: 100, h: 18, type: 'passthrough', color: '#b0b8c1' },
    ],
    bgElements: []
  }
};

const DEFAULT_STAGE = 'battlefield';
