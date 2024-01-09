import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';

// const apiUrlPrefix = process.env.REACT_APP_API_URL_PREFIX!;
// const imageStoreEndpoint = process.env.REACT_APP_IMAGE_STORE_EMDPOINT!;
const apiUrlPrefix = import.meta.env.VITE_APP_API_URL_PREFIX;
const imageStoreEndpoint = import.meta.env.VITE_APP_IMAGE_STORE_EMDPOINT;

// Code snippet from main.ts
// import * as iam from 'aws-cdk-lib/aws-iam';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App apiUrlPrefix={apiUrlPrefix} imageStoreEndpoint={imageStoreEndpoint} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
