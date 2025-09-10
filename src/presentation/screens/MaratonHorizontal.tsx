import { useEffect, useRef, useState } from "react";

import { Pose, type Landmark } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

import {
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Tooltip,
  YAxis,
  Area,
} from "recharts";
import { ModalConfig } from "../../components/ModalConfig";
import { SideBar } from "../../components/SideBar";
import type { Tab } from "../../types/types";

const MaratonHorizontal = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [side, setSide] = useState<"left" | "right" | "both">("both"); // 👈 nuevo estado

  // Estado para guardar series
  const [caderaIzq, setCaderaIzq] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [caderaDer, setCaderaDer] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [toraxDer, setToraxDer] = useState<{ time: number; angle: number }[]>(
    []
  );
  const [toraxIzq, setToraxIzq] = useState<{ time: number; angle: number }[]>(
    []
  );

  const [selected, setSelected] = useState<Tab>("body");

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [config, setConfig] = useState({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    open: false,
    sizeVideo: 200,
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

  const handlePlay = () => {
    setCaderaIzq([]);
    setCaderaDer([]);
    setToraxIzq([]);
    setToraxDer([]);
    setStartTime(Date.now());
    setIsRunning(true);
    iniciar();
    // setTimeout(() => {
    //   setIsRunning(false);
    //   handleStop();
    // }, 6000);
  };

  const handleStop = () => {
    setIsRunning(false);
    detener();
  };

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

    return -angleDeg;
  };

  const lastAnglesRef = useRef<{ der: number; izq: number } | null>(null);
  const lastInclinacion = useRef<{ der: number; izq: number } | null>(null);

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

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.font = "12px Arial";
        ctx.fillStyle = "white";

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
          ctx.fillStyle = "#39ff14";
          ctx.fillText(`${angle}º`, bx + 5, by - 5);

          // 🔴 Dibujar el arco solo para cadera y rodilla
          if (
            (side === "left" &&
              ([11, 23, 25].toString() === [a, b, c].toString() ||
                [23, 25, 27].toString() === [a, b, c].toString())) ||
            (side === "right" &&
              ([12, 24, 26].toString() === [a, b, c].toString() ||
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
        if (side === "both") {
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

          const inclinacionDeToraXDer = calculateTorsoTilt(
            hombroIzq,
            hombroDer,
            canvas.width,
            canvas.height
          );

          const pelvisAngleIzq = pelvisAngleDer * -1;
          const toraxAngleIzq = inclinacionDeToraXDer * -1;

          lastInclinacion.current = {
            der: inclinacionDeToraXDer,
            izq: toraxAngleIzq,
          };
          lastAnglesRef.current = { der: pelvisAngleDer, izq: pelvisAngleIzq };

          if (isRunning) {
            const currentTime = Date.now();
            const timeSec = startTime
              ? Math.round((currentTime - startTime) / 1000)
              : 0;

            setToraxDer((prev) => [
              ...prev,
              { time: timeSec, angle: inclinacionDeToraXDer },
            ]);
            setToraxIzq((prev) => [
              ...prev,
              { time: timeSec, angle: toraxAngleIzq },
            ]);
            setCaderaIzq((prev) => [
              ...prev,
              { time: timeSec, angle: pelvisAngleIzq },
            ]);
            setCaderaDer((prev) => [
              ...prev,
              { time: timeSec, angle: pelvisAngleDer },
            ]);
          }

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

          ctx.fillStyle = "#ecfd18";
          ctx.fillText(
            `Torax Der: ${inclinacionDeToraXDer.toFixed(1)}º`,
            lxTorax + 30,
            lyTorax - 10
          );
          ctx.fillText(
            `Torax Iqz: ${toraxAngleIzq.toFixed(1)}º`,
            lxTorax - 70,
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
  }, [isRunning, side, config.open]);

  const restart = () => {
    setCaderaIzq([]);
    setCaderaDer([]);
    setToraxIzq([]);
    setToraxDer([]);
    setSegundos(0);
  };

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
      case "reset":
        restart();
        return;

      default:
        setConfig((prev) => ({ ...prev, open: false }));
        return;
    }
  }, [selected, side]);

  return (
    <div className="w-screen h-screen flex bg-terciary">
      {config.open && (
        <ModalConfig handleChange={handleChange} config={config} />
      )}
      {/* Sidebar fijo a la izquierda */}
      <SideBar
        selected={selected}
        setSelected={setSelected}
        segundos={segundos}
      />
      {/* Contenido principal en 3 columnas */}
      <div className="grid grid-cols-3 w-full gap-4">
        {/* Columna 1: Charts izquierdos */}
        <div className="flex flex-col gap-4 py-2">
          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Cadera Izquierda</div>
                <div className="text-xs text-gray-500">
                  Con respecto a cadera derecha
                </div>
              </div>
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
                    strokeOpacity={0.1} // opacidad baja
                    horizontal={true} // solo horizontales
                    vertical={false} // sin líneas verticales
                  />

                  <YAxis
                    tickCount={
                      Math.floor(
                        Math.max(...caderaIzq.map((d) => Number(d.angle))) / 5
                      ) + 1
                    }
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toFixed(1)} // muestra 0.0, 0.5, etc.
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
          </div>

          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Torax Izquierdo</div>
                <div className="text-xs text-gray-500">
                  Con respecto a torax derecho
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={toraxIzq}>
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
                        Math.max(...toraxIzq.map((d) => Number(d.angle))) / 5
                      ) + 1
                    }
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toFixed(1)} // muestra 0.0, 0.5, etc.
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
          </div>
        </div>
        {/* Normal */}

        {/* Columna 2: Video + Canvas */}
        {/* <div className="flex justify-center items-center relative">
          <div className="h-screen w-full relative overflow-hidden bg-black z-5 flex justify-center items-center ">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-screen w-auto"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-1/2 -translate-x-1/2 h-screen w-auto z-10 pointer-events-none"
            />
          </div>
        </div> */}
        {/* Rotado */}

        {/* Columna 2: Video + Canvas */}
        <div className="flex justify-center items-center relative">
          <div className="h-screen w-full relative overflow-hidden bg-black flex justify-center items-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-screen w-auto object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-1/2 -translate-x-1/2 h-screen w-auto pointer-events-none object-cover"
            />
          </div>
        </div>

        {/* Columna 3: Charts derechos */}
        <div className="flex flex-col gap-4 py-2 pr-2">
          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Cadera derecha</div>
                <div className="text-xs text-gray-500">
                  Con respecto a cadera izquierda
                </div>
              </div>
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

                  <CartesianGrid
                    stroke="white" // color de las líneas
                    strokeOpacity={0.2} // opacidad baja
                    horizontal={true} // solo horizontales
                    vertical={false} // sin líneas verticales
                  />

                  <YAxis
                    tickCount={
                      Math.floor(
                        Math.max(...caderaDer.map((d) => Number(d.angle))) / 5
                      ) + 1
                    }
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toFixed(1)} // muestra 0.0, 0.5, etc.
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
          </div>

          <div className="bg-secundary text-white rounded-2xl p-4 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-gray-400">Torax derecho</div>
                <div className="text-xs text-gray-500">
                  Con respecto a torax izquierdo
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="w-full h-3/4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={toraxDer}>
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
                        Math.max(...toraxDer.map((d) => Number(d.angle))) / 5
                      ) + 1
                    }
                    interval={0} // mostrar todos los ticks calculados
                    tickFormatter={(value) => value.toFixed(1)} // muestra 0.0, 0.5, etc.
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
          </div>
        </div>
      </div>
    </div>
  );
};

export { MaratonHorizontal };
