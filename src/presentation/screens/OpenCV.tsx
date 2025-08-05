import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    cv: any;
  }
}

const OpenCV: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cvReady, setCvReady] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const prevGray = useRef<any>(null);
  const prevPoints = useRef<any>(null);
  const rafId = useRef<number>(0);
  const clickPoints = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const waitForCV = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setCvReady(true);
        clearInterval(waitForCV);
      }
    }, 100);
    return () => clearInterval(waitForCV);
  }, []);

  useEffect(() => {
    if (!cvReady) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setStreaming(true);
          };
        }
      } catch (e) {
        console.error("❌ Error accediendo a la cámara", e);
      }
    };

    startCamera();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [cvReady]);

  const drawOverlay = (points: { x: number; y: number }[]) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (!cvReady || !streaming || !trackingEnabled) return;

    const cap = new window.cv.VideoCapture(videoRef.current);
    const frame = new window.cv.Mat(480, 640, window.cv.CV_8UC4);
    const currGray = new window.cv.Mat();
    const nextPoints = new window.cv.Mat();
    const status = new window.cv.Mat();
    const err = new window.cv.Mat();

    const winSize = new window.cv.Size(31, 31);
    const maxLevel = 3;

    const track = () => {
      cap.read(frame);
      window.cv.cvtColor(frame, currGray, window.cv.COLOR_RGBA2GRAY);
      window.cv.GaussianBlur(currGray, currGray, new window.cv.Size(5, 5), 1.5);

      if (prevPoints.current && prevGray.current) {
        window.cv.calcOpticalFlowPyrLK(
          prevGray.current,
          currGray,
          prevPoints.current,
          nextPoints,
          status,
          err,
          winSize,
          maxLevel
        );

        const newPoints: { x: number; y: number }[] = [];

        for (let i = 0; i < status.rows; i++) {
          if (status.data[i] === 1 && err.data32F[i] < 20) {
            const x = nextPoints.data32F[i * 2];
            const y = nextPoints.data32F[i * 2 + 1];
            newPoints.push({ x, y });
          }
        }

        if (newPoints.length === prevPoints.current.rows) {
          drawOverlay(newPoints);

          prevPoints.current.delete();
          prevPoints.current = new window.cv.Mat(
            newPoints.length,
            1,
            window.cv.CV_32FC2
          );
          newPoints.forEach((pt, i) => {
            prevPoints.current.data32F[i * 2] = pt.x;
            prevPoints.current.data32F[i * 2 + 1] = pt.y;
          });
        } else {
          console.log("⚠️ Tracking perdido por error alto o falta de puntos.");
          setTrackingEnabled(false);
        }
      }

      currGray.copyTo(prevGray.current);
      rafId.current = requestAnimationFrame(track);
    };

    track();

    return () => {
      frame.delete();
      currGray.delete();
      nextPoints.delete();
      status.delete();
      err.delete();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [cvReady, streaming, trackingEnabled]);

  const handleClick = (e: React.MouseEvent) => {
    if (!videoRef.current || !canvasRef.current || !window.cv || !streaming)
      return;

    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    clickPoints.current.push({ x, y });
    drawOverlay(clickPoints.current);

    if (clickPoints.current.length === 2) {
      if (prevPoints.current) prevPoints.current.delete();
      prevPoints.current = new window.cv.Mat(2, 1, window.cv.CV_32FC2);

      clickPoints.current.forEach((pt, i) => {
        prevPoints.current.data32F[i * 2] = pt.x;
        prevPoints.current.data32F[i * 2 + 1] = pt.y;
      });

      if (prevGray.current) prevGray.current.delete();
      prevGray.current = new window.cv.Mat();

      const cap = new window.cv.VideoCapture(videoRef.current);
      const frame = new window.cv.Mat(480, 640, window.cv.CV_8UC4);
      cap.read(frame);
      window.cv.cvtColor(frame, prevGray.current, window.cv.COLOR_RGBA2GRAY);
      window.cv.GaussianBlur(
        prevGray.current,
        prevGray.current,
        new window.cv.Size(5, 5),
        1.5
      );
      frame.delete();

      setTrackingEnabled(true);
    }
  };

  return (
    <div
      style={{ position: "relative", width: 640, height: 520, margin: "auto" }}
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md border border-gray-300 p-4"
    >
      <div className="absolute top-4 left-4 z-10">
        <Link
          to="/election"
          className="text-sm bg-white text-blue-600 hover:text-blue-800 border border-blue-500 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          ← Atrás
        </Link>
      </div>

      <video
        ref={videoRef}
        width={640}
        height={480}
        className="rounded-md"
        muted
        playsInline
        autoPlay
      />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />

      <p className="text-center text-gray-600 text-sm mt-3">
        Haz clic en dos puntos del cuerpo para seguirlos (ej: tobillo, rodilla).
      </p>
    </div>
  );
};

export { OpenCV };
