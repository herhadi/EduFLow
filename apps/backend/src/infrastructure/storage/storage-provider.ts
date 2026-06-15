export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StoredFile {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface UploadFileInput {
  buffer: Buffer;
  key: string;
  name: string;
  mimeType: string;
}

export interface StorageProvider {
  upload(input: UploadFileInput): Promise<StoredFile>;
  createDownloadUrl(key: string, downloadName: string): Promise<string>;
  delete(key: string): Promise<void>;
}
