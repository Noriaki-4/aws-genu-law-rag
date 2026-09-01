# Upstream policy

このプロジェクトは、AWS公式のGenerative AI Use Cases（GenU）を法令RAGのフロントエンドとして利用する。

## 基準version

- upstream: `https://github.com/aws-samples/generative-ai-use-cases.git`
- tag: `v5.5.0`
- commit: `a9e26efb3cb73c998a1385196dfcd93366683774`
- 初期取得日: `2026-09-01`

`aws-genu-sqlbot`は設計上の注意点を確認するための参考に限り、source、設定、commitをこのプロジェクトへ
移植しない。変更は公式`v5.5.0`との差分として追跡する。

## 更新方法

1. `upstream` remoteから対象tagを取得する。
2. release noteと公式tag間差分を確認する。
3. 一時branchで対象tagをmergeし、法令RAG固有差分との競合を解消する。
4. `npm ci`、lint、test、Web build、CDK build・test・synthを実行する。
5. AgentCore Runtimeとのrequest、stream、citation表示を検証してからversionを更新する。

upstreamの追従と法令RAG固有機能の追加を同じcommitで行わない。
