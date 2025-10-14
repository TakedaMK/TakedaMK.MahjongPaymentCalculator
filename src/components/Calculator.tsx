import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { GameRecord } from '../types/types';

interface Player {
  id: number;
  name: string;
}

interface GameResult {
  ranks: number[];            // 1〜4位（入力）
  isFlying: boolean;         // 既存。今回の計算では未使用（UIは残しつつ無視）
  scores: string[];          // 追加: 各半荘の最終点数（100点単位OK）
}

const PREDEFINED_PLAYERS = ['ゆっぺ', '瀬川', '公紀', '直矢'];

// ルール設定（返し点=25,000、ウマ=+30,+10,-10,-30、オカなし）
const RULES = {
  returnPoints: 25000,              // 返し点（基準）
  uma: { first: 30, second: 10, third: -10, fourth: -30 }, // ウマ
  useOka: false                     // オカ（トップボーナス）は使わない
};

const Calculator: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'ゆっぺ' },
    { id: 2, name: '瀬川' },
    { id: 3, name: '公紀' },
    { id: 4, name: '直矢' },
  ]);
  const [gameCount, setGameCount] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);

  // スコア入力＋順位＋トビUIを含む
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [calculationResult, setCalculationResult] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // 実力反映率 γ（0〜1）。例: 0.3 = 総額の30%を成績で動かす
  const [gamma, setGamma] = useState<number>(0.25);

  // 計算結果を保存用に持っておく
  const [tempResults, setTempResults] = useState<{
    results: string;
    finalAmounts: number[];
    finalPoints: number[];
    perGamePoints: number[][];
    gamesWithDetails: any[];
  } | null>(null);

  // 半荘数が変わったら初期値を用意（順位=1,2,3,4 / スコア=25,000 / トビ=false）
  useEffect(() => {
    const initialResults: GameResult[] = Array(gameCount)
      .fill(null)
      .map(() => ({
        ranks: [1, 2, 3, 4],
        isFlying: false,
        scores: ['25000', '25000', '25000', '25000'],
      }));
    setGameResults(initialResults);
  }, [gameCount]);

  // プレイヤー名の更新
  const handlePlayerNameChange = (id: number, newName: string) => {
    setPlayers(players.map(player =>
      player.id === id ? { ...player, name: newName } : player
    ));
  };

  // 順位の更新
  const handleRankChange = (gameIndex: number, playerIndex: number, rank: number) => {
    const newResults = [...gameResults];
    newResults[gameIndex] = {
      ...newResults[gameIndex],
      ranks: newResults[gameIndex].ranks.map((r, i) => i === playerIndex ? rank : r)
    };
    setGameResults(newResults);
  };

  // スコア（最終点数）の更新
  const handleScoreChange = (gameIndex: number, playerIndex: number, score: string) => {
    const newResults = [...gameResults];
    const game = { ...newResults[gameIndex] };

    const newScores = [...game.scores];
    newScores[playerIndex] = score;
    game.scores = newScores;

    // スコアを数値に変換（空文字や'-'はNaN扱い）
    const numericScores = newScores.map(s => parseInt(s, 10));

    // 入力が不完全な場合は順位を更新しない
    if (numericScores.some(isNaN)) {
      newResults[gameIndex] = game;
      setGameResults(newResults);
      return;
    }

    // 同点がない場合のみ順位を自動更新
    const uniqueScores = new Set(numericScores);
    if (uniqueScores.size === 4) {
      const sortedPlayers = numericScores
        .map((s, i) => ({ score: s, index: i }))
        .sort((a, b) => b.score - a.score);

      const newRanks = Array(4).fill(0);
      sortedPlayers.forEach((p, rankIndex) => {
        newRanks[p.index] = rankIndex + 1;
      });
      game.ranks = newRanks;
    }

    newResults[gameIndex] = game;
    setGameResults(newResults);
  };

  // トビの更新（今回の計算には使わないがUIは残す）
  const handleFlyingChange = (gameIndex: number, isFlying: boolean) => {
    const newResults = [...gameResults];
    newResults[gameIndex] = { ...newResults[gameIndex], isFlying };
    setGameResults(newResults);
  };

  const handleSaveClick = () => {
    setIsDateModalOpen(true);
  };

  // ─────────────────────────────────────────────────────────────
  // ここから計算ロジック
  // ─────────────────────────────────────────────────────────────

  // 1半荘ぶんのポイント（返し点差 + ウマ、オカなし）
  const calcPerGamePoints = (game: GameResult): number[] => {
    const base = RULES.returnPoints;
    const diffPts = game.scores.map(s => (parseInt(s, 10) - base) / 1000); // 1000点=1pt

    // ranks[] は1〜4。順位に応じてウマ付与
    const umaPts = game.ranks.map(rank => {
      if (rank === 1) return RULES.uma.first;
      if (rank === 2) return RULES.uma.second;
      if (rank === 3) return RULES.uma.third;
      return RULES.uma.fourth; // rank===4
    });

    // オカなし：そのまま合算
    const total = diffPts.map((p, i) => p + umaPts[i]);
    return total;
  };

  // 全半荘の最終ポイント（各半荘のポイント合計）
  const calcFinalPoints = (allGames: GameResult[]): { perGame: number[][]; final: number[] } => {
    const perGame: number[][] = allGames.map(g => calcPerGamePoints(g));
    const final = [0, 0, 0, 0];
    perGame.forEach(row => {
      for (let i = 0; i < 4; i++) final[i] += row[i];
    });
    return { perGame, final };
  };

  // 会計は最後に一回だけ：ベース=均等割、γぶんを成績で動かす
  // 丸め：成績順 2〜4位を100円切り下げ→端数を1位へ加算
  const settleOnceAtEnd = (finalPts: number[], total: number, gammaRate: number): number[] => {
    const base = total / 4;

    // プラス合計（勝ち側）に対して総額のγを配る（円/ptの係数を求める）
    const sumPos = finalPts.reduce((s, x) => s + Math.max(x, 0), 0);
    if (sumPos === 0 || gammaRate === 0) {
      // 成績差ゼロ or γ=0 のときは完全均等割
      return Array(4).fill(base);
    }
    const alpha = (gammaRate * total) / sumPos; // 1ptあたりの円

    // 生の支払（まだ丸めなし）
    let pay = finalPts.map(F => base - alpha * F);

    // 成績の良い順（finalPts降順）
    const order = finalPts
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .map(o => o.i);

    // 2〜4位の100円未満を切り下げ→端数をトップへ
    let remainder = 0;
    for (const idx of [order[1], order[2], order[3]]) {
      const r = pay[idx] % 100;
      remainder += r;
      pay[idx] = pay[idx] - r;
    }
    pay[order[0]] = Math.round(pay[order[0]] + remainder);

    // 最低0円ガード（万一マイナスが出た場合は0円に）
    pay = pay.map(v => (v < 0 ? 0 : v));

    // 合計が多少ズレた場合（丸めの影響）を微調整
    const diff = Math.round(total - pay.reduce((s, x) => s + x, 0));
    if (Math.abs(diff) > 0) {
      // 誤差はトップにのせる（負なら引く）
      pay[order[0]] = Math.max(0, pay[order[0]] + diff);
    }
    return pay;
  };

  // メイン計算（ボタン押下）
  const calculatefinalAmounts = () => {
    if (totalAmount === null || totalAmount <= 0) {
      alert('雀荘の料金を入力してください');
      return;
    }

    // 各半荘の入力バリデーション
    for (let g = 0; g < gameCount; g++) {
      const ranks = gameResults[g].ranks;
      const unique = new Set(ranks);
      if (unique.size !== 4) {
        setCalculationResult(`エラー: 第${g + 1}半荘の順位が重複しています。`);
        return;
      }
      const scores = gameResults[g].scores;
      const numericScores = scores.map(s => parseInt(s, 10));
      if (scores.length !== 4 || numericScores.some(s => isNaN(s))) {
        setCalculationResult(`エラー: 第${g + 1}半荘の点数が不正です。`);
        return;
      }
      // 点棒総和は10万点が自然ですが、友人戦想定で厳密チェックはしない
      // 必要ならここで合計10万チェックを追加可能
    }

    // 最終ポイント
    const { perGame, final } = calcFinalPoints(gameResults);

    // 最後に一回だけ会計
    const finalAmounts = settleOnceAtEnd(final, totalAmount, gamma);

    // 表示用：成績順に表示するか、プレイヤー配列順で表示するかはお好みで
    // ここではプレイヤー配列順
    let results = `${gameCount}半荘の合計結果（実力反映率: ${(gamma * 100).toFixed(0)}%）\n\n`;

    players.forEach((p, i) => {
      results += `${p.name} の支払額: ${Math.round(finalAmounts[i])} 円  （最終ポイント: ${final[i].toFixed(1)}）\n`;
    });

    const totalPaid = finalAmounts.reduce((s, x) => s + Math.round(x), 0);
    if (totalPaid !== totalAmount) {
      results += `\n※丸め調整のため合計 ${totalPaid} 円（卓代 ${totalAmount} 円と ±${totalPaid - totalAmount} 円の誤差）\n`;
    }

    // 保存用に構造化
    const gamesWithDetails = gameResults.map((g, idx) => ({
      gameNumber: idx + 1,
      ranks: g.ranks,
      scores: g.scores,
      isFlying: g.scores.some(s => parseInt(s, 10) < 0),
      points: perGame[idx], // この半荘での4人のポイント
    }));

    setCalculationResult(results);
    setTempResults({
      results,
      finalAmounts,
      finalPoints: final,
      perGamePoints: perGame,
      gamesWithDetails,
    });
  };

  // Firestoreへ保存（型が合わない可能性に備え any でキャスト）
  const handleSaveWithDate = async () => {
    if (!tempResults) return;

    try {
      const sortedPlayers = [...players].sort((a, b) => a.id - b.id);

      const averageRanks = Array(players.length).fill(0);
      if (gameCount > 0) {
        for (let i = 0; i < players.length; i++) {
          const sumOfRanks = tempResults.gamesWithDetails.reduce(
            (sum, game) => sum + game.ranks[i],
            0
          );
          averageRanks[i] = sumOfRanks / gameCount;
        }
      }

      const now = new Date();
      const saveTime = new Date(selectedDate);
      saveTime.setHours(now.getHours());
      saveTime.setMinutes(now.getMinutes());

      const year = saveTime.getFullYear();
      const month = String(saveTime.getMonth() + 1).padStart(2, '0');
      const day = String(saveTime.getDate()).padStart(2, '0');
      const hours = String(saveTime.getHours()).padStart(2, '0');
      const minutes = String(saveTime.getMinutes()).padStart(2, '0');
      const docId = `${year}${month}${day}${hours}${minutes}`;

      const record: any = {
        date: saveTime,
        totalAmount,
        gameCount,
        players: sortedPlayers.map((player, i) => ({
          name: player.name,
          finalAmount: Math.round(tempResults.finalAmounts[i]),
          finalPoint: tempResults.finalPoints[i],
          averageRank: averageRanks[i],
        })),
        games: tempResults.gamesWithDetails,
        rules: {
          returnPoints: RULES.returnPoints,
          uma: RULES.uma,
          useOka: RULES.useOka,
          gamma,
        },
        summaryText: tempResults.results, // 任意：そのままの表示テキスト
      };

      await setDoc(doc(db, 'gameRecords', docId), record as unknown as GameRecord);
      alert('記録を保存しました！');
      setIsDateModalOpen(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('記録の保存に失敗しました。');
    }
  };

  return (
    <>
      <h1 className="title">支払額計算ツール</h1>

      <button className="rules-button" onClick={() => setIsModalOpen(true)}>
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

      {/* 実力反映率（γ）スライダー */}
      <div style={{ marginTop: '16px' }}>
        <label htmlFor="gamma">γ:</label>
        <input
          type="range"
          id="gamma"
          min="0"
          max="1"
          step="0.05"
          value={gamma}
          onChange={(e) => setGamma(Number(e.target.value))}
          style={{ width: '220px', margin: '0 10px' }}
        />
        <span>{(gamma * 100).toFixed(0)}%</span>
        <div style={{ fontSize: '0.9em', color: '#555', marginTop: 4 }}>
          総額のγ%を成績で動かす。
        </div>
      </div>

      <div id="rankInputs" style={{ marginTop: '20px' }}>
        {gameResults.map((game, gameIndex) => (
          <div key={gameIndex} className="game-section">
            <h3>第{gameIndex + 1}半荘</h3>

            {/* スコア入力 */}
            <div className="player-scores" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 12 }}>
              {players.map((player, playerIndex) => (
                <div key={`score_${player.id}`} className="score-input-group">
                  <label htmlFor={`score${player.id}_${gameIndex + 1}`}>
                    {player.name}の最終点数:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id={`score${player.id}_${gameIndex + 1}`}
                    value={game.scores[playerIndex]}
                    onChange={(e) => handleScoreChange(gameIndex, playerIndex, e.target.value)}
                    placeholder="例: 35000"
                    className="no-spin"
                  />
                </div>
              ))}
            </div>

            {/* 順位入力 */}
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

            {/* トビ（今回の計算では未使用） */}
            {/* <div className="flying-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={game.isFlying}
                  onChange={(e) => handleFlyingChange(gameIndex, e.target.checked)}
                />
                トんじまった（※今回の計算では未使用）
              </label>
            </div> */}
          </div>
        ))}
      </div>

      <button className="submit-button" onClick={calculatefinalAmounts}>
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
            <p>このツールは、各半荘の点数と順位を使って「ポイント」を計算し、最後に一度だけ卓代を精算します。</p>
            <ul>
              <li>返し点は <strong>25,000点</strong>。<br />最終点数との差を <strong>1,000点=1pt</strong> に換算します。</li>
              <li>ウマ：<strong>1位 +30 / 2位 +10 / 3位 -10 / 4位 -30</strong>。</li>
              <li>トップボーナス（オカ）は <strong>なし</strong>。</li>
              <li>全半荘のポイント合計（各人）を出し、卓代の<strong>一部（実力反映率γ）</strong>だけ成績に応じて移動します。</li>
              <li>残りは均等割。2〜4位の100円未満は切り下げ、端数は1位にまとめます。</li>
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
