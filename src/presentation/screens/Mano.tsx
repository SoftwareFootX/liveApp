import React, { useRef, useEffect, useState, useCallback } from "react";
import { Hands, HAND_CONNECTIONS, type Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as drawing from "@mediapipe/drawing_utils";
import { Link } from "react-router-dom";

const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;
const COLOR_BOX_SIZE = 40;
const COLOR_PADDING = 10;

const COLOR_BOXES = [
  { color: "red" },
  { color: "green" },
  { color: "yellow" },
  { color: "blue" },
];

const Mano: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);

  const drawingPath = useRef<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("blue");
  const selectedColorRef = useRef<string>("blue");

  // Sincroniza color seleccionado con el ref
  const onColorBoxClick = (color: string) => {
    setSelectedColor(color);
    selectedColorRef.current = color;
    drawingPath.current = [];
  };

  const startCamera = useCallback(() => {
    if (!videoRef.current) return;

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (!handsRef.current) {
      handsRef.current = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      handsRef.current.onResults(onResults);
    }

    const width = Math.min(window.innerWidth, MAX_WIDTH);
    const height = Math.min(window.innerHeight, MAX_HEIGHT);

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width,
      height,
      facingMode,
    });

    cameraRef.current
      .start()
      .then(() => setCameraReady(true))
      .catch((e) => {
        console.error("Error starting camera:", e);
        setCameraReady(false);
      });
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      cameraRef.current?.stop();
      cameraRef.current = null;
      handsRef.current?.close();
      handsRef.current = null;
    };
  }, [startCamera]);

  // Solo lógica de dibujo al apuntar con el índice
  function onResults(results: Results) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      drawing.drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        lineWidth: 3,
      });
      drawing.drawLandmarks(ctx, landmarks, { radius: 4 });

      const [indexTip, indexPIP] = [landmarks[8], landmarks[6]];
      const [middleTip, middlePIP] = [landmarks[12], landmarks[10]];
      const [ringTip, ringPIP] = [landmarks[16], landmarks[14]];
      const [pinkyTip, pinkyPIP] = [landmarks[20], landmarks[18]];

      const isIndexUp =
        indexTip.y < indexPIP.y &&
        middleTip.y > middlePIP.y &&
        ringTip.y > ringPIP.y &&
        pinkyTip.y > pinkyPIP.y;

      const indexX = indexTip.x * canvas.width;
      const indexY = indexTip.y * canvas.height;

      if (isIndexUp) {
        if (!isDrawing) setIsDrawing(true);
        drawingPath.current.push({ x: indexX, y: indexY });
      } else {
        if (isDrawing) setIsDrawing(false);
      }

      // Dibujo con color actual
      if (drawingPath.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = selectedColorRef.current; // ✅ usa el valor correcto
        ctx.lineWidth = 3;
        ctx.moveTo(drawingPath.current[0].x, drawingPath.current[0].y);
        for (let i = 1; i < drawingPath.current.length; i++) {
          ctx.lineTo(drawingPath.current[i].x, drawingPath.current[i].y);
        }
        ctx.stroke();
      }
    }
  }

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    drawingPath.current = [];
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 space-y-4">
      <div className="w-full max-w-2xl flex justify-between items-center">
        <Link
          to="/election"
          className="text-sm bg-white text-blue-600 hover:text-blue-800 border border-blue-500 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          ← Atrás
        </Link>
        <button
          onClick={toggleCamera}
          disabled={!cameraReady}
          className={`text-sm bg-white text-blue-600 hover:text-blue-800 border border-blue-500 px-4 py-2 rounded-lg shadow-sm transition-all ${
            !cameraReady ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label="Cambiar cámara"
          type="button"
        >
          {facingMode === "user" ? "Cámara trasera" : "Cámara frontal"}
        </button>
      </div>

      <div
        className="relative rounded-lg shadow-lg overflow-hidden border border-gray-300 bg-white w-full max-w-3xl"
        style={{ aspectRatio: "4 / 3" }}
      >
        {/* Botones de color clicables */}
        <div
          style={{
            position: "absolute",
            top: COLOR_PADDING,
            left: COLOR_PADDING,
            display: "flex",
            gap: COLOR_PADDING,
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          {COLOR_BOXES.map(({ color }, idx) => (
            <button
              key={idx}
              onClick={() => onColorBoxClick(color)}
              style={{
                width: COLOR_BOX_SIZE,
                height: COLOR_BOX_SIZE,
                backgroundColor: color,
                border:
                  color === selectedColor
                    ? "3px solid white"
                    : "2px solid black",
                borderRadius: 4,
                cursor: "pointer",
              }}
              aria-label={`Seleccionar color ${color}`}
              type="button"
            />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="block w-full h-auto border border-gray-400"
          width={MAX_WIDTH}
          height={MAX_HEIGHT}
        />
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      </div>
    </div>
  );
};

export { Mano };
