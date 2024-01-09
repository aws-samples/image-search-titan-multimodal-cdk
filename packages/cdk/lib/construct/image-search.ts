import { Construct } from 'constructs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PublicRestApi } from './public-rest-api';

export interface imageSearch {
  imageStoreDomainName: string;
  opensearchEndpoint: string;
  opensearchIndexName: string;
  searchImageFunctionRole: iam.Role;
  apiAccessSourceIp: string;
  allowedApiCallOriginList: string[];
  bedrockRegion: string;
}

export class ImageSearch extends Construct {
  readonly webApiEndpoint: string;
  constructor(scope: Construct, id: string, props: imageSearch) {
    super(scope, id);

    const searchImageFunction = new PythonFunction(this, `SearchImage`, {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/search-image/',
      timeout: Duration.seconds(60),
      role: props.searchImageFunctionRole,
      environment: {
        ALLOW_ORIGIN: '*',
        OPENSEARCH_ENDPOINT: props.opensearchEndpoint,
        INDEX_NAME: props.opensearchIndexName,
        IMAGE_STORE_DOMAIN_NAME: props.imageStoreDomainName,
        BEDROCK_REGION: props.bedrockRegion,
      },
    });

    const webApi = new PublicRestApi(this, `WebApi`, {
      apiAccessSourceIp: props.apiAccessSourceIp,
      allowedApiCallOriginList: props.allowedApiCallOriginList,
    });
    webApi.addResource('POST', ['search'], searchImageFunction);
    this.webApiEndpoint = webApi.restApi.url;
  }
}
