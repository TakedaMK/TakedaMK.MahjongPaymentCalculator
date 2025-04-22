# 麻雀計算ツール

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9.x-orange.svg)](https://firebase.google.com/)

## 概要

麻雀会のためのスコア計算・管理ツールです。React + TypeScript + Firebase で構築されています。

## 環境構築手順

### 前提条件

- Node.js (v16 以上)
- npm (v8 以上)
- Git

### 1. プロジェクトのセットアップ

```bash
# プロジェクトの作成
npx create-react-app mahjong-calculator --template typescript
cd mahjong-calculator

# 必要なパッケージのインストール
npm install firebase @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

### 2. Firebase 設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Web アプリケーションを追加
3. 以下の設定を`src/firebase/config.ts`に追加:

```typescript
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
```

### 3. 環境変数の設定

1. プロジェクトルートに`.env`ファイルを作成
2. 必要な環境変数を設定:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## 開発コマンド

| コマンド         | 説明                                        |
| ---------------- | ------------------------------------------- |
| `npm start`      | 開発サーバーを起動（http://localhost:3000） |
| `npm test`       | テストを実行                                |
| `npm run build`  | 本番用にアプリをビルド                      |
| `npm run deploy` | アプリケーションをデプロイ                  |

## プロジェクト構造

```
mahjong-calculator/
├── src/
│   ├── components/    # Reactコンポーネント
│   ├── firebase/     # Firebase設定
│   ├── hooks/        # カスタムフック
│   ├── types/        # TypeScript型定義
│   └── utils/        # ユーティリティ関数
├── public/
└── package.json
```

## 技術スタック

- **フロントエンド**

  - React 18
  - TypeScript 4.9.5
  - Chakra UI
  - Emotion

- **バックエンド**
  - Firebase
    - Authentication
    - Firestore
    - Hosting

## ライセンス

MIT
