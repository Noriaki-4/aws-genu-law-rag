# 法令検索v2をGenU 5.5へ接続する

## 採用する境界

GenUは公式v5.5.0を維持する。法令検索・会話管理の正本は
`Noriaki-4/local-rag-poc-law` v2.0.8（初期接続基準commit `3fbe48f`）。
旧AWSバックエンドの検索ロジックやOpenSearchを持ち込まない。

- 専用画面 → REST → 法令バックエンド
- Agent Builder → MCP → 同じ法令バックエンド
- FastAPIの単一writer・会話状態・検索処理を共有し、MCP用の別writerを起動しない。

この段階で実装するのはローカル接続。AWS移行・認証の完成を意味しない。
既存の外部AgentCore Runtime設定と旧画面は変更せず、通常ビルドでは従来どおり使う。

## 専用画面のローカル動作確認

1. 法令バックエンドをそのリポジトリのRUNBOOKに従って起動する。
   `http://127.0.0.1:18000/health` がversion `2.0.8`を返すことを確認する。
   既存の文書セットを使い、再seedしない。
2. このリポジトリでNode.js 22系を選び、初回は`npm ci`する。
3. `npm run web:dev:law-v2`を実行し、`http://127.0.0.1:18505/legal-rag`を開く。

Viteが同一オリジンの`/law-api`を固定のloopback APIへ転送する。
バックエンドにCORS許可や認証バイパスを追加しない。Cognitoトークンも送らない。
この接続はDEVビルドかつloopbackのブラウザだけで有効。
`VITE_APP_LEGAL_RAG_TRANSPORT=local-rest`をproduction buildへ渡しても有効にならない。
ローカルサーバーを外部公開・トンネル公開しない。

### 対応範囲

- 資料セット選択、会話一覧（最新100件）、URLの会話IDから再開
- 住民系業務の質問集14問（レベル1〜5）。難易度・キーワードで絞り込み、編集可能な入力欄へ反映
- 質問送信、処理状態のポーリング、確認質問への応答
- 回答記述と引用原文、保存した文書版へのリンク
- 保存済み要件とSQL準備状態（SQLの生成・実行はしない）
- 文書名検索、登録済みの直接関係をたどる表示
- 分析タブで会話・調査実行の診断JSON。通常会話では分析APIを呼ばない
- 応答紛失時の同一ID再送、二重クリック防止、画面切替後の古い応答の破棄

新規会話は`toolOutput: true`。要件生成の分だけ通常会話よりモデル呼出しが増える。
保存済み会話の閲覧・要件取得は再生成しない。既存の通常会話をツール会話へ変更しない。
送信応答が不明な場合は「未確認の送信内容を復元」で同じ内容を再送する。
新規会話作成自体の応答紛失では空の会話が残る可能性があるが、質問の自動再送はしない。

現行ローカルUIの完全移植ではない。複数段グラフ表示、診断の専用ビュー、
分析ZIP・回答ダウンロード等の操作は後続。分析のJSON表示と機能完成を混同しない。

### 質問集の由来と動作

`local-rag-poc-law` commit `3fbe48f`の`examples/resident-questions/questions.json`を
`packages/web/src/features/legalRag/residentQuestions.json`へ原文のまま収録した。
実行時に別リポジトリへ依存しない。日本語の質問原文は翻訳せず、操作UIは日英対応する。
質問集選択はモデルを呼ばない。回答済みなら同じ資料セットの新規会話の下書きへ切り替える。
処理中・応答未確認の送信がある間は適用できない。自治体情報のない資料セットへの適用も禁止する。
自治体情報があることだけで全14問の資料が収録済みとは扱わず、画面で注意を表示する。
レベル5の2問は仮定の改正として明示し、現行法の改正済み事実とは扱わない。

更新時の原本照合:

```bash
node examples/law-v2/check_resident_questions.mjs /path/to/local-rag-poc-law/examples/resident-questions/questions.json
```

## Agent Builder向けMCP

GenU 5.5の既存`ToolManager`はstdioのMCPクライアントを起動する。
既存Runtimeでも使っている`mcp-remote`で、v2.0.8のStreamable HTTPへ橋渡しする。
独自のプロトコル実装や別の法令エージェントは追加しない。

`examples/law-v2/mcp.local.json`はローカル検証用の登録例。
プロキシを`0.14.3`へ固定し、既存AWS用のMCP一覧には自動登録しない。
Python MCP SDK `1.30.0`がある環境から次を実行する（モデルは呼ばない）。

```bash
python examples/law-v2/verify_mcp.py
```

Node.js 22系の`npx`をPATHに置く。初回は指定版のプロキシを取得する。
4ツールの検出と資料セット取得を、GenUと同じstdio→HTTPの経路で確認する。
Agent Builder Runtime上からの呼出しや親モデルのツール選択は、この検証には含まない。

Agent Builderへの指示には次を含める。

- 初回は資料セットを確認し、`consult_law`へ質問・dataset_id・一意のrequest_idを渡す。
- 処理中は返された`retryAfterSeconds`以上待ち、同じconversation_id・turn_idで結果取得する。
- 応答紛失時はrequest_idと入力を変更しない。別の質問には新しいrequest_idを使う。
- 確認質問を利用者へ返し、同じconversation_idで会話を継続する。
- `failed`や`incomplete`を成功と説明しない。`readyForSql`は実行許可ではない。

## AWS接続前の必須作業（未実装）

1. FastAPIを単一replicaで配置し、プロセス内writerを共有する。
2. S3・Neptune Analyticsアダプターと文書・関係の移行検証を実装する。
3. Cognito認証と会話・実行・要件の所有権検査をサーバー側で実装する。
   ブラウザの任意userIdや会話IDの知識を権限とみなさない。
4. RESTの認証済み経路と、Agent Builder側の認証・利用者伝達を設計・検証する。
   共有MCP資格情報だけでは利用者ごとの会話分離にならない。
5. 認証済みHTTPSのMCP接続先を登録し、Agent Builderを有効化する。
   AWSコンテナのlocalhostは開発PCではない。ローカル設定をそのままデプロイしない。
6. 接続先・権限・会話分離・障害時の挙動を確認後、既存環境とは分けてデプロイする。

現在の無認証APIを公開し、Cognitoの画面だけで保護した扱いにはしない。
AWSのスタック作成・課金リソース変更・旧環境の切替は本段階では実施しない。
