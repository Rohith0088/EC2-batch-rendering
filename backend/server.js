const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl
} = require("@aws-sdk/s3-request-presigner");

const {
  SQSClient,
  SendMessageCommand
} = require("@aws-sdk/client-sqs");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const sqs = new SQSClient({
  region: process.env.AWS_REGION
});

const INPUT_BUCKET = process.env.INPUT_BUCKET;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;
const QUEUE_URL = process.env.QUEUE_URL;


// Generate upload URL
app.post("/api/upload-url", async (req, res) => {

  try {

    const { fileName, contentType } = req.body;

    const jobId = `job-${crypto.randomUUID()}`;

    const key = `${jobId}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: INPUT_BUCKET,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(
      s3,
      command,
      { expiresIn: 300 }
    );

    res.json({
      jobId,
      key,
      uploadUrl
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Could not generate upload URL"
    });

  }

});


// Create rendering job
app.post("/api/jobs", async (req, res) => {

  try {

    const { jobId, inputKey } = req.body;

    const message = {
      jobId,
      inputKey
    };

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message)
      })
    );

    res.json({
      success: true,
      jobId,
      status: "queued"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Could not create job"
    });

  }

});


// Check job status
app.get("/api/jobs/:jobId", async (req, res) => {

  const jobId = req.params.jobId;

  const outputKey = `${jobId}-rendered.png`;

  try {

    await s3.send(
      new HeadObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: outputKey
      })
    );

    res.json({
      jobId,
      status: "completed",
      outputKey
    });

  } catch {

    res.json({
      jobId,
      status: "processing"
    });

  }

});

app.get("/api/jobs/:jobId/output-url", async (req, res) => {
  const outputKey = `${req.params.jobId}-rendered.png`;

  try {
    const outputUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: outputKey
      }),
      { expiresIn: 3600 }
    );

    res.json({ outputKey, outputUrl });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: "Rendered output is not available" });
  }
});


app.get("/", (req, res) => {
  res.json({
    message: "AWS Batch Rendering API is running"
  });
});


app.listen(5000, () => {
  console.log("Backend running on port 5000");
});