// Codename Generator - Creates memorable, unique identifiers for peers
// Format: [Adjective][Noun]-[4 digit code]

const ADJECTIVES = [
  // Tech/Cyber
  'Neon', 'Cyber', 'Digital', 'Quantum', 'Neural', 'Phantom', 'Shadow', 'Ghost',
  'Stealth', 'Silent', 'Swift', 'Rapid', 'Hyper', 'Ultra', 'Mega', 'Turbo',
  // Colors
  'Crimson', 'Azure', 'Emerald', 'Violet', 'Obsidian', 'Silver', 'Golden', 'Onyx',
  'Cobalt', 'Scarlet', 'Ivory', 'Amber', 'Jade', 'Ruby', 'Sapphire', 'Bronze',
  // Nature
  'Frozen', 'Blazing', 'Thunder', 'Storm', 'Cosmic', 'Solar', 'Lunar', 'Nova',
  'Arctic', 'Desert', 'Ocean', 'Crystal', 'Iron', 'Steel', 'Titan', 'Electric',
  // Mysterious
  'Hidden', 'Secret', 'Mystic', 'Rogue', 'Apex', 'Prime', 'Alpha', 'Omega',
  'Zero', 'Delta', 'Echo', 'Bravo', 'Cipher', 'Vector', 'Matrix', 'Nexus'
];

const NOUNS = [
  // Animals
  'Wolf', 'Falcon', 'Phoenix', 'Dragon', 'Panther', 'Viper', 'Hawk', 'Eagle',
  'Tiger', 'Cobra', 'Raven', 'Shark', 'Lion', 'Bear', 'Fox', 'Lynx',
  // Tech
  'Node', 'Core', 'Proxy', 'Daemon', 'Agent', 'Pulse', 'Signal', 'Wave',
  'Beam', 'Link', 'Grid', 'Hub', 'Port', 'Gate', 'Relay', 'Spark',
  // Objects
  'Blade', 'Shield', 'Arrow', 'Bolt', 'Sphere', 'Prism', 'Shard', 'Forge',
  'Vault', 'Tower', 'Beacon', 'Anchor', 'Crown', 'Star', 'Comet', 'Orbit',
  // Abstract
  'Spirit', 'Spectre', 'Wraith', 'Shade', 'Sentinel', 'Guardian', 'Warden', 'Ranger',
  'Hunter', 'Seeker', 'Voyager', 'Pioneer', 'Nomad', 'Drifter', 'Runner', 'Striker'
];

// Generate a random 4-digit code
const generateCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Get random item from array
const randomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Generate a unique codename
export const generateCodename = (): string => {
  const adjective = randomItem(ADJECTIVES);
  const noun = randomItem(NOUNS);
  const code = generateCode();
  return `${adjective}${noun}-${code}`;
};

// Generate a short codename (no number suffix)
export const generateShortCodename = (): string => {
  const adjective = randomItem(ADJECTIVES);
  const noun = randomItem(NOUNS);
  return `${adjective}${noun}`;
};

// Generate codename from a seed (for consistent names based on peer ID)
export const generateCodenameFromSeed = (seed: string): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const adjIndex = Math.abs(hash) % ADJECTIVES.length;
  const nounIndex = Math.abs(hash >> 8) % NOUNS.length;
  const code = Math.abs(hash % 9000) + 1000;
  
  return `${ADJECTIVES[adjIndex]}${NOUNS[nounIndex]}-${code}`;
};

// Get just the display part (without the code) from a peer ID
export const getDisplayName = (peerId: string): string => {
  // If it's already a codename format, extract the name part
  if (peerId.includes('-') && /[A-Z][a-z]+[A-Z][a-z]+-\d{4}/.test(peerId)) {
    return peerId.split('-')[0];
  }
  // Otherwise generate from the peer ID
  return generateCodenameFromSeed(peerId).split('-')[0];
};

// Validate if a string is a valid codename
export const isValidCodename = (name: string): boolean => {
  return /^[A-Z][a-z]+[A-Z][a-z]+-\d{4}$/.test(name);
};

export default {
  generateCodename,
  generateShortCodename,
  generateCodenameFromSeed,
  getDisplayName,
  isValidCodename,
  ADJECTIVES,
  NOUNS
};
