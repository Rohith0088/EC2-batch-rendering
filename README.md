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
