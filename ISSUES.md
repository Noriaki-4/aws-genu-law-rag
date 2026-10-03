## v3移行

専用画面はAgentCore operation APIへ変更済み。現行手順は[LAW_V3.md](docs/ja/LAW_V3.md)。
以下はv2時点の履歴であり、FastAPI配置はv3では採用しない。AWS受入とMCPの利用者認証伝達は未完了。

# 課題管理

GenUは公式v5.5.0を維持し、法令検索・会話管理の正本は`local-rag-poc-law` v2.0.8とする。

| ID          | 状態                 | 内容                                                                                                         |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| GENU-V2-001 | 完了（ローカル接続） | 専用画面からRESTで資料セット・会話・新規回答生成・根拠・要件・文書関係・分析に接続                           |
| GENU-V2-002 | 一部完了             | GenUと同じstdio→HTTP経路でMCP 4ツールの検出・資料一覧を検証。AWS上の接続・親モデルによるツール呼出しは未検証 |
| GENU-V2-003 | 未対応               | FastAPIのAWS配置、S3・Neptune Analytics接続、Cognitoとサーバー側の会話所有権、MCPへの利用者伝達              |
| GENU-V2-004 | 一部完了             | 住民系質問集14問・レベル1〜5を移植。複数段グラフ、分析専用ビュー・出力等は未対応                             |
| GENU-V2-005 | 未対応               | 認証済みREST・MCP接続を統合環境で検証し、マルチユーザー分離と障害時の挙動を確認                              |
| GENU-V2-006 | 未対応               | Agent Builder Runtimeから法令MCPへ、利用者ごとのCognito IDトークンを安全に伝達する                           |

[操作・設計](docs/ja/LAW_V2.md)・[検証記録](docs/ja/LAW_V2_VERIFICATION.md)。

現在の無認証APIを公開し、Cognitoの画面だけで保護した扱いにはしない。

## GENU-V2-006 Agent Builderから法令MCPへの利用者認証伝達

### 現状

- 法令バックエンドの`/mcp`はCognito認証必須であり、未認証のMCP initializeは2026-09-29のAWS実測で`401 Unauthorized`となる。
- GenUの専用画面はログイン利用者のCognito IDトークンをRESTへ付与できるが、Agent Builder RuntimeからMCPクライアントへ同じトークンを渡す経路は未実装である。
- 現在のAWS設定では`agentBuilderEnabled: false`で、Agent Builder用MCP設定にも法令バックエンドを登録していない。
- 共有トークンを使うと全利用者が同じCognito `sub`として扱われ、S3上の会話・turn・要件の所有者分離を維持できない。

### 対応方針

- GenUの認証済みリクエストから、呼出利用者のCognito IDトークンを実行単位でAgent Builder Runtimeへ伝達する。
- RuntimeのMCPリクエストへ`Authorization: Bearer <ID token>`を付与し、固定APIキーや共有Cognitoトークンへ置き換えない。
- トークンをGit、CDK設定、CloudWatch Logs、S3の会話・診断記録へ保存しない。
- トークンの期限切れ・欠落・不正時は認証エラーとして利用者へ返し、無認証接続へフォールバックしない。

### 完了条件

- Agent Builderから法令MCPの4ツールを認証付きで一覧・呼出しできる。
- 2利用者で会話・turn・要件・実行記録が相互に参照できず、それぞれのCognito `sub`へ保存される。
- 未認証・期限切れ・別User Poolまたは別App Clientのトークンが拒否される。
- ログ、保存オブジェクト、生成物へIDトークンが残っていないことを確認する。
