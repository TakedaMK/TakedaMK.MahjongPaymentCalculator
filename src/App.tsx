import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Calculator from './components/Calculator';
import History from './components/History';
import PlayerStats from './components/PlayerStats';

import './App.css';

// NavTabコンポーネント：現在のパスに基づいてアクティブなタブをハイライト表示
// - to: リンク先のパス
// - children: タブの表示内容
const NavTab = ({ to, children }: { to: string; children: React.ReactNode }) => {
  // useLocationフックで現在のパス情報を取得
  const location = useLocation();
  // 現在のパスとリンク先パスを比較してアクティブ状態を判定
  const isActive = location.pathname === to;

  return (
    <Link to={to} className={`nav-tab ${isActive ? 'active' : ''}`}>
      {children}
    </Link>
  );
};

function App() {
  return (
    // Routerコンポーネントでアプリケーション全体をラップ
    <Router>
      <div className="container">
        <h1 className="title">支払額計算ツール</h1>

        {/* ナビゲーションタブ */}
        <nav className="nav-tabs">
          <NavTab to="/">計算</NavTab>
          <NavTab to="/history">履歴</NavTab>
          <NavTab to="/stats">戦績</NavTab>
        </nav>

        {/* ルーティング設定 */}
        <Routes>
          {/* 各パスに対応するコンポーネントを定義 */}
          <Route path="/" element={<Calculator />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<PlayerStats />} />
          {/* 未定義のパスにアクセスした場合、自動的にルートパス（計算タブ）にリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;