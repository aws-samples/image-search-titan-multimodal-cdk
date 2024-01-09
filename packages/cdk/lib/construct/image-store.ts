import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export interface ImageStoreProps {
  stackNamePrefix: string;
}

export class ImageStore extends Construct {
  readonly imageStoreDomainName: string;
  constructor(scope: Construct, id: string, props: ImageStoreProps) {
    super(scope, id);

    const stackNamePrefix = props.stackNamePrefix;

    const imageBucket = new s3.Bucket(this, `imageBucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    imageBucket.grantRead(oai);
    const cfdistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'ImageDistribution',
      {
        errorConfigurations: [
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
              s3BucketSource: imageBucket,
              originAccessIdentity: oai,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
        geoRestriction: cloudfront.GeoRestriction.allowlist('JP'),
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      }
    );

    this.imageStoreDomainName = cfdistribution.distributionDomainName;

    const s3d = new s3deploy.BucketDeployment(
      this,
      `${stackNamePrefix}-DeployImages`,
      {
        sources: [s3deploy.Source.asset('../../images.zip')],
        destinationBucket: imageBucket,
        distribution: cfdistribution,
        distributionPaths: ['/*'],
      }
    );

  }
}
