from aws_lambda_powertools import Logger
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth, helpers
import base64
import boto3
import glob
import io
import json
import os
import requests
import time
import zipfile


logger = Logger(service="IndesImages")
host_http = os.environ["OPENSEARCH_ENDPOINT"]
index_name = os.environ["INDEX_NAME"]
tmp_dir = os.environ["TMP_DIR"]
dimensions = 1024

bedrock_runtime = boto3.client(
    service_name="bedrock-runtime", region_name=os.environ["BEDROCK_REGION"]
)


def get_aoss_client():
    host = host_http.split("/")[2]

    region = host.split(".")[1]

    service = "aoss"
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, region, service)

    # create an opensearch client and use the request-signer
    client = OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        pool_maxsize=20,
    )

    return client


def create_index(client):
    print("exists?", client.indices.exists(index_name))
    if not client.indices.exists(index_name):
        print("create index")
        client.indices.create(
            index_name,
            body={
                "settings": {"index.knn": True},
                "mappings": {
                    "properties": {
                        "values": {
                            "type": "knn_vector",
                            "dimension": dimensions,
                            "method": {"engine": "faiss", "name": "hnsw"},
                        },
                        "image_name": {"type": "text"},
                    }
                },
            },
        )

    time.sleep(20)


def query(image_file_name):
    with open(image_file_name, "rb") as image_file:
        input_image = base64.b64encode(image_file.read()).decode("utf8")

    # You can specify either text or image or both
    body = json.dumps({"inputImage": input_image})
    query_response = bedrock_runtime.invoke_model(
        body=body,
        modelId="amazon.titan-embed-image-v1",
        accept="application/json",
        contentType="application/json",
    )

    return query_response


def parse_response(query_response):
    """Parse response and return the embedding."""

    response_body = json.loads(query_response.get("body").read())
    return response_body.get("embedding")


def embed_images(file_list):
    vectors = []
    for file_name in file_list:
        try:
            query_response = query(file_name)
        except Exception as e:
            print(e, file_name)
            continue
        embedding = parse_response(query_response)
        vectors.append(
            {"_index": index_name, "values": embedding, "image_name": file_name.split("/")[-1]}
        )

    logger.info("%d images were embedded.", len(vectors))
    return vectors


def get_images():
    file_url = os.environ["IMAGE_URL"]

    response = requests.get(file_url, timeout=(5.0, 10.0))
    if response.status_code != 200:
        raise Exception(f"Failed to download file: {file_url}")

    with zipfile.ZipFile(io.BytesIO(response.content)) as zip_ref:
        zip_ref.extractall(f"{tmp_dir}/")


def handler(event, context):
    client = get_aoss_client()
    create_index(client)
    get_images()

    file_list = glob.glob(f"{tmp_dir}/images/*")

    vectors = embed_images(file_list)

    helpers.bulk(client, vectors)

    logger.info("Process finished.")
