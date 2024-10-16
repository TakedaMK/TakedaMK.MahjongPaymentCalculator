function calculatePayments() {
    const gameCount = parseInt(document.getElementById("gameCount").value);
    const totalAmount = parseFloat(document.getElementById("totalAmount").value);
    const normalDebtPoints = [0, 2, 3, 5];
    const flyingDebtPoints = [0, 2, 2, 6];

    let playerNames = [];
    for (let i = 1; i <= 4; i++) {
        playerNames.push(document.getElementById(`player${i}`).value);
    }

    let playerTotals = [0, 0, 0, 0];

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

    let results = `${gameCount}試合の合計結果:\n`;
    for (let i = 0; i < playerTotals.length; i++) {
        results += `${playerNames[i]} の支払額は: ${playerTotals[i].toFixed(2)} 円\n`;
    }

    // 支払総額の確認
    const totalPaid = playerTotals.reduce((sum, payment) => sum + payment, 0);
    results += `\n支払総額: ${totalPaid.toFixed(2)} 円`;
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
        results += `\n(注意: 四捨五入の関係で合計金額と ${(totalPaid - totalAmount).toFixed(2)} 円の誤差があります)`;
    }

    document.getElementById("result").textContent = results;
}

function updateRankInputs() {
    const gameCount = parseInt(document.getElementById("gameCount").value);
    const rankInputs = document.getElementById("rankInputs");
    rankInputs.innerHTML = "";

    for (let game = 1; game <= gameCount; game++) {
        let gameHtml = `<h3>第${game}試合</h3>`;
        for (let player = 1; player <= 4; player++) {
            gameHtml += `
                <label for="rank${player}_${game}">${document.getElementById(`player${player}`).value}の順位:</label>
                <select id="rank${player}_${game}">
                    <option value="1">1位</option>
                    <option value="2">2位</option>
                    <option value="3">3位</option>
                    <option value="4">4位</option>
                </select><br>
            `;
        }
        gameHtml += `
            <label for="flying_${game}">
                <input type="checkbox" id="flying_${game}"> トんじまった
            </label><br>
        `;
        rankInputs.innerHTML += gameHtml + "<br>";
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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("gameCount").addEventListener("change", updateRankInputs);
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`player${i}`).addEventListener("input", updatePlayerNames);
    }
    updateRankInputs(); // 初期表示用

    // モーダル関連のイベントリスナーを追加
    document.getElementById('rulesButton').addEventListener('click', showModal);
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target == document.getElementById('rulesModal')) {
            closeModal();
        }
    });
});