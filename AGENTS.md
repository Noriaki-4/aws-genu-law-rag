# AGENTS.md

## Project boundary

- このリポジトリは`local-rag-poc-law-aws`のGenUフロントエンドである。
- upstreamの基準は`UPSTREAM.md`に記録した公式GenU `v5.5.0`とする。
- `aws-genu-sqlbot`からsource、設定、commitを移植しない。参考情報と実装の由来を混在させない。
- backendの検索・Graph・LLM処理を再実装せず、AgentCore Runtimeとの契約を境界にする。

## Changes

- 公式のディレクトリ構成、`CONTRIBUTING.md`、各`CODING_RULES.md`を優先する。
- upstream追従とプロジェクト固有機能を同じcommitへ混在させない。
- dependency追加前に既存依存関係で実現できないか確認する。
- `package-lock.json`を必ずcommitし、installとCIには`npm ci`を使用する。
- Node.js、npm、GenUの固定versionを変更するときは`PROJECT.md`と`UPSTREAM.md`も更新する。
- UI文言は英語・日本語のi18n resourceへ追加し、法的判断を断定する表現を避ける。

## Verification

- Node.js `22.23.2`、npm `10.9.8`を使用する。
- 変更範囲に応じてlint、test、Web build、CDK build・test・synthを実行する。
- AgentCore連携変更ではrequest、event stream、citation、利用者向けerrorの表示を確認する。
