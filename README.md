# EC2 Batch Rendering

React frontend, Node.js backend, SQS queue, S3 buckets, and EC2 workers for asynchronous image rendering.

## Local frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

## Local backend

The backend uses the EC2 instance role when running on EC2. Copy `backend/.env.example` to `backend/.env` for local configuration, then run:

```powershell
cd backend
npm install
node server.js
```

## AWS deployment

The current deployment uses:

- EC2-1 for the Node.js backend
- Three EC2 instances running the worker service
- S3 input bucket: `batch-rendering-input-rohit`
- S3 output bucket: `batch-rendering-output-rohit`
- SQS queue: `batch-rendering-queue`

Do not commit `.env`, AWS access keys, or `node_modules`.

## Render deployment

The repository includes [`render.yaml`](./render.yaml) for deploying the API and
frontend as two Render services. The EC2 workers remain connected to the same
SQS queue and continue processing jobs from S3.

The Render API requires these environment variables:

- `AWS_REGION`
- `INPUT_BUCKET`
- `OUTPUT_BUCKET`
- `QUEUE_URL`
- `CORS_ORIGIN` (the deployed Render frontend URL)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Create a least-privilege IAM user for the Render API rather than reusing
personal AWS credentials. Grant only S3 access to the two application buckets
and `sqs:SendMessage` for the rendering queue. Add the credentials only as
Render secret environment variables.
