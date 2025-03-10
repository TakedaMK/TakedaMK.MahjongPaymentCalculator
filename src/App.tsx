import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Calculator from './components/Calculator';
import History from './components/History';
import PlayerStats from './components/PlayerStats';

import './App.css';

// アクティブなタブを判定するためのカスタムコンポーネント
const NavTab = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} className={`nav-tab ${isActive ? 'active' : ''}`}>
      {children}
    </Link>
  );
};

function App() {
  return (
    <Router>
      <div className="container">
        <h1 className="title">麻雀精算ツール</h1>

        <nav className="nav-tabs">
          <NavTab to="/">計算機</NavTab>
          <NavTab to="/history">履歴</NavTab>
          <NavTab to="/stats">統計</NavTab>
        </nav>

        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<PlayerStats />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;