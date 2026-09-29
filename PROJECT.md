# aws-genu-law-rag

公式GenU `v5.5.0`を基盤とする法令検索フロントエンドである。法令検索・会話管理の正本は
`local-rag-poc-law` v2.0.8とし、GenU側では検索、Graph、LLM処理を再実装しない。

## 接続構成

- 法令検索専用画面 `/legal-rag` → REST → `local-rag-poc-law`
- GenU Agent Builder → MCP → `local-rag-poc-law`

AWSでは東京リージョンのHTTPS APIへ接続し、GenUのCognito IDトークンを使う。
API Gatewayと法令バックエンドの両方でトークンを検証し、会話所有権を利用者ごとに分離する。
ローカル接続は従来どおりloopback限定・認証なしである。詳細は[接続手順](docs/ja/LAW_V2.md)を参照。

## 法令検索専用画面

専用画面は次を提供する。

- 資料セット選択と会話履歴（最新100件）
- 質問送信、処理状態の確認、確認質問への応答
- 回答記述、引用原文、保存済み文書へのリンク
- 住民系業務の質問集14問（レベル1〜5）
- 文書名検索と登録済みの直接関係
- 会話・調査実行の診断JSON
- 応答紛失時の同一ID再送、二重送信防止、古い応答の破棄

## ローカル起動

法令バックエンドを`127.0.0.1:18000`で起動した後、Node.js 22系で実行する。

```bash
nvm use
npm ci
npm run web:dev:law-v2
```

`http://127.0.0.1:18505/legal-rag`を開く。Viteが同一オリジンの`/law-api`をloopback APIへ転送する。
このREST接続はDEVビルドかつloopbackのブラウザーだけで有効になり、production buildでは有効にならない。

## AWS接続

CDKの`legalRagEndpoint`に東京リージョンのAPI Gateway HTTPS URLを設定すると、
production buildで`/legal-rag`を有効にする。許可する接続先は
`*.execute-api.ap-northeast-1.amazonaws.com`だけで、各リクエストにGenUのCognito IDトークンを付与する。
法令バックエンドのCognito User Pool、App Client、CORS originも同じGenU環境へ合わせる。

## version管理

- GenU: `v5.5.0` / `a9e26efb3cb73c998a1385196dfcd93366683774`
- Node.js: 22系
- JavaScript依存関係: rootの`package-lock.json`を正本とし、installには`npm ci`を使用する
- Python依存関係: 各公式packageの`pyproject.toml`と`uv.lock`を正本として維持する

## 検証

```bash
npm run web:lint
npm run web:test
npm run web:build
npm run cdk:build
npm run cdk:test
```

本システムは法務・RAGの検証用途であり、表示する回答によって法的判断を確定しない。
