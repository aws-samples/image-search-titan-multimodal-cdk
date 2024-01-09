import json
import boto3
import base64
import os
import traceback
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.api_gateway import ApiGatewayResolver, CORSConfig, Response
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from aws_lambda_powertools.logging import correlation_paths
import numpy as np
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth, helpers


logger = Logger(service="SearchImage")

ALLOW_ORIGIN = os.environ["ALLOW_ORIGIN"]
OPENSEARCH_ENDPOINT = os.environ["OPENSEARCH_ENDPOINT"]
INDEX_NAME = os.environ["INDEX_NAME"]
cors_config = CORSConfig(allow_origin=ALLOW_ORIGIN)
app = ApiGatewayResolver(cors=cors_config)


def get_embeddeding_vector(event):
    try:
        bedrock_runtime = boto3.Session().client(
            service_name="bedrock-runtime", region_name=os.environ["BEDROCK_REGION"]
        )

        input_image = event["b64_image"]
        input_text = event["text"]

        print("input_text", input_text)

        if len(input_image) > 0:
            print("input_image > 0")
            if len(input_text) > 0:
                body = json.dumps({"inputText": input_text, "inputImage": input_image})
            else:
                body = json.dumps({"inputImage": input_image})
        else:
            print("input_image = 0")
            if len(input_text) > 0:
                body = json.dumps(
                    {
                        "inputText": input_text,
                    }
                )
            else:
                body = ""

        if len(body) == 0:
            return ""

        query_response = bedrock_runtime.invoke_model(
            body=body,
            modelId="amazon.titan-embed-image-v1",
            accept="application/json",
            contentType="application/json",
        )

        response_body = json.loads(query_response.get("body").read())
        result = response_body.get("embedding")

    except Exception:
        logger.error(traceback.format_exc())
        raise ValueError("Error")

    return result


def find_similar_image(vector):
    host = OPENSEARCH_ENDPOINT.split("//")[1]

    region = host.split(".")[1]

    service = "aoss"
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, region, service)
    index_name = INDEX_NAME

    # create an opensearch client and use the request-signer
    client = OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        pool_maxsize=20,
    )

    search_query = {"query": {"knn": {"values": {"vector": vector, "k": 3}}}}
    results = client.search(index=index_name, body=search_query)

    search_results = []
    for hit in results["hits"]["hits"]:
        search_results.append({"imageName": hit["_source"]["image_name"], "score": hit["_score"]})
    return search_results


@app.post("/search")
def search_image():
    event = app.current_event.json_body
    vector = get_embeddeding_vector(event)

    if len(vector) == 0:
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            content_type="application/json",
            body=json.dumps("NO INPUT DATA ERROR"),
        )

    result = find_similar_image(vector)

    logger.info("Search result: %s", json.dumps(result))

    return Response(
        status_code=HTTPStatus.OK, content_type="application/json", body=json.dumps(result)
    )


@app.exception_handler(ValueError)
def handle_value_error(e: ValueError):
    metadata = {"path": app.current_event.path}
    logger.warn(f"ValueError: {e}", extra=metadata)
    return Response(
        status_code=HTTPStatus.BAD_REQUEST, content_type="application/json", body=json.dumps(str(e))
    )


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def handler(event, context):
    return app.resolve(event, context)
