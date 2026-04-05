import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
const bucketName = process.env.S3_BUCKET_NAME ?? process.env.R2_BUCKET_NAME ?? "";
const endpoint = process.env.S3_ENDPOINT ??
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const region = process.env.S3_REGION ?? "auto";
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "false").toLowerCase() === "true";

export const storageClient = new S3Client({
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region,
  forcePathStyle,
});

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL ?? process.env.R2_PUBLIC_URL;

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }

  if (accountId) {
    // Fallback: direct R2 public bucket URL.
    return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
  }

  if (endpoint) {
    // Generic fallback for S3-compatible endpoints.
    return `${endpoint.replace(/\/$/, "")}/${bucketName}/${key}`;
  }

  return key;
}