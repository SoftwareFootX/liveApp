import { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

// ------------------ Interfaces ------------------
interface PosePoint {
  name: string; // ej: "left_wrist"
  x: number; // normalizado 0-1
  y: number;
}

interface FrameData {
  id: number;
  image: string;
  points: PosePoint[];
  lines: [number, number][]; // <-- agregamos esto
}

type Recording = FrameData[];

// ------------------ Componente ------------------
const Biomecanica = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [recording, setRecording] = useState(false);
  const [frames, setFrames] = useState<Recording>([]);
  const frameIdRef = useRef(0);

  // ---------- Estado para secuencias ----------
  const [savedSequences, setSavedSequences] = useState<
    { title: string; frames: FrameData[]; currentFrameIndex: number }[]
  >([]);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const recordingStartRef = useRef<number | null>(null);

  const [modo, setModo] = useState<"bicicleta" | "caminar">("bicicleta");
  const [segundos, setSegundos] = useState(3);
  const [lado, setLado] = useState<"izq" | "der">("izq");

  // ---------- Guardar secuencia ----------
  const saveSequence = () => {
    if (frames.length === 0) return;

    const title = prompt(
      "Nombre de la secuencia:",
      `Secuencia ${savedSequences.length + 1}`
    );
    if (!title) return;

    setSavedSequences((prev) => [
      ...prev,
      { title, frames: [...frames], currentFrameIndex: 0 },
    ]);

    // Limpiar la secuencia actual
    setFrames([]);
    frameIdRef.current = 0;
    setCurrentFrameIndex(0);
  };

  // ---------- Seleccionar secuencia guardada ----------
  const loadSequence = (index: number) => {
    const seq = savedSequences[index];
    setFrames(seq.frames.map((f) => ({ ...f }))); // Clonamos para no mutar original
    setCurrentFrameIndex(seq.currentFrameIndex);
  };

  // valores recomendados
  const scale = 1; // 90%, cambiar por 0.8, 0.7 etc.
  const CAMERA_WIDTH = Math.round(640 * scale);
  const CAMERA_HEIGHT = Math.round(480 * scale);
  const SAVE_WIDTH = 320; // tamaño al que guardás (reduce memoria)
  const SAVE_HEIGHT = 240;
  const JPEG_QUALITY = 1.0; // 0.0 - 1.0, menos => menos peso

  // Inicializamos mediapipe
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    pose.onResults((results) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;

        // --- ids y líneas según modo/lado ---
        let ids: number[] = [];
        let lines: [number, number][] = [];

        if (modo === "bicicleta") {
          ids =
            lado === "der"
              ? [32, 28, 26, 24, 12, 14, 16]
              : [31, 27, 25, 23, 11, 13, 15];
        } else if (modo === "caminar") {
          ids = lado === "der" ? [32, 28, 26, 24, 12] : [31, 27, 25, 23, 11];
        }
        for (let i = 0; i < ids.length - 1; i++) {
          lines.push([ids[i], ids[i + 1]]);
        }

        // --- Dibujo de puntos y líneas ---
        ctx.fillStyle = "yellow";
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 3;

        ids.forEach((id) => {
          const p = lm[id];
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        });

        lines.forEach(([a, b]) => {
          const pa = lm[a],
            pb = lm[b];
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

        // --- Guardar frame si estamos grabando ---
        // --- Guardar frame si estamos grabando ---
        if (recording) {
          const now = performance.now();

          // guardamos el timestamp del primer frame
          if (!recordingStartRef.current) {
            recordingStartRef.current = now;
          }

          // verificamos cuanto tiempo ha pasado desde el primer frame
          const elapsed = now - recordingStartRef.current;
          if (elapsed <= segundos * 1000) {
            // --- todo tu bloque que ya funciona ---
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = SAVE_WIDTH;
            tempCanvas.height = SAVE_HEIGHT;
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCtx.drawImage(
              videoRef.current!,
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            );
            const image = tempCanvas.toDataURL("image/jpeg", JPEG_QUALITY);

            const points: PosePoint[] = ids.map((id) => ({
              name: `lm_${id}`,
              x: lm[id].x,
              y: lm[id].y,
            }));

            const localLines: [number, number][] = [];
            for (let i = 0; i < ids.length - 1; i++) {
              localLines.push([i, i + 1]);
            }

            setFrames((prev) => [
              ...prev,
              { id: frameIdRef.current++, image, points, lines: localLines },
            ]);
          } else {
            // detener grabación cuando pasaron 3 segundos reales
            setRecording(false);
            setCurrentFrameIndex(0);
          }
        }
      }
    });

    // --- Configuración de cámara ---
    const video = videoRef.current;
    if (!video) return;
    const camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: CAMERA_WIDTH,
      height: CAMERA_HEIGHT,
    });
    camera.start();

    return () => {
      pose.close();
      camera.stop();
    };
  }, [recording, modo, lado]);

  // ------------------ Funciones ------------------
  const startRecording = () => {
    setFrames([]);
    frameIdRef.current = 0;
    recordingStartRef.current = null; // guardamos el timestamp del primer frame
    setRecording(true);
  };

  const intervalRef = useRef<any | null>(null);

  // ------------------ Next Frame ------------------
  const nextFrame = () => {
    if (currentFrameIndex < frames.length - 1) {
      setCurrentFrameIndex((i) => i + 1);
    }
  };

  const handleNextPressStart = () => {
    nextFrame(); // avanza inmediatamente 1 frame
    intervalRef.current = setInterval(() => {
      nextFrame();
    }, 150); // cada 150ms
  };

  const handleNextPressEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ------------------ Previous Frame ------------------

  const prevFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex((i) => i - 1);
    }
  };

  const handlePrevPressStart = () => {
    prevFrame(); // retrocede 1 frame inmediatamente
    intervalRef.current = setInterval(() => {
      prevFrame();
    }, 150);
  };

  const handlePrevPressEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // drag de puntos
  const handleDrag = (e: React.MouseEvent<SVGCircleElement>, idx: number) => {
    if (!canvasRef.current) return;

    const rect = (
      e.target as SVGCircleElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFrames((prev) => {
      const updated = [...prev];
      updated[currentFrameIndex].points[idx] = {
        ...updated[currentFrameIndex].points[idx],
        x,
        y,
      };
      return updated;
    });
  };

  // ------------------ Render ------------------
  return (
    <div className="p-6 flex flex-col bg-gray-50 min-h-screen">
      {/* Video en vivo */}
      <div className="w-1/2 ">
        <div className="relative w-[448px] h-[336px] rounded-lg overflow-hidden shadow-lg border border-gray-200 mx-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          <div className="absolute top-2 left-2 bg-white/70 px-3 py-1 rounded text-sm font-medium text-gray-700 shadow-sm">
            Modo: {modo} | Lado: {lado}
          </div>
        </div>

        {/* Controles */}
        <div className="mt-4 w-full max-w-xl flex flex-col gap-3">
          {/* Fila 1 - Selectores */}
          <div className="flex flex-wrap justify-around gap-3 items-center">
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value as any)}
              className="px-3 py-2 border rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]"
            >
              <option value="bicicleta">🚴 Bicicleta</option>
              <option value="caminar">🚶 Caminar</option>
            </select>

            <select
              value={lado}
              onChange={(e) => setLado(e.target.value as any)}
              className="px-3 py-2 border rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]"
            >
              <option value="der">Derecho</option>
              <option value="izq">Izquierdo</option>
            </select>

            <select
              value={segundos}
              onChange={(e) => setSegundos(e.target.value as any)}
              className="px-3 py-2 border rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]"
            >
              <option value="2">2 segundos</option>
              <option value="3">3 segundos</option>
              <option value="4">4 segundos</option>
              <option value="5">5 segundos</option>
            </select>
          </div>

          {/* Fila 2 - Botones */}
          <div className="flex justify-center gap-4 mt-1">
            <button
              className={`px-3 py-1 rounded-md text-white font-medium transition shadow ${
                recording
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={startRecording}
              disabled={recording}
            >
              {recording ? "⏺️ Grabando..." : `🎥 Grabar ${segundos}s`}
            </button>

            <button
              className="px-3 py-1 rounded-md bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
              onClick={saveSequence}
            >
              💾 Guardar secuencia
            </button>
          </div>
        </div>

        {/* Visor de frames */}
        {frames.length > 0 && !recording && (
          <div className="mt-4 w-full">
            <div className="flex justify-between items-center mb-4 text-gray-700 font-medium">
              <button
                onMouseDown={handlePrevPressStart}
                onMouseUp={handlePrevPressEnd}
                onMouseLeave={handlePrevPressEnd}
                onTouchStart={handlePrevPressStart}
                onTouchEnd={handlePrevPressEnd}
                disabled={currentFrameIndex === 0}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                ⬅️ Anterior
              </button>
              <span>
                Frame {currentFrameIndex + 1} / {frames.length}
              </span>
              <button
                onMouseDown={handleNextPressStart}
                onMouseUp={handleNextPressEnd}
                onMouseLeave={handleNextPressEnd}
                onTouchStart={handleNextPressStart}
                onTouchEnd={handleNextPressEnd}
                disabled={currentFrameIndex === frames.length - 1}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                Siguiente ➡️
              </button>
            </div>

            <div className="relative border rounded-lg overflow-hidden shadow-lg w-96 mx-auto">
              <img
                src={frames[currentFrameIndex].image}
                alt={`frame-${currentFrameIndex}`}
                className="w-full"
              />

              {/* Botones sobrepuestos */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  className="bg-white px-2 py-1 rounded shadow hover:bg-red-400 text-sm z-10"
                  onClick={() => {
                    // Eliminar el frame actual

                    setFrames((prev) =>
                      prev.filter((_, idx) => idx !== currentFrameIndex)
                    );
                    setCurrentFrameIndex((i) => (i > 0 ? i - 1 : 0));
                  }}
                >
                  🗑️
                </button>

                <button
                  className="bg-white px-2 py-1 rounded shadow hover:bg-blue-500 text-sm z-10"
                  onClick={() => {
                    // Exportar frame con líneas y puntos dibujados
                    const canvas = document.createElement("canvas");
                    canvas.width = canvasRef.current?.width || 640;
                    canvas.height = canvasRef.current?.height || 480;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;

                    const frame = frames[currentFrameIndex];
                    const img = new Image();
                    img.src = frame.image;
                    img.onload = () => {
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                      // dibujar líneas
                      ctx.strokeStyle = "cyan";
                      ctx.lineWidth = 3;
                      frame.lines.forEach(([a, b]) => {
                        const pa = frame.points[a];
                        const pb = frame.points[b];
                        ctx.beginPath();
                        ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
                        ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
                        ctx.stroke();
                      });

                      // dibujar puntos
                      ctx.fillStyle = "red";
                      frame.points.forEach((p) => {
                        ctx.beginPath();
                        ctx.arc(
                          p.x * canvas.width,
                          p.y * canvas.height,
                          6,
                          0,
                          2 * Math.PI
                        );
                        ctx.fill();
                      });

                      // Descargar la imagen
                      const link = document.createElement("a");
                      link.download = `frame_${currentFrameIndex + 1}.png`;
                      link.href = canvas.toDataURL("image/png");
                      link.click();
                    };
                  }}
                >
                  💾
                </button>
              </div>

              {/* SVG dibujando puntos y líneas actuales */}
              <svg
                className="absolute top-0 left-0 w-full h-full z-0"
                viewBox={`0 0 ${canvasRef.current?.width} ${
                  canvasRef.current?.height || 480
                }`}
              >
                {frames[currentFrameIndex].lines.map(([a, b], idx) => {
                  const pa = frames[currentFrameIndex].points[a];
                  const pb = frames[currentFrameIndex].points[b];
                  return (
                    <line
                      key={`line-${idx}`}
                      x1={pa.x * (canvasRef.current?.width || 640)}
                      y1={pa.y * (canvasRef.current?.height || 480)}
                      x2={pb.x * (canvasRef.current?.width || 640)}
                      y2={pb.y * (canvasRef.current?.height || 480)}
                      stroke="#22D3EE"
                      strokeWidth="3"
                    />
                  );
                })}
                {frames[currentFrameIndex].points.map((p, idx) => (
                  <circle
                    key={`point-${idx}`}
                    cx={p.x * (canvasRef.current?.width || 640)}
                    cy={p.y * (canvasRef.current?.height || 480)}
                    r="6"
                    fill="red"
                    style={{ cursor: "grab" }}
                    onMouseDown={() => {
                      const moveHandler = (ev: MouseEvent) =>
                        handleDrag(ev as any, idx);
                      const upHandler = () => {
                        window.removeEventListener("mousemove", moveHandler);
                        window.removeEventListener("mouseup", upHandler);
                      };
                      window.addEventListener("mousemove", moveHandler);
                      window.addEventListener("mouseup", upHandler);
                    }}
                  />
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Galería de secuencias */}
        {savedSequences.length > 0 && (
          <div className="mt-8 w-[500px]">
            <h3 className="text-gray-700 font-semibold mb-2 text-lg">
              Secuencias guardadas
            </h3>
            <div className="flex flex-col gap-2">
              {savedSequences.map((seq, i) => (
                <div
                  key={i}
                  className="p-2 border rounded-md cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                  onClick={() => loadSequence(i)}
                >
                  <span className="font-medium text-gray-800">{seq.title}</span>
                  <span className="text-gray-500 text-sm">
                    {seq.frames.length} frames
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="w-1/2"></div>
    </div>
  );
};

export { Biomecanica };
