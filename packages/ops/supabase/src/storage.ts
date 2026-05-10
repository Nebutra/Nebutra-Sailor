import { getSupabaseServer } from "./client";

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File | Blob | Buffer;
  contentType?: string;
  upsert?: boolean;
}

export interface DownloadOptions {
  bucket: string;
  path: string;
}

export interface SignedUrlOptions {
  bucket: string;
  path: string;
  expiresIn?: number; // seconds, default 3600
}

export interface ListOptions {
  bucket: string;
  folder?: string;
  limit?: number;
  offset?: number;
}

/**
 * Upload a file to Supabase Storage
 */
export async function upload(options: UploadOptions): Promise<{ path: string; url: string }> {
  const { bucket, path, file, contentType, upsert = false } = options;
  const client = getSupabaseServer();

  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType,
    upsert,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = client.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Download a file from Supabase Storage
 */
export async function download(options: DownloadOptions): Promise<Blob> {
  const { bucket, path } = options;
  const client = getSupabaseServer();

  const { data, error } = await client.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Get a signed URL for temporary access
 */
export async function getSignedUrl(options: SignedUrlOptions): Promise<string> {
  const { bucket, path, expiresIn = 3600 } = options;
  const client = getSupabaseServer();

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Get public URL (for public buckets)
 */
export function getPublicUrl(bucket: string, path: string): string {
  const client = getSupabaseServer();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function remove(bucket: string, paths: string[]): Promise<void> {
  const client = getSupabaseServer();

  const { error } = await client.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * List files in a folder
 */
export async function list(options: ListOptions): Promise<
  Array<{
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>
> {
  const { bucket, folder = "", limit = 100, offset = 0 } = options;
  const client = getSupabaseServer();

  const { data, error } = await client.storage.from(bucket).list(folder, {
    limit,
    offset,
  });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data;
}

/**
 * Move/rename a file
 */
export async function move(bucket: string, fromPath: string, toPath: string): Promise<void> {
  const client = getSupabaseServer();

  const { error } = await client.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    throw new Error(`Move failed: ${error.message}`);
  }
}

/**
 * Copy a file
 */
export async function copy(bucket: string, fromPath: string, toPath: string): Promise<void> {
  const client = getSupabaseServer();

  const { error } = await client.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    throw new Error(`Copy failed: ${error.message}`);
  }
}

/**
 * Create a bucket (admin only)
 */
export async function createBucket(
  name: string,
  options?: { public?: boolean; fileSizeLimit?: number | string; allowedMimeTypes?: string[] },
): Promise<void> {
  const client = getSupabaseServer();

  // Supabase SDK requires 'public' to be explicitly set
  const bucketOptions = options
    ? {
        public: options.public ?? false,
        fileSizeLimit: options.fileSizeLimit,
        allowedMimeTypes: options.allowedMimeTypes,
      }
    : { public: false };

  const { error } = await client.storage.createBucket(name, bucketOptions);

  if (error) {
    throw new Error(`Create bucket failed: ${error.message}`);
  }
}
