# 課題管理

| ID         | 優先度 | 状態     | 課題                            | 完了条件                                                                                                                                                                |
| ---------- | ------ | -------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GENU-001` | P0     | 検証待ち | 外部AgentCore Runtimeとの実連携 | 認証済み利用者が質問を送信し、streaming回答、citation、errorをGenU上で確認できる                                                                                        |
| `GENU-002` | P0     | 対応中   | 公式v5.5.0依存関係の脆弱性対応  | `npm audit`のproduction影響を判定し、必要な安全更新を独立commitで適用してbuild・test・CDK synthに合格する                                                               |
| `GENU-003` | P1     | 対応中   | Streamlit固有機能の段階的移行   | 専用画面、対応範囲、Lv1〜3の質問集15問、質問整理、AgentCore chatを実装した。選択式、検索詳細、raw citation、Graph経路、例題評価の採否と実装順を決め、必要なUIを検証する |

## 法令検索v2への接続（2026-09-28）

旧AWS版の上記課題と、v2.0.8への接続は別に管理する。GenUはv5.5.0を維持。

| ID | 状態 | 内容 |
| --- | --- | --- |
| GENU-V2-001 | 完了（ローカル接続） | 専用画面からRESTで資料セット・会話・新規回答生成・根拠・要件・文書関係・分析に接続。既存AgentCore画面は維持 |
| GENU-V2-002 | 一部完了 | Agent Builderと同じstdio→HTTP経路でMCP 4ツールの検出・資料一覧を検証。AWS Runtime上の接続・親モデルによるツール呼出しは未検証 |
| GENU-V2-003 | 未対応 | FastAPIのAWS配置、S3・Neptune Analytics接続、Cognitoとサーバー側の会話所有権、MCPへの利用者伝達 |
| GENU-V2-004 | 一部完了 | 住民系質問集14問・レベル1〜5を移植。複数段グラフ、分析専用ビュー・出力等は未対応 |

[操作・設計](docs/ja/LAW_V2.md)・[検証記録](docs/ja/LAW_V2_VERIFICATION.md)。既存AWS環境の切替・デプロイはしていない。

## 旧AWS版の確認記録

| 日付       | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | 公式GenU `v5.5.0` / `a9e26efb3cb73c998a1385196dfcd93366683774`から新規作成。SQLbotからの移植なし。Node.js `22.23.2`、npm `10.9.8`を固定し、東京の既存AgentCore Runtimeを設定                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-01 | 固定toolchainでの初回`npm audit`は34件（low 7、moderate 12、high 14、critical 1）。自動修正は適用せず、`GENU-002`でproduction到達性と上流更新を確認する                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-01 | version検証、Web test 278件、Web production build、CDK build、CDK test 37件・snapshot 15件、CDK lint、Lambda dry-run、offline synthに合格。生成templateで外部Runtime ARN、invoke権限、Web環境変数を確認。AWS deployは未実施                                                                                                                                                                                                                                                                                                                           |
| 2026-09-01 | `/legal-rag`専用画面、ホーム・メニュー導線、対応範囲、Lv1〜3例題、固定外部Runtimeへのstreaming chat、日英文言を実装。専用テスト6件を含むWeb test 284件、Web lint、production build、CDK build・test・synthに合格。AWS実通信は`GENU-001`として未確認                                                                                                                                                                                                                                                                                                   |
| 2026-09-01 | StreamlitのLv1〜3設問を全15問収録。質問集をポップアップ化し、レベル・分野・キーワード絞り込み、入力欄反映、想定参照先・法令時点の折りたたみを実装。Lv4は収録していない                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-02 | `law-rag-poc`環境をaccount `035351467732` / `ap-northeast-1`へdeployし、Web URL `https://d31oqjx3oth5u2.cloudfront.net`の`/`と`/legal-rag`がHTTP 200であることを確認。配信bundleに外部Runtime名・ARNが含まれ、Cognito authenticated roleは同Runtimeだけへの`bedrock-agentcore:InvokeAgentRuntime`を持つ。Runtime version 5 / `READY`に対し、GenUと同じ`DEFAULT` qualifier・payloadで通常質問のStrands回答・引用と`question_readiness`の構造化結果を実invokeで確認した。認証済みブラウザ上のstreaming表示・error表示は`GENU-001`として引き続き確認する |
