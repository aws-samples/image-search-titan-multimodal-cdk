# How to use this sample

このドキュメントでは、サンプルコードをデプロイし、写真検索アプリの構築と動作確認をするところまでの手順を説明します。

## 想定環境

本サンプルは CDK を使って実装されています。CDK のプロジェクトをデプロイするには、以下の環境が必要です。事前に環境のセットアップを実施してください。なお、AWS Cloud9 を使うと、これらの環境構築が済んでいるためデプロイ手順 1 からすぐに開始できます。

### 1. Amazon Bedrock のモデルアクセス設定

- **このサンプルは、デフォルトでバージニア北部 (us-east-1) リージョンの Titan Multimodal Embeddings モデルを利用する設定になっています。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Manage model access」 → 「Titan Multimodal Embeddings にチェック」 → 「Save changes」 と操作して、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: 「Titan) を利用できる状態にしてください。すでにチェックされていて Access status が「Access granted」と表示されている場合はこの作業は不要です。**
- 上記の手順を行わずに Amazon Bedrock にリクエストすると、「403 Forbidden」エラーが発生します。
- 他のリージョンを使いたい場合は、使いたいリージョンで上記手順を実行のうえ `packages/cdk/cdk.json` の `bedrockRegion` を書き換えて下さい。

### 2. CDK 実行環境のセットアップ

