import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { GameRecord } from '../types/types';

const History: React.FC = () => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const q = query(
        collection(db, 'gameRecords'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as GameRecord[];
      setRecords(fetchedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!recordId) return;

    const confirmDelete = window.confirm('この記録を削除してもよろしいですか？');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'gameRecords', recordId));
      alert('記録を削除しました');
      // 記録を再取得して表示を更新
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('記録の削除に失敗しました');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">読み込み中...</div>;

  if (records.length === 0) {
    return <div className="history-container">
      <h2>対局履歴</h2>
      <p>まだ記録がありません。計算機で結果を保存してください。</p>
    </div>;
  }

  return (
    <div className="history-container">
      <h2>対局履歴</h2>
      {records.map((record) => (
        <div key={record.id} className="history-item">
          <div className="history-header">
            <h3>{record.date.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })} の対局</h3>
            <button
              className="delete-button"
              onClick={() => record.id && handleDeleteRecord(record.id)}
              aria-label="削除"
            >
              削除
            </button>
          </div>

          <div className="game-info">
            <span>総額: {record.totalAmount?.toLocaleString() || 0}円</span>
            <span> {record.gameCount}半荘</span>
          </div>

          <div className="players-result">
            <h4>最終結果</h4>
            {[...record.players]
              .sort((a, b) => ((a.finalAmount ?? a.payment) ?? 0) - ((b.finalAmount ?? b.payment) ?? 0))
              .map((player, index) => (
                <div key={index} className="player-result">
                  <span>{player.name}</span>
                  <span>{((player.finalAmount ?? player.payment) ?? 0).toLocaleString()}円</span>
                  <span>平均順位: {(player.averageRank ?? 0).toFixed(2)}</span>
                </div>
              ))}
          </div>

          <details className="games-detail">
            <summary>各半荘の詳細</summary>
            <div className="games-grid">
              {record.games.map((game, index) => (
                <div key={index} className="game-detail">
                  <h5>第{game.gameNumber}半荘</h5>
                  <div className="ranks-list">
                    {/* 順位ごとにプレイヤーを表示 */}
                    {[1, 2, 3, 4].map(rank => {
                      let playerName = '不明';
                      let playerScore = '';

                      // 新しいデータ構造（playerRanks）がある場合はそれを使用
                      if (game.playerRanks) {
                        const playerInfo = game.playerRanks.find(p => p.rank === rank);
                        if (playerInfo) {
                          playerName = playerInfo.playerName;
                        }
                      } else {
                        // 後方互換性のために古い方法も残す
                        const playerIndex = game.ranks.indexOf(rank);
                        if (playerIndex >= 0 && record.players[playerIndex]) {
                          playerName = record.players[playerIndex].name;
                          if (game.scores && game.scores[playerIndex] !== undefined) {
                            playerScore = `${Number(game.scores[playerIndex]).toLocaleString()}点`;
                          }
                        }
                      }

                      return (
                        <div key={rank} className="rank-item">
                          <span className={`rank-number rank-${rank}`}>{rank}位</span>
                          <span className="player-name">{playerName}</span>
                          {playerScore && <span className="player-score">{playerScore}</span>}
                        </div>
                      );
                    })}
                  </div>
                  {game.isFlying && <span className="flying-badge">トビ有り</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
};

export default History;