import { useState } from 'react';

export const useVideoCompressor = () => {
  const [compressing, setCompressing] = useState(false);

  const compressAndTrimVideo = async (videoFile) => {
    setCompressing(true);
    
    return new Promise((resolve, reject) => {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = URL.createObjectURL(videoFile);
      videoEl.muted = true;
      videoEl.playsInline = true;

      videoEl.onloadedmetadata = () => {
        // Enforce maximum 15s limit
        const duration = Math.min(videoEl.duration, 15);
        
        // Setup scaling constraints
        const targetWidth = 1280;
        const targetHeight = 720;
        
        // Downscale frames using an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // To keep implementation simple, native, and fast on the client (without massive dependencies like ffmpeg.wasm),
        // we simulate downscaling and trimming of the file into a compressed low-bitrate blob format
        const stream = canvas.captureStream(30); // Force 30fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          bitsPerSecond: 1500000 // 1.5 Mbps - optimized for 720p
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          const compressedFile = new File([compressedBlob], `compressed_${videoFile.name.split('.')[0]}.webm`, {
            type: 'video/webm'
          });
          setCompressing(false);
          resolve(compressedFile);
        };

        // Draw video frames to canvas
        videoEl.play();
        mediaRecorder.start();

        const fpsInterval = 1000 / 30;
        let lastFrameTime = Date.now();

        const drawFrame = () => {
          if (videoEl.currentTime >= duration || videoEl.paused || videoEl.ended) {
            mediaRecorder.stop();
            videoEl.pause();
            URL.revokeObjectURL(videoEl.src);
            return;
          }

          const now = Date.now();
          const elapsed = now - lastFrameTime;

          if (elapsed > fpsInterval) {
            lastFrameTime = now - (elapsed % fpsInterval);
            ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
          }
          requestAnimationFrame(drawFrame);
        };

        requestAnimationFrame(drawFrame);
      };

      videoEl.onerror = (err) => {
        setCompressing(false);
        reject(err);
      };
    });
  };

  return { compressAndTrimVideo, compressing };
};
