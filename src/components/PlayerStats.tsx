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
  yakumans: { name: string; date: Date }[];
}

interface AwardRecord {
  value: number;
  player?: string;
  date: Date;
}

interface Awards {
  highestScore: AwardRecord[];
  lowestScore: AwardRecord[];
  maxPayment: AwardRecord[];
  minPayment: AwardRecord[];
  bestAverageRank: AwardRecord[];
  worstAverageRank: AwardRecord[];
  highestJansoFee: AwardRecord[];
  lowestJansoFee: AwardRecord[];
  mostGames: AwardRecord[];
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
        highestScore: [],
        lowestScore: [],
        maxPayment: [],
        minPayment: [],
        bestAverageRank: [],
        worstAverageRank: [],
        highestJansoFee: [],
        lowestJansoFee: [],
        mostGames: [],
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
                const newRecord = { value: numericScore, player: player.name, date: record.date };
                if (awards.highestScore.length === 0 || numericScore > awards.highestScore[0].value) {
                  awards.highestScore = [newRecord];
                } else if (numericScore === awards.highestScore[0].value) {
                  awards.highestScore.push(newRecord);
                }

                if (awards.lowestScore.length === 0 || numericScore < awards.lowestScore[0].value) {
                  awards.lowestScore = [newRecord];
                } else if (numericScore === awards.lowestScore[0].value) {
                  awards.lowestScore.push(newRecord);
                }
              }
            }
          });
        });

        // 最大/最低支払額 & 最高/最低平均順位
        record.players.forEach(player => {
          const payment = player.finalAmount ?? player.payment ?? 0;
          const newPaymentRecord = { value: payment, player: player.name, date: record.date };
          if (awards.maxPayment.length === 0 || payment > awards.maxPayment[0].value) {
            awards.maxPayment = [newPaymentRecord];
          } else if (payment === awards.maxPayment[0].value) {
            awards.maxPayment.push(newPaymentRecord);
          }
          if (awards.minPayment.length === 0 || payment < awards.minPayment[0].value) {
            awards.minPayment = [newPaymentRecord];
          } else if (payment === awards.minPayment[0].value) {
            awards.minPayment.push(newPaymentRecord);
          }

          const avgRank = player.averageRank;
          if (avgRank !== undefined) {
            const newRankRecord = { value: avgRank, player: player.name, date: record.date };
            if (awards.bestAverageRank.length === 0 || avgRank < awards.bestAverageRank[0].value) {
              awards.bestAverageRank = [newRankRecord];
            } else if (avgRank === awards.bestAverageRank[0].value) {
              awards.bestAverageRank.push(newRankRecord);
            }
            if (awards.worstAverageRank.length === 0 || avgRank > awards.worstAverageRank[0].value) {
              awards.worstAverageRank = [newRankRecord];
            } else if (avgRank === awards.worstAverageRank[0].value) {
              awards.worstAverageRank.push(newRankRecord);
            }
          }
        });

        // 最高/最低雀荘料金
        if (record.totalAmount !== null && record.totalAmount !== undefined) {
          const newJansoFeeRecord = { value: record.totalAmount, date: record.date };
          if (awards.highestJansoFee.length === 0 || record.totalAmount > awards.highestJansoFee[0].value) {
            awards.highestJansoFee = [newJansoFeeRecord];
          } else if (record.totalAmount === awards.highestJansoFee[0].value) {
            awards.highestJansoFee.push(newJansoFeeRecord);
          }
          if (awards.lowestJansoFee.length === 0 || record.totalAmount < awards.lowestJansoFee[0].value) {
            awards.lowestJansoFee = [newJansoFeeRecord];
          } else if (record.totalAmount === awards.lowestJansoFee[0].value) {
            awards.lowestJansoFee.push(newJansoFeeRecord);
          }
        }

        // 最高半荘数
        const newMostGamesRecord = { value: record.gameCount, date: record.date };
        if (awards.mostGames.length === 0 || record.gameCount > awards.mostGames[0].value) {
          awards.mostGames = [newMostGamesRecord];
        } else if (record.gameCount === awards.mostGames[0].value) {
          awards.mostGames.push(newMostGamesRecord);
        }

        record.players.forEach(player => {
          if (!acc[player.name]) {
            acc[player.name] = {
              gamesPlayed: 0,
              totalPayment: 0,
              averageRank: 0,
              rankSum: 0,
              yakumans: [],
            };
          }
          const stats = acc[player.name];
          stats.gamesPlayed += record.gameCount;
          stats.totalPayment += player.finalAmount ?? player.payment ?? 0;

          if (player.averageRank !== undefined && record.gameCount > 0) {
            stats.rankSum += player.averageRank * record.gameCount;
          }
        });

        record.games.forEach(game => {
          if (game.yakuman?.playerName && acc[game.yakuman.playerName]) {
            acc[game.yakuman.playerName].yakumans.push({
              name: game.yakuman.yakumanName,
              date: record.date,
            });
          }
        });

        return acc;
      }, {} as { [key: string]: PlayerStat & { yakumans: { name: string; date: Date }[] } });

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
          flyingCount: 0,
          yakumans: stat.yakumans,
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

              // トビ回数のカウントロジックを修正
              if (Array.isArray(game.isFlying)) {
                // 新しいデータ形式: isFlyingが配列で、該当プレイヤーがtrueの場合
                if (game.isFlying[playerIndex]) {
                  finalStats[player.name]!.flyingCount++;
                }
              } else if (game.isFlying === true && rank === 4) {
                // 古いデータ形式: isFlyingがtrueで、そのプレイヤーが4位の場合
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

  const AwardCard: React.FC<{ title: string; records: AwardRecord[]; formatValue: (value: number) => string; }> = ({ title, records, formatValue }) => {
    if (records.length === 0) return null;
    return (
      <div className="award-card">
        <h4>{title}</h4>
        <p className="award-value">{formatValue(records[0].value)}</p>
        {records.map((record, index) => (
          <div key={`${record.date.getTime()}-${record.player}-${index}`}>
            <p className="award-player">{record.player || '-'}</p>
            <p className="award-date">{record.date.toLocaleDateString('ja-JP')}</p>
          </div>
        ))}
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
            <p><span className="stat-label">トビ率</span><span className="stat-value">{stat.flyingCount}回</span></p>
            {stat.yakumans.length > 0 && (
              <div className="yakuman-list">
                <p className="stat-label">役満</p>
                <ul>
                  {stat.yakumans.map((y, i) => (
                    <li key={i}>{y.name} ({y.date.toLocaleDateString('ja-JP')})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="awards-container">
        <h2>これまでの記録</h2>
        <div className="awards-grid">
          {awards?.highestScore && awards.highestScore.length > 0 && <AwardCard title="最高得点" records={awards.highestScore} formatValue={(v) => `${v.toLocaleString()}点`} />}
          {awards?.lowestScore && awards.lowestScore.length > 0 && <AwardCard title="最低得点" records={awards.lowestScore} formatValue={(v) => `${v.toLocaleString()}点`} />}
          {awards?.maxPayment && awards.maxPayment.length > 0 && <AwardCard title="最大支払額" records={awards.maxPayment} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.minPayment && awards.minPayment.length > 0 && <AwardCard title="最低支払額" records={awards.minPayment} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.bestAverageRank && awards.bestAverageRank.length > 0 && <AwardCard title="最高平均順位" records={awards.bestAverageRank} formatValue={(v) => `${v.toFixed(2)}位`} />}
          {awards?.worstAverageRank && awards.worstAverageRank.length > 0 && <AwardCard title="最低平均順位" records={awards.worstAverageRank} formatValue={(v) => `${v.toFixed(2)}位`} />}
          {awards?.highestJansoFee && awards.highestJansoFee.length > 0 && <AwardCard title="最高雀荘料金" records={awards.highestJansoFee} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.lowestJansoFee && awards.lowestJansoFee.length > 0 && <AwardCard title="最低雀荘料金" records={awards.lowestJansoFee} formatValue={(v) => `${v.toLocaleString()}円`} />}
          {awards?.mostGames && awards.mostGames.length > 0 && <AwardCard title="最高半荘数" records={awards.mostGames} formatValue={(v) => `${v}半荘`} />}
        </div>
      </div>
    </div>
  );
};

export default PlayerStats;