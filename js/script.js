function calculatePayments() {
    const gameCount = parseInt(document.getElementById("gameCount").value, 10);
    const totalAmount = parseFloat(document.getElementById("totalAmount").value);
    const normalDebtPoints = [0, 2, 3, 5];
    const flyingDebtPoints = [0, 2, 2, 6];

    let playerNames = [];
    for (let i = 1; i <= 4; i++) {
        playerNames.push(document.getElementById(`player${i}`).value);
    }

    let playerTotals = [0, 0, 0, 0];
    let playerRanks = Array(4).fill(0); // 各プレイヤーの平均順位を記録

    // 各半荘の計算
    for (let game = 1; game <= gameCount; game++) {
        const ranks = [
            parseInt(document.getElementById(`rank1_${game}`).value),
            parseInt(document.getElementById(`rank2_${game}`).value),
            parseInt(document.getElementById(`rank3_${game}`).value),
            parseInt(document.getElementById(`rank4_${game}`).value)
        ];

        if (new Set(ranks).size !== 4) {
            document.getElementById("result").textContent = `エラー: 第${game}試合の順位が重複しています。異なる順位を選択してください。`;
            return;
        }

        // 平均順位の計算用に順位を加算
        ranks.forEach((rank, playerIndex) => {
            playerRanks[playerIndex] += rank;
        });

        const isFlying = document.getElementById(`flying_${game}`).checked;
        const debtPoints = isFlying ? flyingDebtPoints : normalDebtPoints;
        const totalPoints = debtPoints.reduce((sum, points) => sum + points, 0);

        // この試合の支払額を計算
        const gameAmount = totalAmount / gameCount;
        for (let i = 0; i < ranks.length; i++) {
            const payment = (debtPoints[ranks[i] - 1] / totalPoints) * gameAmount;
            playerTotals[i] += payment;
        }
    }

    // 平均順位を計算
    playerRanks = playerRanks.map(total => total / gameCount);

    // プレイヤーの支払額と順位をペアにする
    let playersWithRanks = playerNames.map((name, index) => ({
        name: name,
        amount: Math.floor(playerTotals[index]),
        avgRank: playerRanks[index]
    }));

    // 平均順位で並び替え（4位から1位）
    playersWithRanks.sort((a, b) => b.avgRank - a.avgRank);

    // 下2桁の調整（4位から2位まで）
    for (let i = 0; i < 3; i++) {
        const currentAmount = playersWithRanks[i].amount;
        const remainder = currentAmount % 100;
        if (remainder > 0) {
            // 現在の金額を100円単位に切り捨て
            playersWithRanks[i].amount = Math.floor(currentAmount / 100) * 100;
            // 余りを上の順位の人に加算
            playersWithRanks[i + 1].amount += remainder;
        }
    }

    // 結果の表示
    let results = `${gameCount}試合の合計結果\n\n`;
    playersWithRanks.reverse().forEach(player => {
        results += `${player.name} の支払額は: ${player.amount} 円\n`;
    });

    // 支払総額の確認
    const totalPaid = playersWithRanks.reduce((sum, player) => sum + player.amount, 0);
    results += `\n支払総額: ${totalPaid} 円`;

    // 誤差の確認
    if (Math.abs(totalPaid - totalAmount) > 0) {
        results += `\n\n(注意: 調整の関係で合計金額と ${Math.floor(totalPaid - totalAmount)} 円の誤差があります)`;
    }

    document.getElementById("result").textContent = results;

    // 結果表示後に画面を最下部までスクロール
    setTimeout(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function updateRankInputs() {
    const gameCount = parseInt(document.getElementById("gameCount").value);
    const rankInputs = document.getElementById("rankInputs");
    rankInputs.innerHTML = "";

    for (let game = 1; game <= gameCount; game++) {
        let gameHtml = `
            <div class="game-section">
                <h3>第${game}半荘</h3>
                <div class="player-ranks">
        `;
        for (let player = 1; player <= 4; player++) {
            gameHtml += `
                <div class="rank-input-group">
                    <label for="rank${player}_${game}">${document.getElementById(`player${player}`).value}の順位:</label>
                    <select id="rank${player}_${game}">
                        <option value="1">1位</option>
                        <option value="2">2位</option>
                        <option value="3">3位</option>
                        <option value="4">4位</option>
                    </select>
                </div>
            `;
        }
        gameHtml += `
                </div>
                <div class="flying-checkbox">
                    <label for="flying_${game}">
                        <input type="checkbox" id="flying_${game}"> トんじまった
                    </label>
                </div>
            </div>
        `;
        rankInputs.innerHTML += gameHtml;
    }
}

function updatePlayerNames() {
    updateRankInputs();
}

// モーダル関連の機能を追加
function showModal() {
    document.getElementById('rulesModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('rulesModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("gameCount").addEventListener("change", updateRankInputs);
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`player${i}`).addEventListener("input", updatePlayerNames);
    }
    updateRankInputs(); // 初期表示用

    // モーダル関連のイベントリスナーを追加
    document.getElementById('rulesButton').addEventListener('click', showModal);
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function (event) {
        if (event.target == document.getElementById('rulesModal')) {
            closeModal();
        }
    });
});