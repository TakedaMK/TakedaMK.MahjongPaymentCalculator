麻雀計算ツール (TakedaMK.github.io)

麻雀会のためのスコア計算・管理ツールです。

セットアップ手順

1. Firebase の設定
   まず Firebase データベースを作成し、連携します。
   bashCopynpm install firebase
   設定ファイルに以下のコードを追加:
   javascriptCopy// Import the functions you need from the SDKs you need
   import { initializeApp } from "firebase/app";
   import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyAWy5qoujArUCErkJ3ZSm8UVe56ExN4qJ0",
authDomain: "mahjong-calculator-d4162.firebaseapp.com",
projectId: "mahjong-calculator-d4162",
storageBucket: "mahjong-calculator-d4162.firebasestorage.app",
messagingSenderId: "945214755822",
appId: "1:945214755822:web:303b2d323bc9b137cb34ff",
measurementId: "G-BZ1NZNJWCS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

2. React アプリケーションの作成
   TypeScript テンプレートを使用して React アプリケーションを作成します。
   bashCopynpx create-react-app mahjong-calculator --template typescript

3. 必要なパッケージのインストール
   bashCopycd mahjong-calculator
   npm install firebase @chakra-ui/react @emotion/react @emotion/styled framer-motion

開発コマンド
プロジェクトディレクトリで以下のコマンドが利用できます：

npm start - 開発サーバーを起動
npm test - テストを実行
npm run build - 本番用にアプリをビルド
npm run deploy - アプリケーションをデプロイ
npm run eject - 設定ファイルを取り出す（※元に戻せないので注意）

開始方法
bashCopycd mahjong-calculator
npm start
