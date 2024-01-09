import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Main } from './construct/main';

export class ImageSearchServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Main(this, 'OpenSearch');
  }
}
