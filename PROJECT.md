# aws-genu-law-rag

`local-rag-poc-law-aws`の利用者向けフロントエンドで、ローカル版のStreamlitをGenUへ置き換えるための
プロジェクトである。初期実装は公式GenU `v5.5.0`を基準とする。

## 現在の連携先

- AWS account: `035351467732`
- GenU / model / AgentCore region: `ap-northeast-1`
- AgentCore Runtime: `LocalRagLawPoc`
- Runtime ARN: `arn:aws:bedrock-agentcore:ap-northeast-1:035351467732:runtime/LocalRagLawPoc-9vW35wDaXG`

GenU自身ではGeneric AgentCore Runtimeを新規作成せず、上記の外部Runtimeを呼び出す。Runtime側が
OpenSearch Serverless、Neptune Analytics、S3、Bedrockとの接続と法令検索処理を担当する。

## 法令RAG画面

`/legal-rag`にStreamlit代替の専用画面を置く。サイドメニューの「法令RAG」から開き、
利用者はRuntimeやモデルを選択せずに質問できる。画面は次を提供する。

- 対応している法令・ガイドラインの範囲
- 金融商品取引法のLv.1・2を収録した質問集（9問）
- 質問集ポップアップでのレベル・分野・キーワード絞り込み、質問欄への反映
- 検索前の質問整理と、確認候補から選んだ修正版の質問欄への反映
- Cognito認証済み利用者から外部AgentCore Runtimeへのstreaming chat
- 回答本文に投影された根拠資料と、Runtimeが送る調査状況のtrace表示
- 会話のリセット

画面コードへRuntime ARNを埋め込まない。`agentCoreExternalRuntimes`から`LocalRagLawPoc`を選び、
環境に外部Runtimeが1件だけなら名称変更後もそのRuntimeを使用する。複数の外部Runtimeが存在し、
`LocalRagLawPoc`がない場合は誤接続を避けるため法令RAG画面を有効化しない。

## version管理

- GenU: `v5.5.0` / `a9e26efb3cb73c998a1385196dfcd93366683774`
- Node.js: 22系（ローカルの推奨版は`.nvmrc`と`.node-version`を参照）
- npm: Node.js 22系に同梱される版
- JavaScript依存関係: rootの`package-lock.json`を正本とし、installには`npm ci`を使用する
- Python依存関係: 各公式packageの`pyproject.toml`と`uv.lock`を正本として維持する

ローカルのNode.js推奨版は`.nvmrc`と`.node-version`で示す。npm自体は完全固定せず、
依存関係は`package-lock.json`と`npm ci`で再現し、lockfileを変更と同じcommitへ含める。

## 初期化と検証

```bash
nvm use
npm ci
npm run test
npm run web:build
npm run cdk:build
npm run cdk:test
```

AWSへdeployする前に`packages/cdk/cdk.json`と`packages/cdk/parameter.ts`の`law-rag-poc`設定が一致し、
対象Runtime ARNが現行環境と一致することを確認する。

バックエンドやCognitoなしで画面だけを確認する場合は、次の開発専用モードを使う。

```bash
npm run web:preview:legal-rag
```

`http://127.0.0.1:5173/legal-rag`を開く。このモードの認証バイパスはViteの`DEV`ビルドでのみ有効で、
production buildでは有効にならない。質問送信は実行せず、画面表示と入力操作の確認に使用する。

## 残るStreamlit差分

選択式問題、検索詳細設定、Graph経路の可視化、例題の自動評価はAgentCore wire contractに現在含まれないため
未実装である。citationは本文とContent Unit IDを構造化イベントで受け取り、回答ごとに個別展開できる。
Runtimeが固定する検索・モデル設定を一般利用者へ公開するかを先に決め、必要な構造化結果だけを
AgentCore adapterから返す。

本システムは法務・RAGの検証用途であり、表示する回答によって法的判断を確定しない。
