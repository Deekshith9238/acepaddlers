import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { storage } from "./storage";

const exec = promisify(execFile);

export interface TranscodeResult {
  hlsKey: string; // HLS manifest key (m3u8)
  posterKey: string; // poster image key
}

/**
 * Transcode a source video into HLS + a poster frame. The local implementation
 * shells out to ffmpeg; the AWS implementation (Phase 4) submits a MediaConvert
 * job. Same interface either way.
 */
export interface Transcoder {
  toHls(sourcePath: string, outPrefix: string): Promise<TranscodeResult>;
}

class FfmpegTranscoder implements Transcoder {
  async toHls(sourcePath: string, outPrefix: string): Promise<TranscodeResult> {
    const dir = await storage.ensureDir(outPrefix);
    const manifestPath = `${dir}/index.m3u8`;
    const posterPath = `${dir}/poster.jpg`;

    // Single 720p rendition VOD HLS. Good enough locally; prod uses a ladder.
    await exec("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", "scale=-2:720",
      "-c:v", "libx264", "-profile:v", "main", "-crf", "28", "-preset", "fast",
      "-c:a", "aac", "-b:a", "128k",
      "-hls_time", "6", "-hls_playlist_type", "vod",
      "-hls_segment_filename", `${dir}/seg_%03d.ts`,
      manifestPath,
    ]);

    await exec("ffmpeg", [
      "-y", "-ss", "1", "-i", sourcePath, "-frames:v", "1",
      "-vf", "scale=-2:720", "-q:v", "4", posterPath,
    ]);

    return { hlsKey: `${outPrefix}/index.m3u8`, posterKey: `${outPrefix}/poster.jpg` };
  }
}

export const transcoder: Transcoder = new FfmpegTranscoder();
