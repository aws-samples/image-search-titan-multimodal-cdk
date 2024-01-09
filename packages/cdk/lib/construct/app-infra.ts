import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsBuild } from 'deploy-time-build';

export interface AppInfraProps {
  stackNamePrefix: string;
  webApiEndpoint: string;
  imageStoreDomainName: string;
}

export class AppInfra extends Construct {
  constructor(scope: Construct, id: string, props: AppInfraProps) {
    super(scope, id);

    const stackNamePrefix = props.stackNamePrefix;

    const websiteBucket = new s3.Bucket(
      this,
      `${stackNamePrefix}-WebsiteBucket`,
      {
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'index.html',
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const websiteIdentity = new cloudfront.OriginAccessIdentity(
      this,
      `${stackNamePrefix}-WebsiteIdentity`
    );

    const webSiteBucketPolicyStatement = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: iam.Effect.ALLOW,
      principals: [websiteIdentity.grantPrincipal],
      resources: [`${websiteBucket.bucketArn}/*`],
    });

    websiteBucket.addToResourcePolicy(webSiteBucketPolicyStatement);

    const websiteDistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      `${stackNamePrefix}-WebsiteDistribution`,
      {
        errorConfigurations: [
          {
            errorCachingMinTtl: 300,
            errorCode: 403,
            responseCode: 200,
            responsePagePath: '/index.html',
          },
          {
            errorCachingMinTtl: 300,
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/index.html',
          },
        ],
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: websiteBucket,
              originAccessIdentity: websiteIdentity,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        geoRestriction: cloudfront.GeoRestriction.allowlist('JP'),
      }
    );

    const njBuild = new NodejsBuild(this, 'BuildWeb', {
      assets: [
        {
          path: '../../',
          exclude: [
            '.git',
            'node_modules',
            'packages/cdk/cdk.out',
            'packages/cdk/node_modules',
            'packages/web/dist',
            'packages/web/node_modules',
          ],
        },
      ],
      destinationBucket: websiteBucket,
      distribution: websiteDistribution,
      outputSourceDirectory: './packages/web/dist',
      buildCommands: ['npm ci', 'npm run web:build'],
      buildEnvironment: {
        VITE_APP_API_URL_PREFIX: props.webApiEndpoint,
        VITE_APP_IMAGE_STORE_EMDPOINT: props.imageStoreDomainName,
      },
    });

    new CfnOutput(this, 'WebAppDomain', {
      description: 'Access Web App',
      value: websiteDistribution.distributionDomainName,
    });

  }
}
