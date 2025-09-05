import { useEffect, useRef, useState } from "react";
import { Pose, type Landmark } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { BiVideoRecording } from "react-icons/bi";
import { FaRegStopCircle } from "react-icons/fa";
import {
  LineChart,
  CartesianGrid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

// const poses = [
//   [1, 4], // Ojos (internos)
//   [2, 5], // Ojos
//   [3, 6], // Ojos (externos)
//   [7, 8], // Orejas
//   [9, 10], // Boca
//   [11, 12], // Hombros
//   [13, 14], // Codos
//   [15, 16], // Muñecas
//   [17, 18], // Pulgares
//   [19, 20], // Base de la mano
//   [21, 22], // Dedo medio
//   [23, 24], // Caderas
//   [25, 26], // Rodillas
//   [27, 28], // Tobillos
//   [29, 30], // Talones
//   [31, 32], // Pies (dedos)
// ];

const MediaPipe = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [costado, setCostado] = useState<"izq" | "der">("izq");
  const [modo, setModo] = useState<
    "bicicleta" | "caminar" | "postura" | "inferior" | "sagital" | "frontal"
  >("postura");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const costadoRef = useRef<"izq" | "der">("der");

  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [usingUploadedVideo, setUsingUploadedVideo] = useState(false);
  const [angleData, setAngleData] = useState<{ time: number; angle: number }[]>(
    []
  );
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.src = videoURL;
      videoRef.current.controls = true;
      videoRef.current.muted = false;
      videoRef.current.loop = true;
      videoRef.current.play();
    }
  }, [videoURL]);

  useEffect(() => {
    costadoRef.current = costado;
  }, [costado]);

  const calculateAngle = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    const angleRad = Math.acos(dot / (magAB * magCB));
    const angleDeg = (angleRad * 180) / Math.PI;
    return Math.abs(180 - angleDeg); // <-- invierte la escala
  };

  function calculatePelvis(
    leftHip: Landmark,
    rightHip: Landmark,
    canvasWidth: number,
    canvasHeight: number
  ): number {
    // Pasar coords normalizadas a píxeles
    const lx = leftHip.x * canvasWidth;
    const ly = leftHip.y * canvasHeight;
    const rx = rightHip.x * canvasWidth;
    const ry = rightHip.y * canvasHeight;

    // Diferencias
    const dx = rx - lx; // distancia horizontal entre caderas
    const dy = ry - ly; // diferencia vertical (positivo si derecha está más abajo)

    // Ángulo de la línea de caderas respecto a la horizontal
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI);

    // Queremos inclinación respecto a la horizontal → ya está centrada en 0
    // Si derecha más baja que izquierda → angleDeg positivo
    return angleDeg * -1;
  }

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.6,
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
        let ids: number[] = [];
        let lines: [number, number][] = [];

        if (modo === "bicicleta") {
          ids =
            costadoRef.current === "der"
              ? [32, 28, 26, 24, 12, 14, 16]
              : [31, 27, 25, 23, 11, 13, 15];
          for (let i = 0; i < ids.length - 1; i++) {
            lines.push([ids[i], ids[i + 1]]);
          }
        } else if (modo === "caminar") {
          ids =
            costadoRef.current === "der"
              ? [32, 28, 26, 24, 12]
              : [31, 27, 25, 23, 11];
          for (let i = 0; i < ids.length - 1; i++) {
            lines.push([ids[i], ids[i + 1]]);
          }
        } else if (modo === "inferior") {
          ids =
            costadoRef.current === "der"
              ? [24, 26, 28] // cadera, rodilla, tobillo derecho
              : [23, 25, 27]; // cadera, rodilla, tobillo izquierdo
          for (let i = 0; i < ids.length - 1; i++) {
            lines.push([ids[i], ids[i + 1]]);
          }
        } else if (modo === "postura") {
          ids = [11, 12, 23, 24, 13, 14, 15, 16, 25, 26, 27, 28, 29, 30];

          lines = [
            [11, 12], // hombros
            [23, 24], // caderas
            [11, 23], // hombro izq → cadera izq
            [12, 24], // hombro der → cadera der
            [11, 13], // brazo izq
            [13, 15], // codo izq → muñeca izq
            [12, 14], // brazo der
            [14, 16], // codo der → muñeca der
            [23, 25], // pierna izq
            [25, 27], // rodilla izq → tobillo izq
            [27, 29], // tobillo izq → talón izq ✅
            [24, 26], // pierna der
            [26, 28], // rodilla der → tobillo der
            [28, 30], // tobillo der → talón der ✅
          ];
        } else if (modo === "sagital") {
          ids = costadoRef.current === "der" ? [28, 30, 32] : [27, 29, 31];
          for (let i = 0; i < ids.length - 1; i++) {
            lines.push([ids[i], ids[i + 1]]);
          }
        } else if (modo === "frontal") {
          ids = costadoRef.current === "der" ? [26, 28, 30] : [25, 27, 29];
          for (let i = 0; i < ids.length - 1; i++) {
            lines.push([ids[i], ids[i + 1]]);
          }
        }

        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 3;
        ctx.fillStyle = "magenta";
        ctx.font = "14px Arial";
        ctx.fillStyle = "yellow";

        ids.forEach((id) => {
          const p = lm[id];
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        });

        lines.forEach(([a, b]) => {
          const pa = lm[a];
          const pb = lm[b];
          const ax = pa.x * canvas.width;
          const ay = pa.y * canvas.height;
          const bx = pb.x * canvas.width;
          const by = pb.y * canvas.height;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          if (modo === "frontal") {
            const ids =
              costadoRef.current === "der" ? [26, 28, 30] : [25, 27, 29];

            for (let i = 1; i < ids.length - 1; i++) {
              const prev = lm[ids[i - 1]];
              const mid = lm[ids[i]];
              const next = lm[ids[i + 1]];
              const x = mid.x * canvas.width;
              const y = mid.y * canvas.height;
              const angle = Math.round(calculateAngle(prev, mid, next));
              ctx.fillStyle = "yellow";
              ctx.fillText(`${angle}º`, x + 5, y - 5);
            }
          }

          if (modo === "sagital") {
            const ids =
              costadoRef.current === "der" ? [28, 30, 32] : [27, 29, 31];

            for (let i = 1; i < ids.length - 1; i++) {
              const prev = lm[ids[i - 1]];
              const mid = lm[ids[i]];
              const next = lm[ids[i + 1]];
              const x = mid.x * canvas.width;
              const y = mid.y * canvas.height;
              const angle = Math.round(calculateAngle(prev, mid, next));
              ctx.fillStyle = "yellow";
              ctx.fillText(`${angle}º`, x + 5, y - 5);
            }
          }
          // POSTURA
          if (modo === "postura") {
            const angulosPostura: [number, number, number][] = [
              [23, 11, 13], // Hombro derecho
              [11, 13, 15], // Codo derecho
              [24, 12, 14], // Hombro izquierdo
              [12, 14, 16], // Codo izquierdo
              [12, 24, 26], // Cadera derecha
              [24, 26, 32], // Rodilla derecha
              [11, 23, 25], // Cadera izquierda
              [23, 25, 31], // Rodilla izquierda
            ];

            const leftHip = lm[23];
            const rightHip = lm[24];

            const pelvisAngleDer = calculatePelvis(
              leftHip,
              rightHip,
              canvas.width,
              canvas.height
            );

            const pelvisAngleizq = pelvisAngleDer * -1;

            // Mostrar el ángulo cerca de la cadera izquierda
            const lx = leftHip.x * canvas.width;
            const ly = leftHip.y * canvas.height;

            ctx.fillStyle = "cyan";
            ctx.fillText(
              `Pelvis: ${pelvisAngleDer.toFixed(1)}º`,
              lx + 10,
              ly - 10
            );

            ctx.fillText(
              `Pelvis: ${pelvisAngleizq.toFixed(1)}º`,
              lx + 50,
              ly - 50
            );

            angulosPostura.forEach(([a, b, c]) => {
              const pa = lm[a];
              const pb = lm[b];
              const pc = lm[c];

              const bx = pb.x * canvas.width;
              const by = pb.y * canvas.height;
              const angle = Math.round(calculateAngle(pa, pb, pc));

              ctx.fillStyle = "yellow";
              ctx.fillText(`${angle}º`, bx + 5, by - 5);
            });
          }

          // BICICLETA
          if (modo === "bicicleta") {
            const ids =
              costadoRef.current === "der"
                ? [32, 28, 26, 24, 12, 14, 16]
                : [31, 27, 25, 23, 11, 13, 15];

            for (let i = 1; i < ids.length - 1; i++) {
              const prev = lm[ids[i - 1]];
              const mid = lm[ids[i]];
              const next = lm[ids[i + 1]];
              const x = mid.x * canvas.width;
              const y = mid.y * canvas.height;
              const angle = Math.round(calculateAngle(prev, mid, next));
              ctx.fillStyle = "yellow";
              ctx.fillText(`${angle}º`, x + 5, y - 5);
            }
          }

          // CAMINAR (CINTA)
          if (modo === "caminar") {
            const ids =
              costadoRef.current === "der"
                ? [32, 28, 26, 24, 12]
                : [31, 27, 25, 23, 11];

            for (let i = 1; i < ids.length - 1; i++) {
              const prev = lm[ids[i - 1]];
              const mid = lm[ids[i]];
              const next = lm[ids[i + 1]];
              const x = mid.x * canvas.width;
              const y = mid.y * canvas.height;
              const angle = Math.round(calculateAngle(prev, mid, next));
              ctx.fillStyle = "yellow";
              ctx.fillText(`${angle}º`, x + 5, y - 5);
            }
          }

          // INFERIOR
          if (modo === "inferior") {
            const ids =
              costadoRef.current === "der"
                ? [24, 26, 28] // cadera, rodilla, tobillo derecho
                : [23, 25, 27]; // cadera, rodilla, tobillo izquierdo

            // Dibujar puntos
            ids.forEach((id) => {
              const p = lm[id];
              const x = p.x * canvas.width;
              const y = p.y * canvas.height;
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, 2 * Math.PI);
              ctx.fill();
            });

            // Dibujar líneas entre los puntos
            for (let i = 0; i < ids.length - 1; i++) {
              const a = lm[ids[i]];
              const b = lm[ids[i + 1]];
              const ax = a.x * canvas.width;
              const ay = a.y * canvas.height;
              const bx = b.x * canvas.width;
              const by = b.y * canvas.height;

              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }

            // Calcular y dibujar ángulo en la rodilla
            const pa = lm[ids[0]]; // cadera
            const pb = lm[ids[1]]; // rodilla
            const pc = lm[ids[2]]; // tobillo

            const x = pb.x * canvas.width;
            const y = pb.y * canvas.height;

            const angle = Math.round(calculateAngle(pa, pb, pc));
            if (recording) {
              const now = performance.now();
              if (startTimeRef.current === null) {
                startTimeRef.current = now;
              }
              const elapsed = (now - startTimeRef.current) / 1000; // tiempo en segundos
              setAngleData((prev) => [...prev, { time: elapsed, angle }]);
            }
            ctx.fillStyle = "yellow";
            ctx.fillText(`${angle}º`, x + 5, y - 5);
          }
        });
      }
    });

    let camera: Camera | null = null;
    let rafId: number;

    const video = videoRef.current;
    if (!video) return;

    if (usingUploadedVideo) {
      // Modo video cargado
      const onFrame = async () => {
        if (
          video.readyState >= 2 &&
          !video.paused &&
          !video.ended &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          try {
            await pose.send({ image: video });
          } catch (err) {
            console.error("Error al enviar frame al modelo:", err);
          }
        }
        rafId = requestAnimationFrame(onFrame);
      };

      // 🔄 Reiniciamos srcObject en modo video cargado
      video.srcObject = null;

      video.onloadeddata = () => {
        video.play();
        requestAnimationFrame(onFrame);
      };
    } else {
      // Modo cámara en vivo
      camera = new Camera(video, {
        onFrame: async () => {
          await pose.send({ image: video });
        },
        width: 640,
        height: 480,
        facingMode,
      });

      // 🔄 Aseguramos que src esté vacío antes de usar srcObject
      video.src = "";
      camera.start();
    }

    return () => {
      pose.close();
      camera?.stop();
      cancelAnimationFrame(rafId);
    };
  }, [modo, costado, facingMode, usingUploadedVideo, recording]);

  const handleCapture = () => {
    if (!canvasRef.current) return;

    const imageURI = canvasRef.current.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imageURI;
    link.download = `captura-${new Date().toISOString()}.png`;
    link.click();
  };

  const startRecording = () => {
    if (!canvasRef.current) return;

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const webmBlob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });

      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grabacion-${new Date().toISOString()}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      recordedChunksRef.current = [];
    };

    setAngleData([]); // Limpia datos anteriores
    startTimeRef.current = null;

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoURL(url); // guardalo en el estado
      setUsingUploadedVideo(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div>
          <div className="w-full max-w-2xl flex justify-start">
            <Link
              to="/election"
              className="text-sm bg-white text-blue-600 hover:text-blue-800 border border-blue-500 px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              ← Atrás
            </Link>
          </div>
          <h2 className="text-2xl font-semibold text-center text-blue-700 mb-6">
            Biomecánica FootX
          </h2>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded"
            onClick={() =>
              setFacingMode((prev) =>
                prev === "user" ? "environment" : "user"
              )
            }
          >
            📷 Cambiar
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded"
            onClick={handleCapture}
          >
            📸 Capturar
          </button>
          {!recording ? (
            <button
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
              onClick={startRecording}
            >
              Grabar <BiVideoRecording size={22} />
            </button>
          ) : (
            <button
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
              onClick={stopRecording}
            >
              Detener <FaRegStopCircle size={22} />
            </button>
          )}
          <label className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded cursor-pointer">
            🎥 Subir Video
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>
          <button
            className="bg-gray-300 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = "";
                videoRef.current.srcObject = null;
              }
              setUsingUploadedVideo(false);
              setVideoURL(null);
            }}
          >
            Usar cámara en vivo
          </button>
        </div>

        {/* Selección de lado y modo */}
        {modo !== "postura" && (
          <div className="flex justify-center gap-4 mb-4">
            {(["izq", "der"] as const).map((l) => (
              <button
                key={l}
                className={`px-4 py-1 rounded ${
                  costado === l ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
                onClick={() => setCostado(l)}
              >
                {l === "izq" ? "Izquierdo" : "Derecho"}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 overflow-x-auto sm:overflow-visible">
          <div className="flex sm:justify-center gap-3 px-2 flex-nowrap">
            {(
              [
                "bicicleta",
                "caminar",
                "postura",
                "inferior",
                "frontal",
                "sagital",
              ] as const
            ).map((m) => (
              <button
                key={m}
                className={`px-4 py-1 rounded-full capitalize whitespace-nowrap ${
                  modo === m ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
                onClick={() => setModo(m)}
              >
                {m === "bicicleta"
                  ? "🚴 Bici"
                  : m === "caminar"
                  ? "🏃 Cinta"
                  : m === "postura"
                  ? "🚶 Postura"
                  : m === "inferior"
                  ? "🦵🏼 Inferior"
                  : m === "frontal"
                  ? "🧍🏻‍♂️ Frontal"
                  : "🦶🏼 Sagital"}
              </button>
            ))}
          </div>
        </div>

        {/* Video + Canvas */}
        <div className="w-full max-w-[500px] mx-auto relative overflow-hidden rounded-lg shadow-md bg-black mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto object-contain"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
          />
        </div>

        {modo === "inferior" && (
          <div className="w-full overflow-x-auto bg-white rounded-lg shadow px-4 py-2">
            <h3 className="text-center text-gray-700 font-medium mb-2">
              Ángulo en el tiempo (en segundos)
            </h3>
            <LineChart data={angleData} width={700} height={300}>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Tiempo (s)",
                  position: "insideBottomRight",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Ángulo (°)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="angle"
                stroke="#3b82f6"
                dot={false}
              />
            </LineChart>
          </div>
        )}
      </div>
    </div>
  );
};

export { MediaPipe };
