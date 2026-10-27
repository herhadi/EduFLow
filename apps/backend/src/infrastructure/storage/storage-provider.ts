export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StoredFile {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface UploadFileInput {
  buffer: Buffer;
  disposition?: 'attachment' | 'inline';
  key: string;
  name: string;
  mimeType: string;
}

export interface StorageUsageSummary {
  bucket: string;
  objectCount: number;
  totalSizeBytes: number;
  isPartial: boolean;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  etag?: string | null;
}

export interface StorageObjectRange {
  objects: StorageObject[];
  truncated: boolean;
}

export interface StorageProvider {
  upload(input: UploadFileInput): Promise<StoredFile>;
  createDownloadUrl(key: string, downloadName: string, options?: {
    contentType?: string | null;
    disposition?: 'attachment' | 'inline';
  }): Promise<string>;
  delete(key: string): Promise<void>;
  healthCheck(): Promise<void>;
  getUsageSummary(): Promise<StorageUsageSummary>;
  listObjectsByModifiedRange(from: Date, to: Date, prefix?: string, limit?: number): Promise<StorageObjectRange>;
  downloadObject(key: string): Promise<Buffer>;
  deleteObjects(keys: string[]): Promise<void>;
}
