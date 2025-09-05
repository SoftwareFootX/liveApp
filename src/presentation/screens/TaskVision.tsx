import React, { useEffect, useRef } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const WIDTH = 360;
const HEIGHT = 270;
const FRAME_THROTTLE_MS = 100;

const TaskVision: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputSegmentationMasks: false,
        });

        poseLandmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: WIDTH, height: HEIGHT },
          audio: false,
        });

        if (!isMounted) return;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        detectLoop();
      } catch (err) {
        console.error("Error initializing:", err);
      }
    };

    init();

    const detectLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (!video || !canvas || !poseLandmarker) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      const processFrame = () => {
        const now = performance.now();

        if (now - lastTimestampRef.current > FRAME_THROTTLE_MS) {
          lastTimestampRef.current = now;

          const result = poseLandmarker.detectForVideo(video, now);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          for (const landmarks of result.landmarks) {
            const utils = new DrawingUtils(ctx);
            utils.drawLandmarks(landmarks);
            utils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
          }
        }

        animationFrameIdRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    return () => {
      isMounted = false;

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      if (videoRef.current) {
        videoRef.current.pause();
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((t) => t.stop());
      }

      poseLandmarkerRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-4 space-y-2">
      <div style={{ position: "relative" }}>
        <video
          ref={videoRef}
          style={{ width: WIDTH, height: HEIGHT }}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export { TaskVision };
