import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { OpenSearch } from './open-search';
import { ImageStore } from './image-store';
import { ImageSearch } from './image-search';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

export interface MainProps {
  stackNamePrefix: string;
  opensearchIndexName: string;
  apiAccessSourceIp: string;
  allowedApiCallOriginList: string[];
  imageDownloadURL: string;
  bedrockRegion: string;
}

export class Main extends Construct {
  readonly webApiEndpoint: string;
  readonly imageStoreDomainName: string;
  constructor(scope: Construct, id: string, props: MainProps) {
    super(scope, id);

    const stackNamePrefix = props.stackNamePrefix;

    const searchImageFunctionRole = new iam.Role(
      this,
      `searchImageFunctionRole`,
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      }
    );
    searchImageFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    searchImageFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      })
    );

    const indexImagesRole = new iam.Role(this, `indexImagesRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    indexImagesRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      })
    );
    indexImagesRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    const openSearch = new OpenSearch(this, `OpenSearch`, {
      stackNamePrefix: props.stackNamePrefix,
      indexImagesRoleArn: indexImagesRole.roleArn,
      searchImageFunctionRoleArn: searchImageFunctionRole.roleArn,
    });

    searchImageFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['aoss:APIAccessAll'],
        resources: [openSearch.opensearchCollectionArn],
      })
    );
    indexImagesRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['aoss:APIAccessAll', 'aoss:UpdateCollection'],
        resources: [openSearch.opensearchCollectionArn],
      })
    );

    const imageStore = new ImageStore(this, `ImageStore`, {
      stackNamePrefix: props.stackNamePrefix,
    });
    this.imageStoreDomainName = imageStore.imageStoreDomainName;

    const imageSearch = new ImageSearch(this, `ImageSearch`, {
      imageStoreDomainName: imageStore.imageStoreDomainName,
      opensearchEndpoint: openSearch.opensearchEndpoint,
      opensearchIndexName: props.opensearchIndexName,
      searchImageFunctionRole: searchImageFunctionRole,
      apiAccessSourceIp: props.apiAccessSourceIp,
      allowedApiCallOriginList: props.allowedApiCallOriginList,
      bedrockRegion: props.bedrockRegion,
    });

    this.webApiEndpoint = imageSearch.webApiEndpoint;

    const indexImagesFunction = new PythonFunction(this, `IndexImages`, {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/index-images/',
      timeout: Duration.seconds(60 * 15),
      retryAttempts:1,
      role: indexImagesRole,
      environment: {
        ALLOW_ORIGIN: '*',
        OPENSEARCH_ENDPOINT: openSearch.opensearchEndpoint,
        INDEX_NAME: props.opensearchIndexName,
        IMAGE_URL: props.imageDownloadURL,
        BEDROCK_REGION: props.bedrockRegion,
        TMP_DIR: '/tmp',
      },
    });

    new CfnOutput(this, 'indexImagesFunctionName', {
      value: indexImagesFunction.functionName,
      description: 'Index images lambda function name',
      exportName: `${stackNamePrefix}IndexImagesFunction`,
    });
  }
}
