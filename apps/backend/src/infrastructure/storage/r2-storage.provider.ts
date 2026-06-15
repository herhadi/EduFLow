import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, StoredFile, UploadFileInput } from './storage-provider';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly accountId?: string;
  private readonly accessKeyId?: string;
  private readonly secretAccessKey?: string;
  private readonly bucket?: string;
  private readonly downloadUrlExpiresIn: number;

  constructor(config: ConfigService) {
    this.accountId = config.get<string>('R2_ACCOUNT_ID');
    this.accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    this.secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET_NAME');
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

  async createDownloadUrl(key: string, downloadName: string) {
    const { bucket, client } = this.connection();
    return getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: this.contentDisposition(downloadName),
    }), { expiresIn: this.downloadUrlExpiresIn });
  }

  async delete(key: string) {
    const { bucket, client } = this.connection();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
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

  private contentDisposition(name: string) {
    const safeName = name.replace(/["\\\r\n]/g, '_');
    return `attachment; filename="${safeName}"`;
  }
}