- Docker: docker コマンドを実行できる状態に環境をセットアップしてください。Docker Desktop を業務利用する場合は多くの場合 [サブスクリプション契約が必要](https://www.docker.com/legal/docker-subscription-service-agreement/) ですのでご注意ください。なお AWS Cloud9 などにインストールされている DockerEngine 自体は無料で利用可能です。
- Node.js: npm コマンドを実行できる状態に環境をセットアップしてください。
- [AWS 認証情報の設定](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
- [aws cli](https://aws.amazon.com/jp/cli/)

※作業環境の差異による影響を可能な限り排除するため、[AWS Cloud9](https://aws.amazon.com/jp/cloud9/) での作業を推奨します。
AWS Cloud9 で CDK を使うには、容量の拡張等が必要です。以下のいずれかお好みの方法で環境を作成してください。1.の方法は GUI ベースの方法でわかりやすい一方、手作業が比較的多めです。一方 2.の方法は CUI ベースでスクリプトにより自動化されているため、手作業は比較的少なめです。アプリをデプロイしたいリージョンで手順を実行して下さい。

1. [AWS マネージメントコンソールを利用した方法](https://catalog.workshops.aws/building-with-amazon-bedrock/en-US/prerequisites/cloud9-setup)

- インスタンスタイプ t3.small (2 GiB RAM + 2 vCPU) 、Amazon Linux2 で動作確認しました。
- デフォルトのストレージサイズ（10GB）で動作確認済みですが、もしストレージ不足のエラーが出た場合はストレージサイズを変更して下さい。ストレージサイズ変更方法は [こちらのドキュメント（英語版）](https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html#move-environment-resize) をご参照ください。20GiB あれば十分です。

2. [CloudShell を利用した方法](https://github.com/aws-samples/cloud9-setup-for-prototyping)

## Scope of this sample

写真検索アプリケーションはブラウザアプリとして利用可能です。検索キーとなる画像かテキストを指定すれば、それらと類似する画像がブラウザに表示されます。

ベクトル検索機能として Amazon Opensearch Serverless を使用しています。また、画像の embedding（ベクトルへの変換）は Amazon Bedrock の Titan Multimodal Embeddings モデルを使用しています。

<img src="imgs/architecture.png" width="700px">

## How to deploy

以下の手順に従ってサンプルをデプロイしてください。

### 1. パッケージインストール

必要なパッケージをインストールします。プロジェクトのルート `root/` (package.json が存在するディレクトリ)にて以下のコマンドを実行してください。以降の手順もルートディレクトリで実行してください。

```bash
npm ci
```

### 2. 事前準備

`packages/cdk/cdk.json`にパラメータを設定します。下記の通り設定してください。

- stackNamePrefix（任意）
  - サンプルコードを使用するプロジェクト名（変更しなくても OK）。作成されるスタック名に使用。**複数名で同じ AWS アカウントに本サンプルをデプロイする場合は各自異なるテキストを指定してください。**

アクセス制限関連の設定値は、状況に合わせて必要であれば変更して下さい。

- apiAccessSourceIp（任意）
  - API Gateway が許可する IP アドレスのを設定します。search API の実行もとの IP アドレス範囲を変更したい場合はこちらを変更してください。デフォルトでは全ての IP アドレスを受け入れるよう設定されています。
- allowedApiCallOriginList（任意）
  - CORP の Origin 許可を設定します。CORS とは、ウェブサイトが別のオリジンのリソースにアクセスすることをブラウザが制限する仕組みです。CORS の Origin とは、リクエストを送信するウェブサイトのオリジン（プロトコル、ホスト名、ポート番号）のことです。https://example.com、http://localhost:5173 のように指定します。CORS で許可されていない Origin からのクロスオリジンリクエスト（異なる Origin へのアクセス）は、ブラウザによってブロックされます。アクセスを許可したい Origin のみを指定することで、想定外の Origin からのアクセスを防ぐことができます。デフォルトでは全ての Origin を受け入れるよう設定されています。

### 3. 画像の取得

以下のコマンドを実行して、検索対象の画像一式をプロジェクトのルートディレクトリ（docsフォルダと同じ階層）にダウンロードしてください。

```bash
wget https://d1.awsstatic.com/Developer%20Marketing/jp/magazine/sample/2024/images.2dd13d52369e3b347b9450315d69d7e819e55834.zip -O images.zip
```

### 4. CDK のセットアップ

CDK のセットアップをします。
この作業は、AWS アカウントのあるリージョンで初めて CDK を利用する際に必要になります。
今回は東京リージョン (ap-northeast-1) にデプロイすることを想定しているため、以下の通り実行します。数分程度で完了します。

```bash
npx -w packages/cdk cdk bootstrap
```

### 5. CDK スタックのデプロイ

下記コマンドにて CDK スタックのデプロイとリソース情報の出力を行います。デプロイには 5-10 分程度かかります。

AWS CDK はセキュリティ関連の変更をデプロイする前にユーザに承認を求めます。デプロイコマンドを実行したあと、承認のために y/n の入力を聞かれたら y を入力してエンターキーを押してください。承認をスキップしたい場合は、デプロイコマンドの最後に `-- --require-approval never` を追加してください。

```bash
npm run cdk:deploy
```

承認をスキップする場合のデプロイコマンド：
```bash
npm run cdk:deploy -- --require-approval never
```

デプロイが完了するまでに 10分ほどかかります。デプロイが完了すると、ログ出力の最後の方に `Outputs:` というセクションが表示されます。ここに表示されている情報はあとの手順で使用するので、テキストエディタなどにコピーしておいてください。

### 6. OpenSearch Serverless Collection の index 作成とデータの登録

以下のコマンドを実行して、images フォルダの中の画像をベクトルに変換して Amazon OpenSearch Serverless Collection の index に登録してください。
コマンドの最後にある `[lambda function name]` には、cdk スタックをデプロイした際にターミナルに表示される `Outputs:` にある `...indexImagesFunctionName...` に書かれた Lambda 関数名に置き換えてください。

```bash
aws lambda invoke output.txt --cli-read-timeout 0 --function-name [lambda function name]
```

数分ほど待つと、以下のようなログが表示されます。これが表示されたら、すべての準備が整ったことになります。

```bash
{
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}
```

## 動作確認

CDK スタックのデプロイが完了し、OpenSearch の index にデータを登録したら、以下の手順で動作確認を実行してください。動作確認の際は、デプロイ手順「3. 画像の取得」でダウンロードした zip ファイルを解凍して得られた images フォルダの中の画像を使ってください。

### 1. 写真検索アプリにアクセス

CDKスタックデプロイ時に `Outputs:` に表示された `...WebAppDomain...` のテキストをコピーしてブラウザのアドレスバーに貼り付けてください。写真検索アプリの画面が表示されます。

### 2. 写真で検索

まずは写真を検索クエリとして検索してみましょう。「ファイルを選択」ボタンをクリックして、images フォルダの中の JPEG ファイルを選択してください。その後、青い「Search」ボタンをクリックして検索を実行してください。

> 指定した写真に似た猫が表示されたでしょうか？何も表示されない場合は、Amazon OpenSearch Serverless コレクションのインデックスにデータを登録できていない可能性があります。Amazon OpenSearch Service のコンソールから、デプロイしたコレクションを選択して「Monitor」タブの中の「Total documents」が 229 になっていればデータの登録は成功しています。

### 3. テキストで検索

いったん水色の「Clear」ボタンをクリックして画面をまっさらにしてから、今度はテキストボックスに「black cat」と入力して「Search」ボタンをクリックして下さい。黒猫の写真が表示されるはずです。

### 4. 写真とテキストで検索

「Clear」ボタンをクリックして画面をまっさらにしてください。その後、「ファイルを選択」ボタンをクリックして「image_014.jpg」を選択してから「Search」ボタンをクリックして下さい。image_014.jpg は白猫の写真なので、白っぽい猫の写真が表示されますが、白猫ではない猫も混ざっているはずです。そこで、さらにテキストボックスに「white cat」と入力して「Search」ボタンをクリックして下さい。すると、全てが白猫の画像になります。

写真を指定せずにテキストで「white cat」とのみ入力して検索した場合とは異なる結果になっているはずです。この結果から、写真とテキストの両方を指定することで、写真とテキストの両方に近い写真を検索することができることがわかります。

## デプロイされたリソースの削除

不要になったリソースは削除することをおすすめします。デプロイされた AWS リソースが不要になった場合、以下のコマンドを実行するとすべてのリソースを削除することができます。コマンドを実行後、リソースを削除するかどうか聞かれたら y を入力して削除を実行してください。

```bash
npm run cdk:destroy
```

API Gateway の CloudWatch log role ARN に設定していた IAM Role を含めてリソースが削除されます。後日 API Gateway を使う際に「CloudWatch log role ARN に設定されている IAM Role が存在しません」のようなエラーが出たら、API Gateway のコンソールのメニューにある「Settings」をクリックし、「CloudWatch log role ARN」に以下のような policy を含む IAM Role の ARN を設定してください。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

## コスト

本サンプルをデプロイして 24時間後に削除することで発生する料金と、各サービスの料金に関する情報は以下のとおりです。最新情報は各サービス名をクリックし、料金ページで内容をご確認ください。使用しているサービスのほとんどは従量課金ですが、Amazon OpenSearch Serverless のみリソースを削除するまで課金が発生するため、使い終わったら必ず CDK スタックの削除を実行して下さい。

- 全て東京リージョンで試算しております。
- 料金の単位は USD です。
- コストが 0.01 USD 以下のものは 0 と表記されております。
- 無料利用枠や ReservedInstance は考慮しておりません。
- 価格はあくまで参考であり、完全に正確なものではございません。実運用を想定した試算のためのヒントとしてご活用ください。

| サービス                                                                                                           | 料金  | 料金試算方法                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Amazon OpenSearch Serverless](https://aws.amazon.com/jp/opensearch-service/pricing/#Amazon_OpenSearch_Serverless) | 12.05 | トータル 12.05 USD。（インデックス作成 0.334USD/1 OCU, 1 hour _ 0.5 OCU _ 24 hours = 4.008 USD、検索とクエリ 0.334 USD/1 OCU, 1 hour _ 1 OCU _ 24 hours = 8.016 USD、ストレージ 0.026 USD/month, GB \* 1 = 0.026 USD）                       |
| [Amazon Bedrock](https://aws.amazon.com/jp/bedrock/pricing/)                                                       | 0.02  | インデックスへの画像登録枚数 229 x 0.00006USD/1枚 = 0.01374 USD かかります。そのほか、検索時にのテキストに対し 0.0008USD/1000 tokens、画像に対し て 0.00006USD/1枚 かかります。                                                              |
| [Amazon S3](https://aws.amazon.com/jp/s3/pricing/)                                                                 | 0.025 | ストレージの料金、リクエストとデータ取り出しの料金、データ転送と転送高速化の料金、データ管理機能および分析機能の料金、レプリケーションの料金および S3 Object Lambda でデータを処理するための料金がかかります。ストレージ料金は 0.025USD/GB。 |
| [AWS Lambda](https://aws.amazon.com/jp/lambda/pricing/)                                                            | 0.0   | 料金は、関数に対するリクエストの数とコードの実行時間に基づいて算出されます。                                                                                                                                                                 |
| [Amazon CloudWatch](https://aws.amazon.com/jp/cloudwatch/pricing/)                                                 | 0.76  | ログの保存に 0.76USD/GB かかります。1GB で試算。                                                                                                                                                                                             |

EOF
