import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib/core';

export interface PublicRestApiProps {
  apiAccessSourceIp: string;
  allowedApiCallOriginList: string[];
}

export class PublicRestApi extends Construct {
  readonly restApi: apigw.RestApi;

  constructor(scope: Construct, id: string, props: PublicRestApiProps) {
    super(scope, id);

    const resourcePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['execute-api:Invoke'],
          principals: [new iam.AnyPrincipal()],
          resources: ['execute-api:/*/*/*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ['execute-api:Invoke'],
          principals: [new iam.AnyPrincipal()],
          resources: ['execute-api:/*/*/*'],
          conditions: {
            NotIpAddress: {
              'aws:SourceIp': props.apiAccessSourceIp,
            },
          },
        }),
      ],
    });

    const logGroup = new logs.LogGroup(this, 'LogGroup');
    this.restApi = new apigw.RestApi(this, id, {
      policy: resourcePolicy,
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      deployOptions: {
        stageName: 'api',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
        accessLogFormat: apigw.AccessLogFormat.clf(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.allowedApiCallOriginList,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });
  }

  addResource(method: string, path: string[], fn: lambda.Function): void {
    const resource = this.restApi.root.resourceForPath(path.join('/'));
    resource.addMethod(method, new apigw.LambdaIntegration(fn));
  }
}
