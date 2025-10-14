import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { GameRecord } from '../types/types';

interface PlayerStats {
  name: string;
  games: number;
  totalAmount: number;
  averageAmount: number;
  averageRank: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  fourthPlace: number;
  flyingCount: number;
}

interface PlayerStat {
  gamesPlayed: number;
  totalPayment: number;
  averageRank: number;
  rankSum: number;
}

const PlayerStats: React.FC = () => {
  const [playerStats, setPlayerStats] = useState<{ [key: string]: PlayerStats }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculatePlayerStats();
  }, []);

  const calculatePlayerStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gameRecords'));
      const allRecords: GameRecord[] = [];
      querySnapshot.docs.forEach(doc => {
        allRecords.push(doc.data() as GameRecord);
      });

      const calculatedStats = allRecords.reduce((acc, record) => {
        record.players.forEach(player => {
          if (!acc[player.name]) {
            acc[player.name] = {
              gamesPlayed: 0,
              totalPayment: 0,
              averageRank: 0,
              rankSum: 0,
            };
          }
          const stats = acc[player.name];
          stats.gamesPlayed += record.gameCount;
          stats.totalPayment += player.finalAmount ?? player.payment ?? 0;

          if (player.averageRank !== undefined && record.gameCount > 0) {
            stats.rankSum += player.averageRank * record.gameCount;
          }
        });
        return acc;
      }, {} as { [key: string]: PlayerStat });

      Object.values(calculatedStats).forEach(stats => {
        if (stats.gamesPlayed > 0) {
          stats.averageRank = stats.rankSum / stats.gamesPlayed;
        }
      });

      const sortedStats = Object.entries(calculatedStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.averageRank - a.averageRank);

      const finalStats: { [key: string]: PlayerStats } = {};
      sortedStats.forEach(stat => {
        finalStats[stat.name] = {
          name: stat.name,
          games: stat.gamesPlayed,
          totalAmount: stat.totalPayment,
          averageAmount: stat.totalPayment / stat.gamesPlayed,
          averageRank: stat.averageRank,
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0,
          fourthPlace: 0,
          flyingCount: 0
        };
      });

      // 順位ごとの回数をカウント
      allRecords.forEach(record => {
        record.games.forEach(game => {
          record.players.forEach(player => {
            const playerIndex = record.players.findIndex(p => p.name === player.name);
            if (playerIndex >= 0) {
              const rank = game.ranks[playerIndex];
              if (rank === 1) finalStats[player.name]!.firstPlace++;
              if (rank === 2) finalStats[player.name]!.secondPlace++;
              if (rank === 3) finalStats[player.name]!.thirdPlace++;
              if (rank === 4) finalStats[player.name]!.fourthPlace++;
              if (game.isFlying && rank === 4) finalStats[player.name]!.flyingCount++;
            }
          });
        });
      });

      setPlayerStats(finalStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">読み込み中...</div>;

  if (Object.keys(playerStats).length === 0) {
    return <div className="player-stats-container">
      <h2>プレイヤー統計</h2>
      <p>まだ記録がありません。計算機で結果を保存してください。</p>
    </div>;
  }

  return (
    <div className="player-stats-container">
      <h2>戦績</h2>
      <div className="stats-grid">
        {Object.values(playerStats).map(stat => (
          <div key={stat.name} className="player-stat-card">
            <h3>{stat.name}</h3>
            <p><span className="stat-label">総半荘数</span><span className="stat-value">{stat.games}半荘</span></p>
            {/* <p><span className="stat-label">合計支払額</span><span className="stat-value">{stat.totalAmount.toLocaleString()}円</span></p> */}
            <p><span className="stat-label">平均順位</span><span className="stat-value">{stat.averageRank.toFixed(2)}</span></p>
            <p><span className="stat-label">トップ率</span><span className="stat-value">{((stat.firstPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span className="stat-label">2位率</span><span className="stat-value">{((stat.secondPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span className="stat-label">3位率</span><span className="stat-value">{((stat.thirdPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span className="stat-label">4位率</span><span className="stat-value">{((stat.fourthPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span className="stat-label">トビ回数</span><span className="stat-value">{stat.flyingCount}回</span></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerStats;