import { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { BiVideoRecording } from "react-icons/bi";
import { FaRegStopCircle } from "react-icons/fa";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModalConfig } from "../../components/ModalConfig";
// import { Link } from "react-router-dom";

const Maraton = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // const [facingMode, setFacingMode] = useState<"user" | "environment">(
  //   "environment"
  // );

  const [recording, setRecording] = useState(false);
  const [side, setSide] = useState<"left" | "right" | "both">("both"); // 👈 nuevo estado
  // Estado para guardar series
  const [hipData, setHipData] = useState<{ time: number; angle: number }[]>([]);
  const [kneeData, setKneeData] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [config, setConfig] = useState({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.6,
    open: false,
    sizeVideo: 500,
    record: false,
  });

  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // 🟢 Simulación de llegada de ángulos cada 500ms
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeSec = startTime
        ? Math.round((currentTime - startTime) / 1000)
        : 0;

      // Ejemplo random de ángulos
      const hipAngle = 90 + Math.round(Math.random() * 20);
      const kneeAngle = 100 + Math.round(Math.random() * 20);

      setHipData((prev) => [...prev, { time: timeSec, angle: hipAngle }]);
      setKneeData((prev) => [...prev, { time: timeSec, angle: kneeAngle }]);
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handlePlay = () => {
    setHipData([]);
    setKneeData([]);
    setStartTime(Date.now());
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);

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
    return Math.abs(180 - angleDeg);
  };

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

    // let loadingDone = false; // ✅ para no llamar setLoading(false) varias veces
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
        let angulos: [number, number, number][] = [];

        if (side === "left") {
          ids = [11, 13, 15, 23, 25, 27];
          lines = [
            [11, 13], // hombro izq - codo izq
            [13, 15], // codo izq - muñeca izq
            [11, 23], // hombro izq - cadera izq
            [23, 25], // cadera izq - rodilla izq
            [25, 27], // rodilla izq - tobillo izq
          ];
          angulos = [
            [23, 11, 13], // hombro izq
            [11, 13, 15], // codo izq
            [11, 23, 25], // cadera izq
            [23, 25, 27], // rodilla izq
          ];
        } else if (side === "right") {
          ids = [12, 14, 16, 24, 26, 28];
          lines = [
            [12, 14], // hombro der - codo der
            [14, 16], // codo der - muñeca der
            [12, 24], // hombro der - cadera der
            [24, 26], // cadera der - rodilla der
            [26, 28], // rodilla der - tobillo der
          ];
          angulos = [
            [24, 12, 14], // hombro der
            [12, 14, 16], // codo der
            [12, 24, 26], // cadera der
            [24, 26, 28], // rodilla der
          ];
        } else if (side === "both") {
          ids = [11, 13, 15, 23, 25, 27, 12, 14, 16, 24, 26, 28];
          lines = [
            [11, 13],
            [13, 15],
            [11, 23],
            [23, 25],
            [25, 27], // izq
            [12, 14],
            [14, 16],
            [12, 24],
            [24, 26],
            [26, 28], // der
            [11, 12], // unión hombros
            [23, 24], // unión caderas
          ];
          angulos = [
            [23, 11, 13], // hombro izq
            [11, 13, 15], // codo izq
            [11, 23, 25], // cadera izq
            [23, 25, 27], // rodilla izq
            [24, 12, 14], // hombro der
            [12, 14, 16], // codo der
            [12, 24, 26], // cadera der
            [24, 26, 28], // rodilla der
          ];
        }

        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 3;
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
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

        angulos.forEach(([a, b, c]) => {
          const pa = lm[a];
          const pb = lm[b];
          const pc = lm[c];

          const ax = pa.x * canvas.width;
          const ay = pa.y * canvas.height;
          const bx = pb.x * canvas.width;
          const by = pb.y * canvas.height;
          const cx = pc.x * canvas.width;
          const cy = pc.y * canvas.height;

          const angle = Math.round(calculateAngle(pa, pb, pc));

          // Texto
          ctx.fillStyle = "yellow";
          ctx.fillText(`${angle}º`, bx + 5, by - 5);

          // 🔴 Dibujar el arco solo para cadera y rodilla
          if (
            (side === "left" &&
              ([11, 23, 25].toString() === [a, b, c].toString() ||
                [23, 25, 27].toString() === [a, b, c].toString())) ||
            (side === "right" &&
              ([12, 24, 26].toString() === [a, b, c].toString() ||
                [24, 26, 28].toString() === [a, b, c].toString())) ||
            (side === "both" &&
              ([11, 23, 25].toString() === [a, b, c].toString() ||
                [23, 25, 27].toString() === [a, b, c].toString() ||
                [12, 24, 26].toString() === [a, b, c].toString() ||
                [24, 26, 28].toString() === [a, b, c].toString()))
          ) {
            // vectores
            const v1 = { x: ax - bx, y: ay - by };
            const v2 = { x: cx - bx, y: cy - by };

            // ángulos absolutos
            const ang1 = Math.atan2(v1.y, v1.x);
            const ang2 = Math.atan2(v2.y, v2.x);

            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.arc(bx, by, 50, ang1, ang2, false); // radio fijo (40px), podés ajustarlo
            ctx.closePath();
            ctx.fillStyle = "rgba(255,0,0,0.4)"; // rojo semi-transparente
            ctx.fill();
          }
        });
      }
    });

    let camera: Camera | null = null;
    const video = videoRef.current;
    if (!video) return;

    camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: 640,
      height: 480,
      // facingMode,
    });

    video.src = "";
    camera.start();
    return () => {
      pose.close();
      camera?.stop();
    };
  }, [
    recording,
    side,
    config.open,
    // facingMode,
  ]);

  // --- resto del código (captura, grabar, etc.) igual ---
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
    const stream = canvasRef.current.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recordedChunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
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

  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-center items-center gap-4 mb-4 ">
          <img
            className="z-30"
            src="https://www.ortopediapelaez.com/v2018/wp-content/uploads/2025/02/logo-cop-1.png"
            width={100}
          />
        </div>

        {/* Controles principales */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          {/* <button
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded z-30"
            onClick={() =>
              setFacingMode((prev) =>
                prev === "user" ? "environment" : "user"
              )
            }
          >
            📷 Cambiar
          </button> */}
          <button
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded z-30"
            onClick={() => setConfig((prev) => ({ ...prev, open: true }))}
          >
            ⚙️
          </button>

          {config.record && (
            <>
              <button
                className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded z-30"
                onClick={handleCapture}
              >
                📸 Capturar
              </button>

              {!recording ? (
                <button
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 z-30"
                  onClick={startRecording}
                >
                  Grabar <BiVideoRecording size={22} />
                </button>
              ) : (
                <button
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2 z-30"
                  onClick={stopRecording}
                >
                  Detener <FaRegStopCircle size={22} />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              if (isRunning) {
                handleStop();
              } else {
                handlePlay();
              }
            }}
            className={`px-4 py-2 ${
              isRunning ? "bg-red-500" : "bg-green-600"
            } text-white rounded z-30`}
          >
            {isRunning ? "⏹ Stop " : "▶️ Play"}
          </button>
        </div>

        {/* Video + Canvas */}
        <div className="w-full max-w-[400px] mx-auto relative overflow-hidden rounded-lg shadow-md bg-black mb-6 rotate-90">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto object-cover object-center"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
          />
        </div>

        {/* 🔀 Switch de lados */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            className={`px-2 py-2 rounded ${
              side === "left" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setSide("left")}
          >
            ✋🏼
          </button>
          <button
            className={`px-2 py-2 rounded ${
              side === "right" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setSide("right")}
          >
            🤚🏼
          </button>
          <button
            className={`px-2 py-2 rounded ${
              side === "both" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setSide("both")}
          >
            🧍🏻‍♂️
          </button>
        </div>
        <div className="w-1/3 h-full bg-white flex justify-center items-center">
          <LineChart data={hipData} width={250} height={300}>
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
                value: "Ángulo Cadera (°)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="angle"
              stroke="#ef4444"
              dot={false}
            />{" "}
            {/* rojo */}
          </LineChart>
        </div>
        <div className="w-1/3 h-full bg-white flex justify-center items-center">
          <LineChart data={kneeData} width={250} height={300}>
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
                value: "Ángulo Rodilla (°)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="angle"
              stroke="#22c55e"
              dot={false}
            />{" "}
            {/* verde */}
          </LineChart>
        </div>
      </div>

      {/* Modal */}
      {config.open && (
        <ModalConfig handleChange={handleChange} config={config} />
      )}
    </div>
  );
};

export { Maraton };
