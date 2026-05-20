export type VideoCodec = "h264" | "h265" | "vp9" | "av1";
export type AudioCodec = "aac" | "opus" | "mp3" | "flac";

export type TranscodeProfile = {
  id: string;
  label: string;
  width: number;
  height: number;
  videoBitrate: number;
  audioBitrate: number;
  codec: VideoCodec;
};

export const VIDEO_TRANSCODE_PROFILES: readonly TranscodeProfile[] = [
  { id: "360p", label: "360p", width: 640, height: 360, videoBitrate: 800_000, audioBitrate: 96_000, codec: "h264" },
  { id: "720p", label: "720p", width: 1280, height: 720, videoBitrate: 2_500_000, audioBitrate: 128_000, codec: "h264" },
  { id: "1080p", label: "1080p", width: 1920, height: 1080, videoBitrate: 5_000_000, audioBitrate: 192_000, codec: "h264" },
  { id: "4k", label: "4K", width: 3840, height: 2160, videoBitrate: 15_000_000, audioBitrate: 192_000, codec: "h265" },
] as const;

export type AudioTranscodeProfile = {
  id: string;
  label: string;
  bitrate: number;
  codec: AudioCodec;
  sampleRate: number;
};

export const AUDIO_TRANSCODE_PROFILES: readonly AudioTranscodeProfile[] = [
  { id: "lo", label: "Low", bitrate: 96_000, codec: "aac", sampleRate: 44_100 },
  { id: "mid", label: "Standard", bitrate: 192_000, codec: "aac", sampleRate: 44_100 },
  { id: "hi", label: "High", bitrate: 320_000, codec: "aac", sampleRate: 48_000 },
  { id: "lossless", label: "Lossless", bitrate: 0, codec: "flac", sampleRate: 96_000 },
] as const;

export type StreamingProtocol = "hls" | "dash";

export type AdaptiveBitrateConfig = {
  protocol: StreamingProtocol;
  segmentDurationSec: number;
  profiles: string[];
};

export const DEFAULT_ABR_CONFIG: AdaptiveBitrateConfig = {
  protocol: "hls",
  segmentDurationSec: 6,
  profiles: ["360p", "720p", "1080p"],
};

export type ImageFormat = "webp" | "avif" | "jpeg" | "png" | "gif" | "heic";

export const IMAGE_FORMAT_PRIORITY: readonly ImageFormat[] = ["avif", "webp", "jpeg"] as const;

export function selectImageFormat(acceptHeader: string): ImageFormat {
  if (acceptHeader.includes("image/avif")) return "avif";
  if (acceptHeader.includes("image/webp")) return "webp";
  return "jpeg";
}

export type ThumbnailSource = "auto_generated" | "custom_upload";

export type Thumbnail = {
  dropId: string;
  source: ThumbnailSource;
  url: string;
  timestampSec: number | null;
};

export type EncodingJobStatus = "queued" | "processing" | "completed" | "failed" | "retrying";

export type EncodingJob = {
  id: string;
  dropId: string;
  profile: string;
  status: EncodingJobStatus;
  attempt: number;
  maxAttempts: number;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};

export const MAX_ENCODING_RETRIES = 3;

export function canRetryEncoding(job: EncodingJob): boolean {
  return job.status === "failed" && job.attempt < job.maxAttempts;
}

export type SupportedVideoFormat = "mp4" | "mov" | "mkv" | "webm";
export type SupportedAudioFormat = "mp3" | "wav" | "flac" | "ogg" | "aac";
export type SupportedImageFormat = "jpg" | "png" | "gif" | "webp" | "heic" | "raw";
export type SupportedTextFormat = "markdown" | "html" | "plain" | "epub";

export const SUPPORTED_VIDEO_FORMATS: readonly SupportedVideoFormat[] = ["mp4", "mov", "mkv", "webm"];
export const SUPPORTED_AUDIO_FORMATS: readonly SupportedAudioFormat[] = ["mp3", "wav", "flac", "ogg", "aac"];
export const SUPPORTED_IMAGE_FORMATS: readonly SupportedImageFormat[] = ["jpg", "png", "gif", "webp", "heic", "raw"];
export const SUPPORTED_TEXT_FORMATS: readonly SupportedTextFormat[] = ["markdown", "html", "plain", "epub"];

export function isSupportedVideoFormat(ext: string): ext is SupportedVideoFormat {
  return (SUPPORTED_VIDEO_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

export function isSupportedAudioFormat(ext: string): ext is SupportedAudioFormat {
  return (SUPPORTED_AUDIO_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

export function isSupportedImageFormat(ext: string): ext is SupportedImageFormat {
  return (SUPPORTED_IMAGE_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

export function isSupportedTextFormat(ext: string): ext is SupportedTextFormat {
  return (SUPPORTED_TEXT_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

export type UploadSizeLimit = {
  mode: string;
  maxBytes: number;
};

export const UPLOAD_SIZE_LIMITS: readonly UploadSizeLimit[] = [
  { mode: "watch", maxBytes: 50 * 1024 * 1024 * 1024 },
  { mode: "listen", maxBytes: 2 * 1024 * 1024 * 1024 },
  { mode: "read", maxBytes: 500 * 1024 * 1024 },
  { mode: "look", maxBytes: 200 * 1024 * 1024 },
] as const;

export function getUploadLimit(mode: string): number {
  const limit = UPLOAD_SIZE_LIMITS.find((l) => l.mode === mode);
  return limit ? limit.maxBytes : 100 * 1024 * 1024;
}

export function exceedsUploadLimit(mode: string, sizeBytes: number): boolean {
  return sizeBytes > getUploadLimit(mode);
}

export type ResumableUpload = {
  uploadId: string;
  dropId: string;
  totalBytes: number;
  uploadedBytes: number;
  chunkSize: number;
  status: "uploading" | "paused" | "completed" | "failed";
};

export function uploadProgress(upload: ResumableUpload): number {
  if (upload.totalBytes === 0) return 0;
  return Math.min(1, upload.uploadedBytes / upload.totalBytes);
}

export type CacheInvalidation = {
  dropId: string;
  paths: string[];
  invalidatedAt: string;
  reason: "edit" | "delete" | "takedown";
};

export type CdnRegion = "us-east" | "us-west" | "eu-west" | "ap-northeast";

export const CDN_REGIONS: readonly CdnRegion[] = ["us-east", "us-west", "eu-west", "ap-northeast"];
