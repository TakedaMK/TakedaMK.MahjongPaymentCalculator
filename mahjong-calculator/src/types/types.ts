export interface Player {
    id: number;
    name: string;
}

export interface GameResult {
    gameNumber: number;
    ranks: {
        playerId: number;
        playerName: string;
        rank: number;
    }[];
    isFlying: boolean;
}

export interface GameSession {
    id?: string;
    createdAt: Date;
    totalAmount: number;
    gameCount: number;
    players: {
        id: number;
        name: string;
        finalAmount: number;
    }[];
    games: GameResult[];
}

export interface GameRecord {
  id?: string;
  date: Date;
  totalAmount: number | null;
  gameCount: number;
  players: {
    name: string;
    finalAmount: number;
    averageRank: number;
  }[];
  games: {
    gameNumber: number;
    ranks: number[];
    playerRanks?: {
      playerIndex: number;
      playerName: string;
      rank: number;
    }[];
    isFlying: boolean;
  }[];
}

