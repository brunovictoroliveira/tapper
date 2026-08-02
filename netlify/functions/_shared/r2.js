import { S3Client } from '@aws-sdk/client-s3'

let client

export function getR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    throw new Error('missing_r2_configuration')
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    })
  }
  return client
}

export function getR2Bucket() {
  if (!process.env.R2_BUCKET_NAME) throw new Error('missing_r2_configuration')
  return process.env.R2_BUCKET_NAME
}
