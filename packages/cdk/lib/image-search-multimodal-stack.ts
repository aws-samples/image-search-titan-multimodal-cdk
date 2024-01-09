import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Main } from './construct/main';
import { AppInfra } from './construct/app-infra';

export class ImageSearchMultimodalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const stackNamePrefix = this.node.tryGetContext('stackNamePrefix');
    const opensearchIndexName = this.node.tryGetContext('opensearchIndexName');
    const apiAccessSourceIp = this.node.tryGetContext('apiAccessSourceIp');
    const allowedApiCallOriginList = this.node.tryGetContext(
      'allowedApiCallOriginList'
    );
    const imageDownloadURL = this.node.tryGetContext('imageDownloadURL');
    const bedrockRegion = this.node.tryGetContext('bedrockRegion');

    const main = new Main(this, 'OpenSearch', {
      stackNamePrefix: stackNamePrefix,
      opensearchIndexName: opensearchIndexName,
      apiAccessSourceIp: apiAccessSourceIp,
      allowedApiCallOriginList: allowedApiCallOriginList,
      imageDownloadURL: imageDownloadURL,
      bedrockRegion: bedrockRegion,
    });
    new AppInfra(this, 'AppInfra', {
      stackNamePrefix: stackNamePrefix,
      webApiEndpoint: main.webApiEndpoint,
      imageStoreDomainName: main.imageStoreDomainName,
    });
  }
}
