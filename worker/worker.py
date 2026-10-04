import boto3
import json
import time
import socket
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont
import os
import logging
from botocore.exceptions import BotoCoreError

REGION = "ap-south-2"

INPUT_BUCKET = "batch-rendering-input-rohit"
OUTPUT_BUCKET = "batch-rendering-output-rohit"

QUEUE_URL = "https://sqs.ap-south-2.amazonaws.com/160932096938/batch-rendering-queue"

s3 = boto3.client(
    "s3",
    region_name=REGION
)

sqs = boto3.client(
    "sqs",
    region_name=REGION
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

logger.info("Worker started...")


def render_details(output_file, job_id, input_key):
    """Create the completed batch-render details frame uploaded to S3."""
    canvas = Image.new("RGB", (1280, 720), "white")
    draw = ImageDraw.Draw(canvas)

    font_paths = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    )
    font = ImageFont.load_default()
    for font_path in font_paths:
        if os.path.exists(font_path):
            font = ImageFont.truetype(font_path, 16)
            break

    lines = [
        f"BATCH RENDERED FRAME - {job_id}",
        "",
        "AWS EC2 Spot Fleet",
        "",
        f"Worker: {socket.gethostname()}",
        "",
        f"Input: {input_key}",
        "",
        "Processing: SQS Distributed Job",
        "",
        "Status: COMPLETED",
    ]

    y = 82
    for line in lines:
        draw.text((80, y), line, fill="black", font=font)
        y += 40 if line else 38

    canvas.save(output_file, format="PNG")


while True:

    response = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=20,
        VisibilityTimeout=120
    )

    messages = response.get("Messages", [])

    if not messages:
        logger.info("No jobs available")
        continue

    message = messages[0]
    receipt_handle = message["ReceiptHandle"]
    input_file = None
    output_file = None

    try:
        job = json.loads(message["Body"])
        job_id = job["jobId"]
        input_key = job["inputKey"]
        logger.info("Processing: %s", job_id)

        input_file = f"/tmp/{job_id}-input"
        output_file = f"/tmp/{job_id}-rendered.png"

        s3.download_file(INPUT_BUCKET, input_key, input_file)

        render_details(output_file, job_id, input_key)

        output_key = f"{job_id}-rendered.png"
        s3.upload_file(output_file, OUTPUT_BUCKET, output_key)

        sqs.delete_message(
            QueueUrl=QUEUE_URL,
            ReceiptHandle=receipt_handle
        )
        logger.info("Completed: %s", job_id)
    except (KeyError, json.JSONDecodeError, OSError, ValueError, BotoCoreError) as error:
        logger.exception("Job failed: %s", error)
    finally:
        for temporary_file in (input_file, output_file):
            if temporary_file and os.path.exists(temporary_file):
                os.remove(temporary_file)