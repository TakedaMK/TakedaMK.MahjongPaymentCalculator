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

const PlayerStats: React.FC = () => {
  const [playerStats, setPlayerStats] = useState<{ [key: string]: PlayerStats }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculatePlayerStats();
  }, []);

  const calculatePlayerStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gameRecords'));
      const stats: { [key: string]: PlayerStats } = {};

      querySnapshot.docs.forEach(doc => {
        const record = doc.data() as GameRecord;

        record.players.forEach(player => {
          if (!stats[player.name]) {
            stats[player.name] = {
              name: player.name,
              games: 0,
              totalAmount: 0,
              averageAmount: 0,
              averageRank: 0,
              firstPlace: 0,
              secondPlace: 0,
              thirdPlace: 0,
              fourthPlace: 0,
              flyingCount: 0
            };
          }

          stats[player.name].games += record.gameCount;
          stats[player.name].totalAmount += player.finalAmount;
          stats[player.name].averageRank += player.averageRank * record.gameCount;

          // 順位ごとの回数をカウント
          record.games.forEach(game => {
            const playerIndex = record.players.findIndex(p => p.name === player.name);
            if (playerIndex >= 0) {
              const rank = game.ranks[playerIndex];
              if (rank === 1) stats[player.name].firstPlace++;
              if (rank === 2) stats[player.name].secondPlace++;
              if (rank === 3) stats[player.name].thirdPlace++;
              if (rank === 4) stats[player.name].fourthPlace++;
              if (game.isFlying && rank === 4) stats[player.name].flyingCount++;
            }
          });
        });
      });

      // 平均値の計算
      Object.values(stats).forEach(stat => {
        if (stat.games > 0) {
          stat.averageAmount = stat.totalAmount / stat.games;
          stat.averageRank = stat.averageRank / stat.games;
        }
      });

      setPlayerStats(stats);
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
      <h2>プレイヤー統計</h2>
      <div className="stats-grid">
        {Object.values(playerStats).map(stat => (
          <div key={stat.name} className="player-stat-card">
            <h3>{stat.name}</h3>
            <p><span>総半荘数</span> <span>{stat.games}半荘</span></p>
            <p><span>平均順位</span> <span>{stat.averageRank.toFixed(2)}</span></p>
            <p><span>トップ率</span> <span>{((stat.firstPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span>2位率</span> <span>{((stat.secondPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span>3位率</span> <span>{((stat.thirdPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span>4位率</span> <span>{((stat.fourthPlace / stat.games) * 100).toFixed(1)}%</span></p>
            <p><span>トビ回数</span> <span>{stat.flyingCount}回</span></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerStats;