#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageSearchMultimodalStack } from '../lib/image-search-multimodal-stack';


const app = new cdk.App();
const prefix = app.node.tryGetContext('stackNamePrefix');
new ImageSearchMultimodalStack(app, `${prefix}Stack`, {
  description: "The stack for image search sample application"
});
