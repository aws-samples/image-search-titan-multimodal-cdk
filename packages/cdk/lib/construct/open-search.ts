import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { Construct } from 'constructs';

export interface OpenSearchProps {
  stackNamePrefix: string;
  indexImagesRoleArn: string;
  searchImageFunctionRoleArn: string;
}

export class OpenSearch extends Construct {
  readonly opensearchEndpoint: string;
  readonly opensearchCollectionArn: string;
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    const stackNamePrefix = props.stackNamePrefix;
    const stackNamePrefixLowerCase = stackNamePrefix.toLowerCase();

    const cfnCollection = new opensearchserverless.CfnCollection(
      this,
      `CfnCollection`,
      {
        name: `collection-${stackNamePrefixLowerCase}`,
        description: 'description',
        type: 'VECTORSEARCH',
        standbyReplicas:"DISABLED"  // You need to Enable this option for production
        
      }
    );
    this.opensearchCollectionArn = cfnCollection.attrArn;

    const collectionName = `collection/${cfnCollection.name}`;

    var principalList: string[] = [
      props.searchImageFunctionRoleArn,
      props.indexImagesRoleArn,
    ];


    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html
    const cfnAccessPolicy = new opensearchserverless.CfnAccessPolicy(
      this,
      `CfnAccessPolicy`,
      {
        name: `os-access-${stackNamePrefixLowerCase}`,
        policy: JSON.stringify([
          {
            Rules: [
              {
                ResourceType: 'index',
                Resource: [`index/*/*`],
                Permission: [
                  'aoss:ReadDocument',
                  'aoss:WriteDocument',
                  'aoss:CreateIndex',
                  'aoss:DeleteIndex',
                  'aoss:UpdateIndex',
                  'aoss:DescribeIndex',
                ],
              },
              {
                ResourceType: 'collection',
                Resource: [collectionName],
                Permission: [
                  'aoss:CreateCollectionItems',
                  'aoss:DeleteCollectionItems',
                  'aoss:UpdateCollectionItems',
                  'aoss:DescribeCollectionItems',
                ],
              },
            ],
            Principal: principalList,
          },
        ]),
        type: 'data',
        description: `Access for ${stackNamePrefix}`,
      }
    );

    const cfnEncryptionPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      `EncryptionPolicy`,
      {
        name: `encryption-${stackNamePrefixLowerCase}`,
        policy: JSON.stringify({
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [collectionName],
            },
          ],
          AWSOwnedKey: true,
        }),
        type: 'encryption',
        description: 'Encryption policy for test collection',
      }
    );

    const cfnNetworkPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      `NetworkPolicy`,
      {
        name: `network-${stackNamePrefixLowerCase}`,
        policy: JSON.stringify([
          {
            Rules: [
              {
                ResourceType: 'collection',
                Resource: [collectionName],
              },
              {
                ResourceType: 'dashboard',
                Resource: [collectionName],
              },
            ],
            AllowFromPublic: true,
          },
        ]),
        type: 'network',
        description: 'Network policy for test collection',
      }
    );

    cfnCollection.addDependency(cfnEncryptionPolicy);
    cfnCollection.addDependency(cfnNetworkPolicy);
    cfnCollection.addDependency(cfnAccessPolicy);

    this.opensearchEndpoint = cfnCollection.attrCollectionEndpoint;

  }
}
