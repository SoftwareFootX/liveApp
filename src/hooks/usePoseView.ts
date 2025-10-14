import { Camera } from "@mediapipe/camera_utils";
import { Pose } from "@mediapipe/pose";
import { useRef, useState } from "react";

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
  angles: { name: string; value: number; points: [number, number, number] }[];
}

export type Recording = FrameData[];

const usePoseView = () => {
  // valores recomendados
  const scale = 1; // 90%, cambiar por 0.8, 0.7 etc.
  const CAMERA_WIDTH = Math.round(640 * scale);
  const CAMERA_HEIGHT = Math.round(480 * scale);
  const SAVE_WIDTH = 320; // tamaño al que guardás (reduce memoria)
  const SAVE_HEIGHT = 240;
  const JPEG_QUALITY = 1.0; // 0.0 - 1.0, menos => menos peso

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const recordingStartRef = useRef<number | null>(null);
  const frameIdRef = useRef(0);

  const [recording, setRecording] = useState(false);

  const [lado, setLado] = useState<"izq" | "der">("izq");
  const [frames, setFrames] = useState<Recording>([]);

  const [segundos, setSegundos] = useState(2);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const [realtimeAngles, setRealtimeAngles] = useState<
    { name: string; value: number; points: [number, number, number] }[]
  >([]);

  // ---------- Funcion para calcular angulos ----------
  const getAngle = (
    A: { x: number; y: number },
    B: { x: number; y: number },
    C: { x: number; y: number }
  ) => {
    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
    const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);
    const angleRad = Math.acos(dot / (magAB * magCB));
    return (angleRad * 180) / Math.PI;
  };

  const getAngleLandmarks = () => {
    return lado === "der"
      ? [
          { name: "codo", points: [12, 14, 16] }, // hombro-codo-muñeca
          { name: "cadera", points: [12, 24, 26] }, // hombro-cadera-rodilla
          { name: "rodilla", points: [24, 26, 28] }, // cadera-rodilla-tobillo
          { name: "tobillo", points: [26, 28, 32] }, // rodilla-tobillo-pie
        ]
      : [
          { name: "codo", points: [11, 13, 15] },
          { name: "cadera", points: [11, 23, 25] },
          { name: "rodilla", points: [23, 25, 27] },
          { name: "tobillo", points: [25, 27, 31] },
        ];
  };

  const angleLandmarks = getAngleLandmarks();

  const mediaPipePose = () => {
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

        ids =
          lado === "der"
            ? [32, 28, 26, 24, 12, 14, 16]
            : [31, 27, 25, 23, 11, 13, 15];
        for (let i = 0; i < ids.length - 1; i++) {
          lines.push([ids[i], ids[i + 1]]);
        }

        // --- Dibujo de puntos y líneas ---
        ctx.fillStyle = "#60DE00";
        ctx.strokeStyle = "#DE0000";
        ctx.lineWidth = 3;

        lines.forEach(([a, b]) => {
          const pa = lm[a],
            pb = lm[b];
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

        // --- Dibujar ángulos como arcos tipo transportador ---
        angleLandmarks.forEach((a) => {
          const [i1, i2, i3] = a.points;
          const p1 = lm[i1];
          const p2 = lm[i2]; // vértice del ángulo
          const p3 = lm[i3];

          // Validar que los puntos existan
          if (!p1 || !p2 || !p3) return;

          // Calcular vectores relativos al vértice
          let angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
          let angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

          if (isNaN(angle1) || isNaN(angle2)) return;

          // Normalizar para que siempre sea sentido horario y menor a 2π
          if (angle2 < angle1) angle2 += 2 * Math.PI;

          const radius = Math.min(30, canvas.width * 0.05); // radio proporcional al canvas

          ctx.beginPath();
          ctx.moveTo(p2.x * canvas.width, p2.y * canvas.height); // vértice del ángulo
          ctx.arc(
            p2.x * canvas.width,
            p2.y * canvas.height,
            radius,
            angle1,
            angle2,
            false
          );
          ctx.closePath(); // cierra el camino de vuelta al vértice
          ctx.fillStyle = "rgba(255,0,0,0.3)"; // rojo semitransparente
          ctx.fill(); // rellena el sector
          ctx.strokeStyle = "red"; // opcional, contorno más visible
          ctx.lineWidth = 2;
          ctx.stroke();

          // Dibujar valor del ángulo
          const angle = getAngle(p1, p2, p3).toFixed(0);
          ctx.fillStyle = "#60DE00";
          ctx.font = "18px Arial";
          ctx.fillText(
            `${angle}°`,
            p2.x * canvas.width + radius + 5,
            p2.y * canvas.height - 5
          );
        });

        // Dentro de pose.onResults y después de calcular los landmarks
        const currentAngles = getAngleLandmarks().map((a) => {
          const [i1, i2, i3] = a.points;
          return {
            name: a.name,
            value: getAngle(lm[i1], lm[i2], lm[i3]), // ángulo en grados
            points: [i1, i2, i3] as [number, number, number],
          };
        });

        // Guardar en estado para mostrarlo en tiempo real
        setRealtimeAngles(currentAngles);

        ids.forEach((id) => {
          const p = lm[id];
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        });

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
            const angles = getAngleLandmarks()
              .map((a) => {
                const [i1, i2, i3] = a.points;
                const p1 = lm[i1];
                const p2 = lm[i2];
                const p3 = lm[i3];

                if (!p1 || !p2 || !p3) return null; // si falta un punto, ignoramos este ángulo

                return {
                  name: a.name,
                  value: getAngle(p1, p2, p3),
                  points: [i1, i2, i3] as [number, number, number],
                };
              })
              .filter(Boolean) as {
              name: string;
              value: number;
              points: [number, number, number];
            }[];

            setFrames((prev) => [
              ...prev,
              {
                id: frameIdRef.current++,
                image,
                points,
                lines: localLines,
                angles,
              },
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
  };

  return {
    mediaPipePose,
    videoRef,
    canvasRef,
    recordingStartRef,
    frameIdRef,
    recording,
    setRecording,
    lado,
    setLado,
    frames,
    setFrames,
    segundos,
    setSegundos,
    currentFrameIndex,
    setCurrentFrameIndex,
    realtimeAngles,
    setRealtimeAngles,
  };
};

export { usePoseView };
