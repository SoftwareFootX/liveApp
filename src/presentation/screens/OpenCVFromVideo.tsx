import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    cv: any;
  }
}

const OpenCVFromVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cvReady, setCvReady] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const prevGray = useRef<any>(null);
  const prevPoints = useRef<any>(null);
  const rafId = useRef<number>(0);
  const clickPoints = useRef<{ x: number; y: number }[]>([]);

  // Cargar OpenCV
  useEffect(() => {
    const waitForCV = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setCvReady(true);
        clearInterval(waitForCV);
      }
    }, 100);
    return () => clearInterval(waitForCV);
  }, []);

  const drawOverlay = (points: { x: number; y: number }[]) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Dibujar puntos
    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    // Dibujar líneas y ángulos
    for (let i = 0; i < points.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Calcular y mostrar ángulos
    const drawAngle = (A: any, B: any, C: any) => {
      const angle = computeAngle(A, B, C);
      ctx.fillStyle = "yellow";
      ctx.font = "16px Arial";
      ctx.fillText(`${angle.toFixed(1)}°`, B.x + 10, B.y - 10);
    };

    if (points.length >= 3) drawAngle(points[0], points[1], points[2]);
    if (points.length === 4) drawAngle(points[1], points[2], points[3]);
  };

  const computeAngle = (A: any, B: any, C: any) => {
    const v1 = { x: A.x - B.x, y: A.y - B.y };
    const v2 = { x: C.x - B.x, y: C.y - B.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    const angleRad = Math.acos(dot / (mag1 * mag2));

    return (angleRad * 180) / Math.PI;
  };

  useEffect(() => {
    if (!cvReady || !videoLoaded || !trackingEnabled) return;

    const cv = window.cv;
    const cap = new cv.VideoCapture(videoRef.current);
    const frame = new cv.Mat(480, 640, cv.CV_8UC4);
    const currGray = new cv.Mat();
    const nextPoints = new cv.Mat();
    const status = new cv.Mat();
    const err = new cv.Mat();
    const winSize = new cv.Size(31, 31);
    const maxLevel = 3;

    const track = () => {
      cap.read(frame);
      cv.cvtColor(frame, currGray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(currGray, currGray, new cv.Size(5, 5), 1.5);

      if (prevPoints.current && prevGray.current) {
        cv.calcOpticalFlowPyrLK(
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
          prevPoints.current = new cv.Mat(newPoints.length, 1, cv.CV_32FC2);
          newPoints.forEach((pt, i) => {
            prevPoints.current.data32F[i * 2] = pt.x;
            prevPoints.current.data32F[i * 2 + 1] = pt.y;
          });
        } else {
          console.log("⚠️ Tracking perdido.");
          setTrackingEnabled(false);
        }
      }

      currGray.copyTo(prevGray.current);

      if (!videoRef.current?.paused && !videoRef.current?.ended) {
        rafId.current = requestAnimationFrame(track);
      }
    };

    rafId.current = requestAnimationFrame(track);

    return () => {
      frame.delete();
      currGray.delete();
      nextPoints.delete();
      status.delete();
      err.delete();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [cvReady, videoLoaded, trackingEnabled]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!videoRef.current || !canvasRef.current || !window.cv || !videoLoaded)
      return;

    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (clickPoints.current.length >= 4) return;

    clickPoints.current.push({ x, y });
    drawOverlay(clickPoints.current);

    if (clickPoints.current.length === 4) {
      const cv = window.cv;

      if (prevPoints.current) prevPoints.current.delete();
      prevPoints.current = new cv.Mat(4, 1, cv.CV_32FC2);

      clickPoints.current.forEach((pt, i) => {
        prevPoints.current.data32F[i * 2] = pt.x;
        prevPoints.current.data32F[i * 2 + 1] = pt.y;
      });

      if (prevGray.current) prevGray.current.delete();
      prevGray.current = new cv.Mat();

      const cap = new cv.VideoCapture(videoRef.current);
      const frame = new cv.Mat(480, 640, cv.CV_8UC4);
      cap.read(frame);
      cv.cvtColor(frame, prevGray.current, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(
        prevGray.current,
        prevGray.current,
        new cv.Size(5, 5),
        1.5
      );
      frame.delete();

      setTrackingEnabled(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
      videoRef.current.onloadeddata = () => {
        videoRef.current!.width = 640;
        videoRef.current!.height = 480;
        setVideoLoaded(true);
        videoRef.current?.play();
      };
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Botón "Atrás" FUERA del contenedor */}
      <div className="flex justify-start">
        <Link
          to="/election"
          className="text-sm bg-white text-blue-600 hover:text-blue-800 border border-blue-500 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          ← Atrás
        </Link>
      </div>

      {/* Contenedor principal con video y canvas */}
      <div className="text-center bg-white rounded-lg shadow-md border border-gray-300 p-4 space-y-4">
        {/* Input de archivo */}
        <label className="block text-sm font-medium text-gray-700">
          Cargar video:
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </label>

        {/* Video + Canvas */}
        <div
          className="relative mx-auto"
          style={{ width: 640, height: 480 }}
          onClick={handleClick}
        >
          <video
            ref={videoRef}
            width={640}
            height={480}
            muted
            playsInline
            controls
            style={{ display: "block", backgroundColor: "black" }}
            className="rounded-md"
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
        </div>

        {/* Texto de ayuda */}
        <p className="text-gray-600 text-sm">
          Carga un video, haz clic en 4 puntos, y se mostrarán ángulos formados.
        </p>
      </div>
    </div>
  );
};

export { OpenCVFromVideo };
