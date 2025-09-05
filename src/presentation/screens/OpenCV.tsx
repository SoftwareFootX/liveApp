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
          video: { width: 320, height: 240 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setStreaming(true);
          };
        }
      } catch (e) {
        console.error("\u274C Error accediendo a la c\u00e1mara", e);
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

  const createCvMatFromPoints = (points: { x: number; y: number }[]) => {
    const mat = new window.cv.Mat(points.length, 1, window.cv.CV_32FC2);
    points.forEach((pt, i) => {
      mat.data32F[i * 2] = pt.x;
      mat.data32F[i * 2 + 1] = pt.y;
    });
    return mat;
  };

  const getROIFromPoints = (
    points: { x: number; y: number }[],
    padding = 40,
    frameWidth = 320,
    frameHeight = 240
  ) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.max(Math.min(...xs) - padding, 0);
    const minY = Math.max(Math.min(...ys) - padding, 0);
    const maxX = Math.min(Math.max(...xs) + padding, frameWidth);
    const maxY = Math.min(Math.max(...ys) + padding, frameHeight);
    return new window.cv.Rect(minX, minY, maxX - minX, maxY - minY);
  };

  useEffect(() => {
    if (!cvReady || !streaming || !trackingEnabled) return;

    const cap = new window.cv.VideoCapture(videoRef.current);
    const frame = new window.cv.Mat(240, 320, window.cv.CV_8UC4);
    const currGray = new window.cv.Mat();
    const nextPoints = new window.cv.Mat();
    const status = new window.cv.Mat();
    const err = new window.cv.Mat();

    const winSize = new window.cv.Size(31, 31);
    const maxLevel = 3;
    const criteria = new window.cv.TermCriteria(
      window.cv.TERM_CRITERIA_EPS | window.cv.TERM_CRITERIA_COUNT,
      30,
      0.01
    );
    let lostCount = 0;
    const maxLostFrames = 3;

    const track = () => {
      cap.read(frame);
      window.cv.cvtColor(frame, currGray, window.cv.COLOR_RGBA2GRAY);
      window.cv.GaussianBlur(currGray, currGray, new window.cv.Size(5, 5), 1.5);

      if (prevPoints.current && prevGray.current) {
        const prevPts = prevPoints.current;
        const pts = [];
        for (let i = 0; i < prevPts.rows; i++) {
          pts.push({
            x: prevPts.data32F[i * 2],
            y: prevPts.data32F[i * 2 + 1],
          });
        }

        const roi = getROIFromPoints(pts);
        const prevROI = prevGray.current.roi(roi);
        const currROI = currGray.roi(roi);

        const prevPtsROI = new window.cv.Mat(
          prevPts.rows,
          1,
          window.cv.CV_32FC2
        );
        for (let i = 0; i < pts.length; i++) {
          prevPtsROI.data32F[i * 2] = pts[i].x - roi.x;
          prevPtsROI.data32F[i * 2 + 1] = pts[i].y - roi.y;
        }

        window.cv.calcOpticalFlowPyrLK(
          prevROI,
          currROI,
          prevPtsROI,
          nextPoints,
          status,
          err,
          winSize,
          maxLevel,
          criteria,
          0,
          0.001
        );

        const goodPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < status.rows; i++) {
          if (status.data[i] === 1 && err.data32F[i] < 20) {
            const x = nextPoints.data32F[i * 2] + roi.x;
            const y = nextPoints.data32F[i * 2 + 1] + roi.y;
            goodPoints.push({ x, y });
          }
        }

        if (goodPoints.length === prevPts.rows) {
          drawOverlay(goodPoints);
          lostCount = 0;
          prevPoints.current.delete();
          prevPoints.current = createCvMatFromPoints(goodPoints);
        } else {
          lostCount++;
          console.warn(
            `\u26A0\uFE0F Tracking impreciso (${lostCount}/${maxLostFrames})`
          );
          if (lostCount >= maxLostFrames) {
            console.log("\u274C Tracking perdido.");
            setTrackingEnabled(false);
          }
        }

        prevROI.delete();
        currROI.delete();
        prevPtsROI.delete();
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
      prevPoints.current = createCvMatFromPoints(clickPoints.current);

      if (prevGray.current) prevGray.current.delete();
      prevGray.current = new window.cv.Mat();

      const cap = new window.cv.VideoCapture(videoRef.current);
      const frame = new window.cv.Mat(240, 320, window.cv.CV_8UC4);
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
      style={{
        position: "relative",
        width: 640,
        height: 300,
        margin: "auto",
        top: 30,
      }}
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
      <div className=" flex items-center justify-center relative">
        <video
          ref={videoRef}
          width={320}
          height={240}
          className="rounded-md"
          muted
          playsInline
          autoPlay
        />

        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            position: "absolute",
            top: 0,
            left: 143,
            pointerEvents: "none",
          }}
        />
      </div>

      <p className="text-center text-gray-600 text-sm mt-3">
        Haz clic en dos puntos del cuerpo para seguirlos (ej: tobillo, rodilla).
      </p>
    </div>
  );
};

export { OpenCV };
