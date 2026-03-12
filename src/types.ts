export interface WordEntry {
  id: string;
  word: string;
  definition: string;
  syllableBreakdown: string;
  analogy: string;
  partOfSpeech: string;
  originalSentence: string;
  sourceDocument: string;
  feynmanScore?: number;
  feynmanFeedback?: string;
  dateAdded: number;
}

export interface UserStats {
  xp: number;
  rank: string;
  wordsLearned: number;
  questsCompleted: number;
}

export const RANKS = [
  { name: 'E-Rank', minXp: 0 },
  { name: 'D-Rank', minXp: 200 },
  { name: 'C-Rank', minXp: 500 },
  { name: 'B-Rank', minXp: 1000 },
  { name: 'A-Rank', minXp: 1800 },
  { name: 'S-Rank', minXp: 2800 },
  { name: 'MONARCH', minXp: 4000 },
];

export function getRank(xp: number): string {
  let currentRank = RANKS[0].name;
  for (const rank of RANKS) {
    if (xp >= rank.minXp) {
      currentRank = rank.name;
    } else {
      break;
    }
  }
  return currentRank;
}

export function getNextRank(xp: number): { name: string; minXp: number } | null {
  for (const rank of RANKS) {
    if (xp < rank.minXp) {
      return rank;
    }
  }
  return null;
}
