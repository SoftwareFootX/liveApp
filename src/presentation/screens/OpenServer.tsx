// OpenServer.tsx
import React, { useRef, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = "http://182.160.26.67:7000"; // Puerto del backend WebSocket

const OpenServer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracking, setTracking] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [videoHeight, setVideoHeight] = useState(240);
  const trackingRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  // Abrir webcam al montar
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // Conectar WebSocket al montar
  useEffect(() => {
    const socket = io(WS_URL);
    socketRef.current = socket;

    socket.on("tracker_initialized", (data) => {
      setProcessing(false);
      drawBox(data.box);
      startLoop();
    });

    socket.on("track_result", (data) => {
      setProcessing(false);
      drawBox(data.box);
      if (trackingRef.current && data.success) {
        setTimeout(() => sendFrame(false), 5);
      } else {
        setTracking(false);
      }
    });

    socket.on("tracker_reset", () => {
      setTracking(false);
      setPoint(null);
      clearCanvas();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // Ajustar tamaño del canvas al del video
  const adjustCanvas = () => {
    if (canvasRef.current && videoRef.current) {
      const height =
        videoRef.current.videoHeight * (320 / videoRef.current.videoWidth);
      setVideoHeight(height);
      canvasRef.current.width = 320;
      canvasRef.current.height = height;
    }
  };

  const SCALE = 0.5;

  const drawBox = (box: number[] | null, scaled: boolean = true) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current || !box) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let [x, y, w, h] = box;
    if (scaled) {
      x /= SCALE;
      y /= SCALE;
      w /= SCALE;
      h /= SCALE;
    }

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Selección de punto con click sobre el canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tracking) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.round(
      (e.clientX - rect.left) * (canvasRef.current!.width / rect.width)
    );
    const y = Math.round(
      (e.clientY - rect.top) * (canvasRef.current!.height / rect.height)
    );
    setPoint({ x, y });

    const size = 25;
    drawBox([x - size / 2, y - size / 2, size, size], false); // ⬅️ No escalar
  };

  // Enviar frame por WebSocket
  const sendFrame = async (init = false) => {
    if (!canvasRef.current || !videoRef.current || !socketRef.current) return;
    setProcessing(true);

    const offscreenCanvas = document.createElement("canvas");
    const scale = 0.5; // Reducir tamaño: 50% (ajustable)
    const width = Math.round(canvasRef.current.width * scale);
    const height = Math.round(canvasRef.current.height * scale);
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext("2d");
    if (!ctx) return;

    // Dibujar frame reescalado
    ctx.drawImage(videoRef.current, 0, 0, width, height);

    // Convertir a escala de grises manualmente (más ligero)
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    ctx.putImageData(imageData, 0, 0);

    // Exportar como JPEG de baja calidad
    const blob = await new Promise<Blob | null>(
      (resolve) => offscreenCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.4) // Calidad 40%
    );
    if (!blob) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(",")[1];
      if (init && point) {
        socketRef.current!.emit("init_tracker", {
          frame: base64data,
          x: Math.round(point.x * scale),
          y: Math.round(point.y * scale),
          box_size: 25,
          width,
          height,
        });
      } else {
        socketRef.current!.emit("track_frame", {
          frame: base64data,
        });
      }
    };
    reader.readAsDataURL(blob);
  };

  // Loop de tracking (solo inicia el primer frame, el resto lo maneja el socket)
  const startLoop = () => {
    if (!trackingRef.current) return;
    sendFrame(false);
  };

  // Iniciar tracking
  const startTracking = async () => {
    if (!point) return;
    setTracking(true);
    await sendFrame(true);
  };

  // Reset tracker en backend
  const resetTracker = async () => {
    if (socketRef.current) {
      socketRef.current.emit("reset_tracker");
    }
    setTracking(false);
    setPoint(null);
    clearCanvas();
  };

  return (
    <div className="flex flex-col items-center py-6">
      <h2 className="text-2xl font-bold mb-4">OpenServer Tracking Demo</h2>
      <div
        className="relative border border-gray-400 rounded"
        style={{ width: 320, height: videoHeight }}
      >
        <video
          ref={videoRef}
          width={320}
          height={videoHeight}
          className="absolute top-0 left-0 z-10 bg-black rounded"
          autoPlay
          muted
          playsInline
          onCanPlay={adjustCanvas}
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={videoHeight}
          className="absolute top-0 left-0 z-20 cursor-crosshair"
          style={{ background: "transparent" }}
          onClick={handleCanvasClick}
        />
      </div>
      {!tracking && (
        <div className="mt-4 flex flex-col items-center">
          <p className="mb-2">
            {point
              ? `Punto seleccionado: (${point.x}, ${point.y})`
              : "Haz click en el video para seleccionar el punto a seguir."}
          </p>
          <div>
            <button
              onClick={startTracking}
              disabled={!point || processing}
              className="bg-blue-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
            >
              Iniciar Tracking
            </button>
            <button
              onClick={resetTracker}
              disabled={processing}
              className="bg-gray-400 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      {tracking && (
        <div className="mt-4 flex flex-col items-center">
          <p>
            Tracking en curso...{" "}
            {processing && (
              <span className="text-yellow-600">Procesando frame...</span>
            )}
          </p>
          <button
            onClick={resetTracker}
            className="bg-red-600 text-white px-4 py-2 rounded mt-2"
          >
            Detener
          </button>
        </div>
      )}
    </div>
  );
};

export { OpenServer };
