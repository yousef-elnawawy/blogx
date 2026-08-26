/**
 * Utility to extract a frame from a video file and convert it into an image File and preview URL.
 */
export async function captureVideoFirstFrame(
  file: File,
  seekTimeSeconds: number = 0.1
): Promise<{ file: File; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    // Check if running in browser
    if (typeof window === "undefined" || typeof document === "undefined") {
      return reject(new Error("Cannot extract video frame in non-browser environment"));
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";

    let hasExtracted = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    const extractFrame = () => {
      if (hasExtracted) return;
      hasExtracted = true;

      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return reject(new Error("Failed to create canvas 2d context"));
        }

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              cleanup();
              return reject(new Error("Failed to convert video frame to image blob"));
            }

            const fileName = `thumb_${Date.now()}.jpg`;
            const thumbnailFile = new File([blob], fileName, { type: "image/jpeg" });
            const previewUrl = URL.createObjectURL(blob);

            cleanup();
            resolve({ file: thumbnailFile, previewUrl });
          },
          "image/jpeg",
          0.88
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onloadeddata = () => {
      if (video.duration && seekTimeSeconds > video.duration) {
        video.currentTime = Math.max(0, video.duration / 2);
      } else {
        video.currentTime = seekTimeSeconds;
      }
    };

    video.onseeked = () => {
      extractFrame();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load video for thumbnail extraction"));
    };

    // Safety timeout in case seeked doesn't fire on some mobile browsers
    setTimeout(() => {
      if (!hasExtracted) {
        extractFrame();
      }
    }, 4000);
  });
}
