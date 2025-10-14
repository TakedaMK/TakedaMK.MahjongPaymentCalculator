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

interface AwardRecord {
  value: number;
  player?: string;
  date: Date;
}

interface Awards {
  highestScore: AwardRecord | null;
  lowestScore: AwardRecord | null;
  maxPayment: AwardRecord | null;
  minPayment: AwardRecord | null;
  bestAverageRank: AwardRecord | null;
  worstAverageRank: AwardRecord | null;
  highestJansoFee: AwardRecord | null;
  lowestJansoFee: AwardRecord | null;
  mostGames: AwardRecord | null;
}

interface PlayerStat {
  gamesPlayed: number;
  totalPayment: number;
  averageRank: number;
  rankSum: number;
}

const PlayerStats: React.FC = () => {
  const [playerStats, setPlayerStats] = useState<{ [key: string]: PlayerStats }>({});
  const [awards, setAwards] = useState<Awards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculatePlayerStats();
  }, []);

  const calculatePlayerStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gameRecords'));
      const allRecords: GameRecord[] = [];
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        allRecords.push({
          ...data,
          date: data.date.toDate()
        } as GameRecord);
      });

      const awards: Awards = {
        highestScore: null,
        lowestScore: null,
        maxPayment: null,
        minPayment: null,
        bestAverageRank: null,
        worstAverageRank: null,
        highestJansoFee: null,
        lowestJansoFee: null,
        mostGames: null,
      };

      const calculatedStats = allRecords.reduce((acc, record) => {
        // 各賞を計算
        // 最高/最低得点
        record.games.forEach(game => {
          game.scores?.forEach((score, index) => {
            const player = record.players[index];
            if (player) {
              const numericScore = Number(score);
              if (!isNaN(numericScore)) {
                if (!awards.highestScore || numericScore > awards.highestScore.value) {
                  awards.highestScore = { value: numericScore, player: player.name, date: record.date };
                }
                if (!awards.lowestScore || numericScore < awards.lowestScore.value) {
                  awards.lowestScore = { value: numericScore, player: player.name, date: record.date };
                }
              }
            }
          });
        });

        // 最大/最低支払額 & 最高/最低平均順位
        record.players.forEach(player => {
          const payment = player.finalAmount ?? player.payment ?? 0;
          if (!awards.maxPayment || payment > awards.maxPayment.value) {
            awards.maxPayment = { value: payment, player: player.name, date: record.date };
          }
          if (!awards.minPayment || payment < awards.minPayment.value) {
            awards.minPayment = { value: payment, player: player.name, date: record.date };
          }

          const avgRank = player.averageRank;
          if (avgRank !== undefined) {
            if (!awards.bestAverageRank || avgRank < awards.bestAverageRank.value) {
              awards.bestAverageRank = { value: avgRank, player: player.name, date: record.date };
            }
            if (!awards.worstAverageRank || avgRank > awards.worstAverageRank.value) {
              awards.worstAverageRank = { value: avgRank, player: player.name, date: record.date };
            }
          }
        });

        // 最高/最低雀荘料金
        if (record.totalAmount !== null && record.totalAmount !== undefined) {
          if (!awards.highestJansoFee || record.totalAmount > awards.highestJansoFee.value) {
            awards.highestJansoFee = { value: record.totalAmount, date: record.date };
          }
          if (!awards.lowestJansoFee || record.totalAmount < awards.lowestJansoFee.value) {
            awards.lowestJansoFee = { value: record.totalAmount, date: record.date };
          }
        }

        // 最高半荘数
        if (!awards.mostGames || record.gameCount > awards.mostGames.value) {
          awards.mostGames = { value: record.gameCount, date: record.date };
        }

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
        .sort((a, b) => b.totalPayment - a.totalPayment);

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

      // 順位とトビ回数をカウント
      allRecords.forEach(record => {
        record.games.forEach(game => {
          record.players.forEach((player, playerIndex) => {
            if (finalStats[player.name]) {
              const rank = game.ranks[playerIndex];
              if (rank === 1) finalStats[player.name]!.firstPlace++;
              if (rank === 2) finalStats[player.name]!.secondPlace++;
              if (rank === 3) finalStats[player.name]!.thirdPlace++;
              if (rank === 4) finalStats[player.name]!.fourthPlace++;

              // トビ回数のカウント
              if (game.scores && Number(game.scores[playerIndex]) < 0) {
                finalStats[player.name]!.flyingCount++;
              }
            }
          });
        });
      });

      setPlayerStats(finalStats);
      setAwards(awards);
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

  const AwardCard: React.FC<{ title: string; record: AwardRecord; formatValue: (value: number) => string; isRank?: boolean }> = ({ title, record, formatValue, isRank = false }) => {
    return (
      <div className="award-card">
        <h4>{title}</h4>
        <p className="award-value">{formatValue(record.value)}</p>
        <p className="award-player">{record.player || '-'}</p>
        <p className="award-date">{record.date.toLocaleDateString('ja-JP')}</p>
      </div>
    );
  };

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
            <p><span className="stat-label">トビ率</span><span className="stat-value">{((stat.flyingCount / stat.games) * 100).toFixed(1)}% ({stat.flyingCount}回)</span></p>
          </div>
        ))}
      </div>

      <div className="awards-container">
        <h2>これまでの記録</h2>
        <div className="awards-grid">
          {awards?.highestScore && <AwardCard title="最高得点" record={awards.highestScore} formatValue={(v) => `${v.toLocaleString()}点`} />}
          {awards?.lowestScore && <AwardCard title="最低得点" record={awards.lowestScore} formatValue={(v) => `${v.toLocaleString()}点`} />}
          {awards?.maxPayment && <AwardCard title="最大支払額" record={awards.maxPayment} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.minPayment && <AwardCard title="最低支払額" record={awards.minPayment} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.bestAverageRank && <AwardCard title="最高平均順位" record={awards.bestAverageRank} formatValue={(v) => `${v.toFixed(2)}位`} isRank />}
          {awards?.worstAverageRank && <AwardCard title="最低平均順位" record={awards.worstAverageRank} formatValue={(v) => `${v.toFixed(2)}位`} isRank />}
          {awards?.highestJansoFee && <AwardCard title="最高雀荘料金" record={awards.highestJansoFee} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.lowestJansoFee && <AwardCard title="最低雀荘料金" record={awards.lowestJansoFee} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.mostGames && <AwardCard title="最高半荘数" record={awards.mostGames} formatValue={(v) => `${v}半荘`} />}
        </div>
      </div>
    </div>
  );
};

export default PlayerStats;