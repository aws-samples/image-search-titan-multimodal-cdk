# 概要

このドキュメントでは、サンプルコードの構成を説明します。サンプルコードのカスタマイズなどにご活用ください。

## 主要な利用技術

- Amazon Bedrock
    - 画像およびテキストの埋め込みに [Titan Multimodal Embeddings](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-multiemb-models.html) を使用しています。
- Amazon OpenSearch Serverless
    - リアルタイムのアプリケーションモニタリング、ログ分析、ウェブサイト検索などの幅広いユースケースにご利用いただける 100% オープンソースの検索・分析サービスのサーバレス版です。
    - ベクトル検索に使用しています。


## ディレクトリ構成

重要なファイル・ディレクトリのみ記載しています。

```bash
root/packages/cdk/
├── bin/                                  # エントリーポイントとなるコードを格納
│   └── image-search-multimodal.ts        # CDK のエントリーポイント
├── cdk.json                              # CDK の定義情報
├── lambda/                               # Lambda 関数で実行するコードを格納
│   ├── index-images/                     # 画像をベクトル化して OpenSearch のインデックスに登録する Lambda 関数
│   └── search-image/                     # 類似画像検索を実行する Lambda 関数
├── lib/                                  # CDK のコードを格納
│   ├── construct/                        # 部品化 （Construct）したコードを格納
│   └── image-search-multimodal-stack.ts  # 今回のメインとなる Stack
└── package.json                          # npm package の管理


root/packages/web/
├── public/             # 公開する静的ファイルを格納
├── src/                # コードベースを格納
│   ├── components/     # 画面部品（コンポーネント）を格納
│   ├── App.tsx         # アプリケーションのエントリーポイント（アプリ全体の共通処理を実装）
│   ├── index.css       # スタイル定義のための CSS ファイル
│   ├── main.tsx        # React のエントリーポイント（アプリの設定情報などを定義）
│   └── vite-env.d.ts   # env の型定義
├── index.html          # Client から一番最初にダウンロードされるファイル
└── package.json        # npm package の管理
```

## カスタマイズ例

### 検索対象の画像を変えたいとき

Amazon OpenSearch Serverless の index に登録する画像と、アプリから参照する画像配信元の S3 に保存する画像を変更する必要があります。それぞれ以下の手順で実施して下さい。

CDK スタックをデプロイする前に以下の手順を実施してからデプロイ手順を実行して下さい。

#### (1) index に登録する画像の変更

images フォルダの中に画像を入れて、そのフォルダを zip 圧縮したファイルをどこかにアップロードし、その URL を `packages/cdk/cdk.json` の `imageDownloadURL` に記載して下さい。

> `packages/cdk/lambda/index-images/index.py` でその zip ファイルをダウンロード、解凍し、画像を embedding して index に登録しています。

#### (2) 画像配信元の S3 に保存する画像の変更

デプロイ手順「3. 画像の取得」で指定する zip ファイルの URL を上記 (1) で作成した zip ファイルのものに置き換えて実行して下さい。

> 一度 CDK スタックをデプロイした後で画像を差し替えたい場合は、Amazon OpenSearch Serverless の index を削除してから上記 (1) の手順を実施後、デプロイ手順「6. OpenSearch Serverless Collection の index 作成とデータの登録」の手順を実行して下さい。また、ImageStore がバケット名に含まれる S3 bucket の images フォルダをいったん削除してから再度 images フォルダを作成し、その中に差し替えたい画像をアップロードして下さい。

EOF