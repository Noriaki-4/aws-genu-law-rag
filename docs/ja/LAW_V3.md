# 法令検索v3をGenU 5.5へ接続する

検索・Graph・LLM処理の正本は`local-rag-poc-law-v3` v3.0.0。GenUは表示と通信を担当する。
専用画面は独自FastAPI REST APIへの接続を廃止し、AgentCore SDKのoperation APIを呼び出す。

## ローカル

バックエンドのRUNBOOKに従い、SDKアプリを`127.0.0.1:18000`で起動する。既存文書を再seedしない。
Node.js 22系で`npm ci`後、`npm run web:dev:law-v3`を実行し、
`http://127.0.0.1:18505/legal-rag`を開く。Viteは`/law-api/invocations`を
`http://127.0.0.1:18000/invocations`へ転送する。
DEVビルド・`local-runtime`設定・loopbackブラウザでのみ有効。AWS資格情報やCognitoトークンは送らない。

## AWS

CDKの`legalRagEndpoint`に、東京リージョンのHTTP Runtimeの呼出しURLを設定する。

```
https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/<URLエンコード済みRuntime ARN>/invocations?qualifier=DEFAULT
```

[公式のOAuth呼出し形式](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html)を使用する。
旧v2のAPI Gateway URLは`cdk.json`・`parameter.ts`から外し、接続先を未設定（null）にした。
実RuntimeのARNが確定したら、使用する環境の`legalRagEndpoint`へ上記URLを設定する。未設定時はAWSの専用画面を有効化しない。

GenUのCognito IDトークンとRuntime session IDヘッダーを付け、POSTで送信する。
RuntimeのJWT authorizerとバックエンドの所有者検証を同じUser Pool・App Clientへ合わせる。
CORSはGenUのoriginを許可する。会話ごとに同じsession IDを使用し、データの正しさはバックエンド保存層が保証する。
AWS実デプロイ・Cognito実トークン・2利用者の所有権分離は別途受入確認が必要。

## 契約

要求は`operation`・`conversationId`・`requestId`・`expectedRevision`・`payload`。
`submitTurn`では既存のclientRequestIdをrequestIdへ写像し、応答紛失時の再送でも変更しない。
結果は`result`から取得し、HTTPエラーは既存の利用者向けエラー表示へ渡す。
資料セット・会話履歴・ターンのポーリング・引用原文・分析を引き継ぐ。
本文はJSON内のテキスト、分析ZIPはbase64をBlobへ変換する。保存XMLは実行せずプレーンテキストとして表示する。
通常会話は`toolOutput: false`を維持し、GenU側でLLMを再実行しない。

## Agent BuilderのMCP

SDKのHTTPアプリとは別入口のMCPアプリを、ローカルでは`127.0.0.1:18001/mcp`で起動する。
既存の`examples/law-v2/mcp.local.json`はこのv3入口へ更新済み（ディレクトリ名は過去の検証資材との互換のため維持）。
AWSではMCP用Runtimeへ接続する。利用者JWTをAgent Builderから伝達する経路は未実装であり、共有資格情報で所有権分離済みとは扱わない。
旧v2の検証履歴は`LAW_V2.md`に残す。

## 検証（2026-10-04）

- Node.js 22.23.2でWeb UIテスト285件、Web型チェック・production build、変更ファイルのESLint、CDK buildに成功。
- CDK関連テスト6件・テンプレートsnapshot 15件に成功。Endpointの東京Runtime限定検証を更新した。
- 実v3 SDKアプリへGenUのUIから接続し、資料セット・履歴・保存済み回答・引用原文・会話使用量の取得を確認した。
- GenUから奈良市の印鑑登録資格を新規送信し、処理中表示から回答・条例第2条の根拠表示まで確認した。バックエンドは会話整理Haiku 4.5、選定・読解・回答Sonnet 4.6。
- XMLの非実行Blob変換・分析ZIPのbase64変換・再送IDとrevision・abort・409・Cognitoヘッダーは単体試験で確認。AWS実接続、MCP Runtimeとの接続は未実施。
