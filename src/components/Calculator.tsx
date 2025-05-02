import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GameRecord } from '../types/types';

interface Player {
  id: number;
  name: string;
}

interface GameResult {
  ranks: number[];
  isFlying: boolean;
}

const PREDEFINED_PLAYERS = ['ゆっぺ', '瀬川', '公紀', '直矢'];

const Calculator: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'ゆっぺ' },
    { id: 2, name: '瀬川' },
    { id: 3, name: '公紀' },
    { id: 4, name: '直矢' },
  ]);
  const [gameCount, setGameCount] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [calculationResult, setCalculationResult] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // 今日の日付をデフォルト値に
  );
  const [tempResults, setTempResults] = useState<{
    results: string;
    playersWithRanks: any[];
    gamesWithPlayerRanks: any[];
  } | null>(null);

  useEffect(() => {
    const initialResults = Array(gameCount).fill(null).map(() => ({
      ranks: [1, 2, 3, 4],
      isFlying: false
    }));
    setGameResults(initialResults);
  }, [gameCount]);

  // プレイヤー名の更新（プルダウンまたは手入力）

  // mapでプレイヤー全員に対して処理を行う
  // 変更したいidと、変更先の名前を引数として受け取り、idが一致したらnewNameに変更する
  // それ以外のプレイヤーは変化なしとする
  const handlePlayerNameChange = (id: number, newName: string) => {
    setPlayers(players.map(player =>
      player.id === id ? { ...player, name: newName } : player
    ));
  };

  const handleRankChange = (gameIndex: number, playerIndex: number, rank: number) => {
    const newResults = [...gameResults];
    newResults[gameIndex] = {
      ...newResults[gameIndex],
      ranks: newResults[gameIndex].ranks.map((r, i) => i === playerIndex ? rank : r)
    };
    setGameResults(newResults);
  };

  const handleFlyingChange = (gameIndex: number, isFlying: boolean) => {
    const newResults = [...gameResults];
    newResults[gameIndex] = {
      ...newResults[gameIndex],
      isFlying
    };
    setGameResults(newResults);
  };

  const handleSaveClick = () => {
    // 日付選択モーダルを表示
    setIsDateModalOpen(true);
  };

  const handleSaveWithDate = async () => {
    if (!tempResults) return;

    try {
      // プレイヤー情報を元の順序に戻す
      const sortedPlayers = [...tempResults.playersWithRanks].sort((a, b) => a.playerIndex - b.playerIndex);

      const gameRecord: GameRecord = {
        date: new Date(selectedDate),
        totalAmount,
        gameCount,
        players: sortedPlayers.map(player => ({
          name: player.name,
          finalAmount: player.amount,
          averageRank: player.avgRank
        })),
        games: tempResults.gamesWithPlayerRanks.map(game => ({
          gameNumber: game.gameNumber,
          ranks: gameResults[game.gameNumber - 1].ranks,
          playerRanks: game.playerRanks,
          isFlying: game.isFlying
        }))
      };

      await addDoc(collection(db, 'gameRecords'), gameRecord);
      alert('記録を保存しました！');
      setIsDateModalOpen(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('記録の保存に失敗しました。');
    }
  };

  const calculatePayments = () => {
    // 料金が入力されていない場合のバリデーション
    if (totalAmount === null || totalAmount <= 0) {
      alert('雀荘の料金を入力してください');
      return;
    }

    const normalDebtPoints = [0, 2, 3, 5];
    const flyingDebtPoints = [0, 2, 2, 6];
    let playerTotals = [0, 0, 0, 0];
    let playerRanks = Array(4).fill(0);

    // 各ゲームの順位情報を保存
    const gamesWithPlayerRanks = gameResults.map((game, gameIndex) => {
      const playerRankMap: {
        playerIndex: number;
        playerName: string;
        rank: number;
      }[] = [];

      game.ranks.forEach((rank, playerIndex) => {
        playerRankMap.push({
          playerIndex,
          playerName: players[playerIndex].name,
          rank
        });
      });

      return {
        gameNumber: gameIndex + 1,
        playerRanks: playerRankMap,
        isFlying: game.isFlying
      };
    });

    for (let game = 0; game < gameCount; game++) {
      const ranks = gameResults[game].ranks;
      if (new Set(ranks).size !== 4) {
        setCalculationResult(`エラー: 第${game + 1}試合の順位が重複しています。`);
        return;
      }

      ranks.forEach((rank, playerIndex) => {
        playerRanks[playerIndex] += rank;
      });

      const debtPoints = gameResults[game].isFlying ? flyingDebtPoints : normalDebtPoints;
      const totalPoints = debtPoints.reduce((sum, points) => sum + points, 0);
      const gameAmount = totalAmount / gameCount;

      ranks.forEach((rank, playerIndex) => {
        const payment = (debtPoints[rank - 1] / totalPoints) * gameAmount;
        playerTotals[playerIndex] += payment;
      });
    }

    playerRanks = playerRanks.map(total => total / gameCount);

    let playersWithRanks = players.map((player, index) => ({
      name: player.name,
      amount: Math.floor(playerTotals[index]),
      avgRank: playerRanks[index],
      playerIndex: index
    }));

    playersWithRanks.sort((a, b) => b.avgRank - a.avgRank);

    for (let i = 0; i < 3; i++) {
      const currentAmount = playersWithRanks[i].amount;
      const remainder = currentAmount % 100;
      if (remainder > 0) {
        playersWithRanks[i].amount = Math.floor(currentAmount / 100) * 100;
        playersWithRanks[i + 1].amount += remainder;
      }
    }

    let results = `${gameCount}試合の合計結果\n\n`;
    playersWithRanks.reverse().forEach(player => {
      results += `${player.name} の支払額は: ${player.amount} 円\n`;
    });

    const totalPaid = playersWithRanks.reduce((sum, player) => sum + player.amount, 0);
    results += `\n支払総額: ${totalPaid} 円`;

    if (Math.abs(totalPaid - totalAmount) > 0) {
      results += `\n\n(注意: 調整の関係で合計金額と ${Math.floor(totalPaid - totalAmount)} 円の誤差があります)`;
    }

    setCalculationResult(results);

    // 計算結果をstateに保存しておく（保存ボタンクリック時に使用）
    setTempResults({ results, playersWithRanks, gamesWithPlayerRanks });
  };

  // const clickTest = (test: string) => () => {
  //   console.log(test);
  // }

  return (
    <>
      <h1 className="title">支払額計算ツール</h1>

      <button className="rules-button" onClick={()=>setIsModalOpen(true)}>
        ルールを表示
      </button>

      <div id="playerNames">
        <h3>プレイヤー名</h3>
        {players.map(player => (
          <div key={player.id}>
            <label htmlFor={`player${player.id}`}>プレイヤー{player.id}:</label>
            <div className="player-input-container">
              <select
                value={PREDEFINED_PLAYERS.includes(player.name) ? player.name : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    handlePlayerNameChange(player.id, e.target.value);
                  }
                }}
                className="player-select"
              >
                {PREDEFINED_PLAYERS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="custom">その他（手入力）</option>
              </select>
              <input
                type="text"
                id={`player${player.id}`}
                value={player.name}
                onChange={(e) => handlePlayerNameChange(player.id, e.target.value)}
                className="player-input"
                placeholder="プレイヤー名を入力"
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="gameCount">半荘数:</label>
        <select
          id="gameCount"
          value={gameCount}
          onChange={(e) => setGameCount(Number(e.target.value))}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}半荘</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="totalAmount">雀荘の料金（円）:</label>
        <input
          type="number"
          id="totalAmount"
          value={totalAmount === null ? '' : totalAmount}
          onChange={(e) => {
            const value = e.target.value === '' ? null : Number(e.target.value);
            setTotalAmount(value);
          }}
          placeholder="例: 10000"
        />
      </div>

      <div id="rankInputs">
        {gameResults.map((game, gameIndex) => (
          <div key={gameIndex} className="game-section">
            <h3>第{gameIndex + 1}半荘</h3>
            <div className="player-ranks">
              {players.map((player, playerIndex) => (
                <div key={player.id} className="rank-input-group">
                  <label htmlFor={`rank${player.id}_${gameIndex + 1}`}>
                    {player.name}の順位:
                  </label>
                  <select
                    id={`rank${player.id}_${gameIndex + 1}`}
                    value={game.ranks[playerIndex]}
                    onChange={(e) => handleRankChange(gameIndex, playerIndex, Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map(rank => (
                      <option key={rank} value={rank}>{rank}位</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flying-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={game.isFlying}
                  onChange={(e) => handleFlyingChange(gameIndex, e.target.checked)}
                />
                トんじまった
              </label>
            </div>
          </div>
        ))}
      </div>

      <button className="submit-button" onClick={calculatePayments}>
        計算する
      </button>

      {calculationResult && (
        <div id="result">
          {calculationResult}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              className="submit-button"
              onClick={handleSaveClick}
              style={{ marginTop: '10px' }}
            >
              結果を保存する
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
            <h2>ルール説明</h2>
            <p>このツールは、麻雀の順位に基づいて各プレイヤーの支払額を計算します。</p>
            <ul>
              <li>半荘ごとに、順位に応じた負債ポイントが配布されます。<br /><br />
                &emsp;1位: 0p, 2位: 2p, 3位:3p, 4位: 5p <br /><br /></li>
              <li>「トんじまった」状態の場合は、3位の負債ポイントを4位に1p渡します。</li><br />
              <li>2~4位のプレイヤーの支払額下2桁は0になるように調整します。<br /><br />
                &emsp;下2桁の金額は、1つ上の順位のプレイヤーに渡します。<br /><br /></li>
              <li>各半荘の支払額は<br />
                <span className="rule">&emsp;(プレイヤーの負債ポイント / 総負債ポイント) <br />&emsp;×<br />&emsp;(雀荘の総額 / 半荘数) </span><br />
                で計算されます。
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 日付選択モーダル */}
      {isDateModalOpen && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close" onClick={() => setIsDateModalOpen(false)}>&times;</span>
            <h2>対局日を選択</h2>
            <div style={{ margin: '20px 0' }}>
              <label htmlFor="gameDate">対局日: </label>
              <input
                type="date"
                id="gameDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ margin: '10px 0' }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                className="submit-button"
                onClick={handleSaveWithDate}
                style={{ margin: '10px' }}
              >
                保存
              </button>
              <button
                className="rules-button"
                onClick={() => setIsDateModalOpen(false)}
                style={{ margin: '10px' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Calculator;