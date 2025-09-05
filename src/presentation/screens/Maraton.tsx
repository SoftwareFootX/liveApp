import { useEffect, useRef, useState } from "react";
import { Pose, type Landmark } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
// import { BiVideoRecording } from "react-icons/bi";
// import { FaRegStopCircle } from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  // CartesianGrid,
  // Legend,
  // Line,
  // LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  // XAxis,
  // YAxis,
} from "recharts";
import { ModalConfig } from "../../components/ModalConfig";
import { SideBar } from "../../components/SideBar";
import type { Tab } from "../../types/types";
// import { Link } from "react-router-dom";

const Maraton = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // const [facingMode, setFacingMode] = useState<"user" | "environment">(
  //   "environment"
  // );

  // const [recording, setRecording] = useState(false);
  const [side, setSide] = useState<"left" | "right" | "both">("both"); // 👈 nuevo estado

  // Estado para guardar series
  const [caderaIzq, setCaderaIzq] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [caderaDer, setCaderaDer] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [torax, setTorax] = useState<{ time: number; angle: number }[]>([]);
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

  const [segundos, setSegundos] = useState(0);
  const intervalRef = useRef<number | null>(null); // 👈 cambiar NodeJS.Timeout por number

  const iniciar = () => {
    if (intervalRef.current !== null) return; // evitar múltiples intervalos
    intervalRef.current = window.setInterval(() => {
      setSegundos((prev) => prev + 1);
    }, 1000);
  };

  const detener = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // const reiniciar = () => {
  //   detener();
  //   setSegundos(0);
  // };

  const handlePlay = () => {
    setCaderaIzq([]);
    setCaderaDer([]);
    setTorax([]);
    setStartTime(Date.now());
    setIsRunning(true);
    iniciar();
    setTimeout(() => {
      setIsRunning(false);
      handleStop();
    }, 8000);
  };

  const handleStop = () => {
    setIsRunning(false);
    detener();
  };

  // const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // const recordedChunksRef = useRef<Blob[]>([]);
  // const startTimeRef = useRef<number | null>(null);

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

  const calculatePelvis = (
    leftHip: Landmark,
    rightHip: Landmark,
    canvasWidth: number,
    canvasHeight: number
  ): number => {
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
  };

  const calculateTorsoTilt = (
    leftShoulder: Landmark,
    rightShoulder: Landmark,
    canvasWidth: number,
    canvasHeight: number,
    facingFront: boolean = true
  ): number => {
    const lx = leftShoulder.x * canvasWidth;
    const ly = leftShoulder.y * canvasHeight;
    const rx = rightShoulder.x * canvasWidth;
    const ry = rightShoulder.y * canvasHeight;

    const dx = rx - lx;
    const dy = ry - ly;

    // Ángulo relativo a la horizontal (inclinación lateral)
    let angleDeg = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);

    // Ajuste según vista (frente / espalda)
    angleDeg = facingFront ? angleDeg : -angleDeg;

    return angleDeg;
  };

  const lastAnglesRef = useRef<{ der: number; izq: number } | null>(null);
  const lastInclinacion = useRef<{ torax: number } | null>(null);

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
        // 4️⃣ Finalmente, calcular y dibujar pelvis (solo una vez)
        if (side === "both" && isRunning) {
          const leftHip = lm[23];
          const rightHip = lm[24];

          const hombroIzq = lm[11];
          const hombroDer = lm[12];

          const pelvisAngleDer = calculatePelvis(
            leftHip,
            rightHip,
            canvas.width,
            canvas.height
          );

          const inclinacionDeToraX = calculateTorsoTilt(
            hombroIzq,
            hombroDer,
            canvas.width,
            canvas.height
          );

          lastInclinacion.current = { torax: inclinacionDeToraX };
          const pelvisAngleIzq = pelvisAngleDer * -1;
          lastAnglesRef.current = { der: pelvisAngleDer, izq: pelvisAngleIzq };

          const currentTime = Date.now();
          const timeSec = startTime
            ? Math.round((currentTime - startTime) / 1000)
            : 0;

          setTorax((prev) => [
            ...prev,
            { time: timeSec, angle: inclinacionDeToraX },
          ]);
          setCaderaIzq((prev) => [
            ...prev,
            { time: timeSec, angle: pelvisAngleDer },
          ]);
          setCaderaDer((prev) => [
            ...prev,
            { time: timeSec, angle: pelvisAngleIzq },
          ]);

          // --- Dibujar sobre canvas ---
          // Tórax: punto medio entre hombros
          const lxTorax = ((hombroIzq.x + hombroDer.x) / 2) * canvas.width;
          const lyTorax = ((hombroIzq.y + hombroDer.y) / 2) * canvas.height;

          // Cadera izquierda
          const lxCaderaIzq = leftHip.x * canvas.width;
          const lyCaderaIzq = leftHip.y * canvas.height;

          // Cadera derecha
          const lxCaderaDer = rightHip.x * canvas.width;
          const lyCaderaDer = rightHip.y * canvas.height;

          ctx.fillStyle = "cyan";
          ctx.fillText(
            `Torax: ${inclinacionDeToraX.toFixed(1)}º`,
            lxTorax + 10,
            lyTorax - 10
          );
          ctx.fillText(
            `Pelvis Der: ${pelvisAngleDer.toFixed(1)}º`,
            lxCaderaDer + 10,
            lyCaderaDer - 10
          );
          ctx.fillText(
            `Pelvis Izq: ${pelvisAngleIzq.toFixed(1)}º`,
            lxCaderaIzq + 10,
            lyCaderaIzq - 10
          );
        }
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
    isRunning,
    side,
    config.open,
    // facingMode,
  ]);

  // --- resto del código (captura, grabar, etc.) igual ---
  // const handleCapture = () => {
  //   if (!canvasRef.current) return;
  //   const imageURI = canvasRef.current.toDataURL("image/png");
  //   const link = document.createElement("a");
  //   link.href = imageURI;
  //   link.download = `captura-${new Date().toISOString()}.png`;
  //   link.click();
  // };

  // const startRecording = () => {
  //   if (!canvasRef.current) return;
  //   const stream = canvasRef.current.captureStream(30);
  //   const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  //   recordedChunksRef.current = [];
  //   mediaRecorder.ondataavailable = (e) => {
  //     if (e.data.size > 0) recordedChunksRef.current.push(e.data);
  //   };
  //   mediaRecorder.onstop = () => {
  //     const webmBlob = new Blob(recordedChunksRef.current, {
  //       type: "video/webm",
  //     });
  //     const url = URL.createObjectURL(webmBlob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `grabacion-${new Date().toISOString()}.webm`;
  //     a.click();
  //     URL.revokeObjectURL(url);
  //     recordedChunksRef.current = [];
  //   };
  //   startTimeRef.current = null;
  //   mediaRecorder.start();
  //   mediaRecorderRef.current = mediaRecorder;
  //   setRecording(true);
  // };

  // const stopRecording = () => {
  //   if (mediaRecorderRef.current && recording) {
  //     mediaRecorderRef.current.stop();
  //     setRecording(false);
  //   }
  // };

  const [selected, setSelected] = useState<Tab>("home");

  useEffect(() => {
    switch (selected) {
      case "config":
        setConfig((prev) => ({ ...prev, open: true }));
        return;
      case "play":
        handlePlay();
        return;
      case "stop":
        handleStop();
        return;
      case "left":
        setSide("left");
        return;
      case "right":
        setSide("right");
        return;
      case "body":
        setSide("both");
        return;

      default:
        setConfig((prev) => ({ ...prev, open: false }));
        return;
    }
  }, [selected, side]);

  const caderaIzq2 = [
    { time: 1, angle: 25 },
    { time: 2, angle: 28 },
    { time: 3, angle: 32 },
    { time: 4, angle: 30 },
    { time: 5, angle: 35 },
    { time: 6, angle: 27 },
    { time: 7, angle: 31 },
    { time: 8, angle: 29 },
    { time: 9, angle: 33 },
    { time: 10, angle: 36 },
    { time: 11, angle: 34 },
    { time: 12, angle: 30 },
    { time: 13, angle: 32 },
    { time: 14, angle: 28 },
    { time: 15, angle: 31 },
    { time: 16, angle: 35 },
  ];

  return (
    <div className="w-screen h-screen flex bg-terciary">
      {config.open && (
        <ModalConfig handleChange={handleChange} config={config} />
      )}
      {/* Sidebar fijo a la izquierda */}
      <SideBar selected={selected} setSelected={setSelected} />
      {/* Contenido principal en 3 columnas */}
      <div className="grid grid-cols-3 w-full gap-4 p-4">
        {/* Columna 1: Charts izquierdos */}
        <div className="flex flex-col gap-4">
          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Cadera Izquierda</div>
                <div className="text-xs text-gray-500">
                  Con respecto a cadera derecha
                </div>
              </div>
              <div className="text-2xl font-bold">{segundos} s</div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={caderaIzq}>
                  <defs>
                    <linearGradient id="colorHip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7f00" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff7f00" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="white" // color de las líneas
                    strokeOpacity={0.2} // opacidad baja
                    horizontal={true} // solo horizontales
                    vertical={false} // sin líneas verticales
                  />

                  <YAxis
                    tickCount={
                      Math.floor(
                        Math.max(...caderaIzq2.map((d) => d.angle)) / 5
                      ) + 1
                    } // número de ticks
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toString()} // formato de tick
                    domain={[0, "dataMax"]} // inicio en 0 hasta el máximo de tus datos
                  />

                  <Area
                    type="monotone"
                    dataKey="angle"
                    stroke="#ff7f00"
                    strokeWidth={2}
                    fill="url(#colorHip)"
                  />

                  <Tooltip
                    contentStyle={{ backgroundColor: "#000", border: "none" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer con botones o filtros (tipo 1d, 1w, etc.) */}
            {/* <div className="flex gap-2 mt-2">
              {["1d", "1w", "1m", "1y", "ALL"].map((item) => (
                <button
                  key={item}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                >
                  {item}
                </button>
              ))}
            </div> */}
          </div>

          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Cadera derecha</div>
                <div className="text-xs text-gray-500">
                  Con respecto a cadera izquierda
                </div>
              </div>
              <div className="text-2xl font-bold">{segundos} s</div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={caderaDer}>
                  <defs>
                    <linearGradient id="colorHip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7f00" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff7f00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="angle"
                    stroke="#ff7f00"
                    strokeWidth={2}
                    fill="url(#colorHip)"
                  />
                  {/* Opcional: tooltip */}
                  <Tooltip
                    contentStyle={{ backgroundColor: "#000", border: "none" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer con botones o filtros (tipo 1d, 1w, etc.) */}
            {/* <div className="flex gap-2 mt-2">
              {["1d", "1w", "1m", "1y", "ALL"].map((item) => (
                <button
                  key={item}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                >
                  {item}
                </button>
              ))}
            </div> */}
          </div>
        </div>

        {/* Columna 2: Video + Canvas */}
        <div className="flex justify-center items-center">
          <div className="relative max-w-[400px]overflow-hidden shadow-md bg-black">
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
            />
          </div>
        </div>

        {/* Columna 3: Charts derechos */}
        <div className="flex flex-col gap-4">
          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Torax</div>
                <div className="text-xs text-gray-500">
                  Con respecto a punto medio
                </div>
              </div>
              <div className="text-2xl font-bold">{segundos} s</div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={torax}>
                  <defs>
                    <linearGradient id="colorHip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7f00" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff7f00" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="white" // color de las líneas
                    strokeOpacity={0.2} // opacidad baja
                    horizontal={true} // solo horizontales
                    vertical={false} // sin líneas verticales
                  />

                  <YAxis
                    tickCount={
                      Math.floor(Math.max(...torax.map((d) => d.angle)) / 5) + 1
                    } // número de ticks
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toString()} // formato de tick
                    domain={[0, "dataMax"]} // inicio en 0 hasta el máximo de tus datos
                  />

                  <Area
                    type="monotone"
                    dataKey="angle"
                    stroke="#ff7f00"
                    strokeWidth={2}
                    fill="url(#colorHip)"
                  />

                  <Tooltip
                    contentStyle={{ backgroundColor: "#000", border: "none" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer con botones o filtros (tipo 1d, 1w, etc.) */}
            {/* <div className="flex gap-2 mt-2">
              {["1d", "1w", "1m", "1y", "ALL"].map((item) => (
                <button
                  key={item}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                >
                  {item}
                </button>
              ))}
            </div> */}
          </div>

          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Cadera Izquierda</div>
                <div className="text-xs text-gray-500">
                  Con respecto a cadera derecha
                </div>
              </div>
              <div className="text-2xl font-bold">{segundos} s</div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={caderaIzq}>
                  <defs>
                    <linearGradient id="colorHip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7f00" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff7f00" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="white" // color de las líneas
                    strokeOpacity={0.2} // opacidad baja
                    horizontal={true} // solo horizontales
                    vertical={false} // sin líneas verticales
                  />

                  <YAxis
                    tickCount={
                      Math.floor(
                        Math.max(...caderaIzq2.map((d) => d.angle)) / 5
                      ) + 1
                    } // número de ticks
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toString()} // formato de tick
                    domain={[0, "dataMax"]} // inicio en 0 hasta el máximo de tus datos
                  />

                  <Area
                    type="monotone"
                    dataKey="angle"
                    stroke="#ff7f00"
                    strokeWidth={2}
                    fill="url(#colorHip)"
                  />

                  <Tooltip
                    contentStyle={{ backgroundColor: "#000", border: "none" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer con botones o filtros (tipo 1d, 1w, etc.) */}
            {/* <div className="flex gap-2 mt-2">
              {["1d", "1w", "1m", "1y", "ALL"].map((item) => (
                <button
                  key={item}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                >
                  {item}
                </button>
              ))}
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Maraton };
