# GenU 5.5・法令検索v2 接続検証

確認日: 2026-09-28。GenU v5.5.0、Node.js 22.23.2。
ブランチ: `feature/law-v2-integration`。法令バックエンドv2.0.8。

## 旧法令AgentCore接続の削除（2026-09-29）

旧法令AgentCore Runtime向けの専用画面、Runtime ARN・CDK環境設定、独自stream event、
citation永続化、金融商品取引法の旧質問集と専用テストを削除した。公式GenUが提供する汎用の
AgentCore・Agent Builder機能は変更していない。

削除後にWebテスト16ファイル・295件、Web lint、TypeScript検査、production build、
CDK build、CDK test 6 suites・35件・snapshot 15件、`git diff --check`へ合格した。
`v5.5.0`との差分に旧Runtime名、ARN、独自AgentCore eventが残っていないことも確認した。

## 自動検証

- 接続実装時点のWebテスト: 24ファイル・316件通過（今回追加17件）。
- Web lint、TypeScript検査、production build、`git diff --check`: 通過。
- 既存のReact Router警告・一部テストのact警告、buildの大きなchunk等の警告は残る。
- 本番判定・loopback制限、認証情報を送らないAPI、IDのエンコードを検証。
- 応答紛失時の同一リクエスト再送、二重クリック防止、古い応答の破棄を検証。
- 処理中のポーリング、完了後の停止、GETによる再生成がないことを検証。
- 通常会話で分析APIを呼ばないこと、危険な引用URLをリンクにしないことを検証。
- 新規会話でAPIの先頭にある過去版の資料セットを勝手に選択しないことを検証。
- 質問集14問・レベル1〜5、仮定の改正フラグ、検索、回答後の新しい下書きへの切替、自動送信しないことを検証。
- 質問集のJSON全体を`local-rag-poc-law`側の原本と照合し、一致を確認。
- 会話・住民系業務の質問集・文書体系・分析の表示順を検証。

CDK・AWS用設定・バックエンド実装は変更していない。CDK deploy/synthは本段階では実行していない。

## 実API・ブラウザ

`http://127.0.0.1:18505/legal-rag`から、稼働中の`127.0.0.1:18000`へ接続した。

1. 保存済み会話`26850fc1c3b04d4f919c306587360117`を表示し、
   奈良市児童手当法施行細則第17条・児童手当法第8条の引用原文を表示した。
2. 新しい会話から次の質問を送信した。
   「奈良市の児童手当について、一般的な支払日と休日の場合の扱いを、保存された原文に基づいて教えてください。」
3. ポーリングで回答4記述・根拠2件を表示。要件5件の生成を確認した。
4. 会話URLの再読み込みで履歴・回答を復元し、再生成せず根拠を表示した。
5. 文書体系で「児童手当」を検索し、細則から祝日法・児童手当法・施行令・施行規則等への登録済み関係を表示した。
6. 質問集でレベル5を選び、仮定の改正2問を表示。設問-013の選択後、奈良市資料セットを保持して新しい下書きへ切り替わり、質問原文が入力欄に入ることを確認。送信・生成は実行しなかった。

識別子:

- conversation: `c267b46efb67441aa704cb2de6fb2f29`
- turn: `231dfe36aab6423d9a4c13cd279fcc18`
- run: `6ed0e646ad7c488ba7e71d216b9ba714`
- dataset: `ds-525fc301de3e54ecb868fdd41a329bbfc97135b1309202e1856b6ba1df717cd0`
- `processingStatus=completed`、`requirementsStatus=generated`、`error=null`
- `readyForSql=false`。要件側に支払期月・受給資格等の未確認事項が残るため、SQL準備完了と表示しない。

正常終了は法的正確性の保証ではない。実行記録には未読取画像・添付等の制約、
調査途中の未解決参照も残る。検索品質の評価は法令バックエンド側の課題と区別する。

## MCP実接続

`examples/law-v2/verify_mcp.py`をPython MCP SDK 1.30.0で実行。
`npx mcp-remote@0.14.3`のstdio→Streamable HTTP経路でinitialize、tools/list、
`list_law_datasets`を実行して成功した。次の4ツールが一致した。

- `list_law_datasets`
- `consult_law`
- `get_law_consultation_result`
- `get_law_requirements`

この検証でモデルを呼び出していない。GenU Agent BuilderのAWS Runtimeへの登録、
親モデルのツール選択、利用者認証・所有権の伝達は未検証。

## 未実施

AWS配置、S3・Neptune Analytics移行、Cognito接続、マルチユーザー分離、
既存AWS環境の更新、現行ローカルUIの全機能移植。
本段階の成果を「GenU AWS版が完成」と扱わない。
