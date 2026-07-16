import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, StorageUsageSummary, StoredFile, UploadFileInput } from './storage-provider';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly accountId?: string;
  private readonly accessKeyId?: string;
  private readonly secretAccessKey?: string;
  private readonly bucket?: string;
  private readonly apiToken?: string;
  private readonly downloadUrlExpiresIn: number;

  constructor(config: ConfigService) {
    this.accountId = config.get<string>('R2_ACCOUNT_ID');
    this.accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    this.secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET_NAME');
    this.apiToken = config.get<string>('CLOUDFLARE_API_TOKEN');
    this.downloadUrlExpiresIn = Number(config.get<string>('R2_DOWNLOAD_URL_EXPIRES_IN') ?? 900);
  }

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const { bucket, client } = this.connection();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.buffer,
      ContentType: input.mimeType,
      ContentDisposition: this.contentDisposition(input.name),
    }));

    return { key: input.key, name: input.name, mimeType: input.mimeType, size: input.buffer.length };
  }

  async createDownloadUrl(key: string, downloadName: string, options?: {
    contentType?: string | null;
    disposition?: 'attachment' | 'inline';
  }) {
    const { bucket, client } = this.connection();
    return getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: this.contentDisposition(downloadName, options?.disposition ?? 'attachment'),
      ...(options?.contentType ? { ResponseContentType: options.contentType } : {}),
    }), { expiresIn: this.downloadUrlExpiresIn });
  }

  async delete(key: string) {
    const { bucket, client } = this.connection();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async healthCheck() {
    const { bucket, client } = this.connection();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  }

  async getUsageSummary(): Promise<StorageUsageSummary> {
    if (this.apiToken && this.accountId && this.bucket) {
      try {
        const analyticsSummary = await this.getAnalyticsUsageSummary();
        if (analyticsSummary) return analyticsSummary;
      } catch {
        // Cloudflare Analytics may be unavailable for the token. Fall back to S3 listing.
      }
    }

    const { bucket, client } = this.connection();
    let objectCount = 0;
    let totalSizeBytes = 0;
    let continuationToken: string | undefined;
    const maxObjects = 10_000;

    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
      for (const object of page.Contents ?? []) {
        objectCount += 1;
        totalSizeBytes += object.Size ?? 0;
        if (objectCount >= maxObjects) return { bucket, objectCount, totalSizeBytes, isPartial: true };
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    return { bucket, objectCount, totalSizeBytes, isPartial: false };
  }

  private async getAnalyticsUsageSummary(): Promise<StorageUsageSummary | null> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query R2Usage($accountTag: string!, $bucketName: string!, $startDate: Time!, $endDate: Time!) {
          viewer { accounts(filter: { accountTag: $accountTag }) {
            r2StorageAdaptiveGroups(limit: 1, filter: { bucketName: $bucketName, datetime_geq: $startDate, datetime_leq: $endDate }, orderBy: [datetime_DESC]) {
              max { objectCount payloadSize }
            }
          } }
        }`,
        variables: { accountTag: this.accountId, bucketName: this.bucket, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      }),
    });
    if (!response.ok) throw new Error(`Cloudflare Analytics HTTP ${response.status}`);
    const payload = await response.json() as { errors?: Array<{ message: string }>; data?: { viewer?: { accounts?: Array<{ r2StorageAdaptiveGroups?: Array<{ max?: { objectCount?: number; payloadSize?: number } }> }> } } };
    if (payload.errors?.length) throw new Error('Cloudflare Analytics GraphQL error');
    const max = payload.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups?.[0]?.max;
    if (!max) return null;
    return { bucket: this.bucket!, objectCount: max.objectCount ?? 0, totalSizeBytes: max.payloadSize ?? 0, isPartial: false };
  }

  private connection() {
    if (!this.accountId || !this.accessKeyId || !this.secretAccessKey || !this.bucket) {
      throw new ServiceUnavailableException('Konfigurasi Cloudflare R2 belum lengkap');
    }
    return {
      bucket: this.bucket,
      client: new S3Client({
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        region: 'auto',
        credentials: { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey },
      }),
    };
  }

  private contentDisposition(name: string, disposition: 'attachment' | 'inline' = 'attachment') {
    const safeName = name.replace(/["\\\r\n]/g, '_');
    return `${disposition}; filename="${safeName}"`;
  }
}
