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

## version管理

- GenU: `v5.5.0` / `a9e26efb3cb73c998a1385196dfcd93366683774`
- Node.js: `22.23.2`
- npm: `10.9.8`
- JavaScript依存関係: rootの`package-lock.json`を正本とし、installには`npm ci`を使用する
- Python依存関係: 各公式packageの`pyproject.toml`と`uv.lock`を正本として維持する

Node.jsは`.nvmrc`と`.node-version`、npmは`package.json`の`packageManager`と`engines`で固定する。
新規npm依存関係はexact versionで追加し、lockfileを同じcommitへ含める。

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

## 未実装

現時点では公式AgentCore chat UIによる基本連携までを対象とする。Streamlitにある質問準備度、Lv1〜3の例題、
検索詳細設定、raw citation、trace、Graph経路、例題評価の専用UIは別課題として段階的に実装する。

本システムは法務・RAGの検証用途であり、表示する回答によって法的判断を確定しない。
