#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageSearchMultimodalStack } from '../lib/image-search-multimodal-stack';
// import { AwsPrototypingChecks } from '@aws/pdk/pdk-nag';

const app = new cdk.App();
// cdk.Aspects.of(app).add(new AwsPrototypingChecks());
const prefix = app.node.tryGetContext('stackNamePrefix');
new ImageSearchMultimodalStack(app, `${prefix}Stack`, {});
