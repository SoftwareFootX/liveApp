import { useEffect, useRef, useState } from "react";

import { IoCameraReverseOutline, IoCameraOutline } from "react-icons/io5";
import { Pose, type Landmark } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { AiTwotoneDelete } from "react-icons/ai";
import { PiExportDuotone } from "react-icons/pi";
import { GrPowerReset } from "react-icons/gr";
import { FaInstagram } from "react-icons/fa";
import { TbWorldWww } from "react-icons/tb";
import { Link } from "react-router-dom";

import { estabilometro, logo_stabilar_b } from "../../../public";

// ---------- Funciones auxiliares ----------
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
  return Math.abs(angleDeg);
};

// ---------- Componente ----------
const Stabilar = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const [frames, setFrames] = useState<
    {
      image: string;
      points: Record<number, Landmark>;
      lines: [number, number][];
    }[]
  >([]);
  // Guardar landmarks actuales para la captura
  const landmarksRef = useRef<Landmark[] | null>(null);

  // ---------- MediaPipe Pose ----------
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
        landmarksRef.current = lm; // Guardamos landmarks actuales

        const ids = [11, 12, 23, 24, 13, 14, 15, 16, 25, 26, 27, 28, 29, 30];

        const lines: [number, number][] = [
          [11, 12],
          [23, 24],
          [11, 23],
          [12, 24],
          [11, 13],
          [13, 15],
          [12, 14],
          [14, 16],
          [23, 25],
          [25, 27],
          [27, 29],
          [24, 26],
          [26, 28],
          [28, 30],
        ];

        // ---------------- DIBUJAR LÍNEAS ----------------
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        lines.forEach(([a, b]) => {
          const pa = lm[a];
          const pb = lm[b];
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        });

        // ---------------- DIBUJAR ÁNGULOS ----------------
        const angulosPostura: [number, number, number][] = [
          [23, 11, 13],
          [11, 13, 15],
          [24, 12, 14],
          [12, 14, 16],
          [12, 24, 26],
          [24, 26, 28],
          [11, 23, 25],
          [23, 25, 27],
        ];

        ctx.fillStyle = "red"; // Color de los ángulos
        ctx.font = "bold 22px Arial"; // tamaño, peso y tipo de letra

        angulosPostura.forEach(([a, b, c]) => {
          const pa = lm[a];
          const pb = lm[b];
          const pc = lm[c];
          const angle = Math.round(calculateAngle(pa, pb, pc));
          const bx = pb.x * canvas.width;
          const by = pb.y * canvas.height;
          ctx.fillText(`${angle}º`, bx + 5, by - 5);
        });

        // ---------------- DIBUJAR PUNTOS ----------------
        ctx.fillStyle = "#ca2151"; // Color de los puntos
        ids.forEach((id) => {
          const p = lm[id];
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });

    const CAMERA_WIDTH = 1280 * 0.7;
    const CAMERA_HEIGHT = 720 * 0.7;

    let camera: Camera | null = null;
    const video = videoRef.current;
    if (!video) return;
    camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: CAMERA_WIDTH,
      height: CAMERA_HEIGHT,
      facingMode,
    });

    video.src = "";
    camera.start();

    return () => {
      pose.close();
      camera?.stop();
    };
  }, [facingMode]);

  // ------------------ Drag de puntos ------------------
  const handleDrag = (e: MouseEvent, idx: number, frameIdx: number) => {
    const rect = (
      e.target as SVGCircleElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;

    // Coordenadas normalizadas 0-1 según el tamaño del SVG
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFrames((prev: any) => {
      const updated = [...prev];
      updated[frameIdx].points[idx] = {
        ...updated[frameIdx].points[idx],
        x,
        y,
      };
      return updated;
    });
  };

  const [imgSizes, setImgSizes] = useState<{ width: number; height: number }[]>(
    []
  );

  const handleExportFrame = (frameIdx: number) => {
    const frame = frames[frameIdx];
    if (!frame || !imgSizes[frameIdx]) return;

    const canvas = document.createElement("canvas");
    canvas.width = imgSizes[frameIdx].width;
    canvas.height = imgSizes[frameIdx].height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1️⃣ Dibujar la imagen base
    const img = new Image();
    img.src = frame.image;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2️⃣ Dibujar líneas
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      frame.lines.forEach(([a, b]) => {
        const pa = frame.points[a];
        const pb = frame.points[b];
        ctx.beginPath();
        ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
        ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
        ctx.stroke();
      });

      // 3️⃣ Dibujar puntos
      ctx.fillStyle = "#ca2151";
      Object.values(frame.points).forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4️⃣ Dibujar ángulos
      const angulosPostura: [number, number, number][] = [
        [23, 11, 13],
        [11, 13, 15],
        [24, 12, 14],
        [12, 14, 16],
        [12, 24, 26],
        [24, 26, 28],
        [11, 23, 25],
        [23, 25, 27],
      ];
      ctx.fillStyle = "red";
      ctx.font = "bold 22px Arial";
      angulosPostura.forEach(([a, b, c]) => {
        const pb = frame.points[b];
        const angle = Math.round(
          calculateAngle(frame.points[a], pb, frame.points[c])
        );
        ctx.fillText(
          `${angle}º`,
          pb.x * canvas.width + 5,
          pb.y * canvas.height - 5
        );
      });

      // 5️⃣ Descargar
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `captura_${frameIdx}.png`;
      link.click();
    };
  };

  const handleCapture = () => {
    if (!videoRef.current || !landmarksRef.current) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoRef.current.videoWidth;
    tempCanvas.height = videoRef.current.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(
      videoRef.current,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const imageURI = tempCanvas.toDataURL("image/png");

    const lm = landmarksRef.current;
    const ids = [11, 12, 23, 24, 13, 14, 15, 16, 25, 26, 27, 28, 29, 30];

    // Guardamos puntos como objeto con key = id
    const lmCopy: Record<number, Landmark> = ids.reduce((acc, id) => {
      const p = lm[id];
      if (p) acc[id] = { ...p };
      return acc;
    }, {} as Record<number, Landmark>);

    const lines: [number, number][] = [
      [11, 12],
      [23, 24],
      [11, 23],
      [12, 24],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [23, 25],
      [25, 27],
      [27, 29],
      [24, 26],
      [26, 28],
      [28, 30],
    ];

    setFrames((prev) => [...prev, { image: imageURI, points: lmCopy, lines }]);
  };

  const handleDeleteFrame = (frameIdx: number) => {
    setFrames((prev) => prev.filter((_, idx) => idx !== frameIdx));
    setImgSizes((prev) => prev.filter((_, idx) => idx !== frameIdx));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between items-center">
      <header className="bg-stabilar h-14 w-full fixed top-0 z-10 flex justify-center items-center gap-5">
        <img src={logo_stabilar_b} alt="logo-stabilar" className="w-10" />
        <h1 className="text-white text-xl">Stabilar</h1>
      </header>
      <div className="w-full max-w-5xl z-5 mt-20 p-2">
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

          <img
            src={estabilometro}
            alt="estab"
            className="absolute w-20 z-10 bottom-2 right-2"
          />
        </div>

        {/* Controles */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <Link
            to="/election"
            className="text-sm bg-white border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110 border px-2 py-1 rounded-full shadow-sm"
          >
            ←
          </Link>
          <button
            className="text-sm bg-white border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110 border px-2 py-1 rounded-full shadow-sm"
            onClick={() =>
              setFacingMode((prev) =>
                prev === "user" ? "environment" : "user"
              )
            }
          >
            <div className="flex justify-center items-center gap-2">
              <IoCameraReverseOutline />
              <span>Girar cámara</span>
            </div>
          </button>
          <button
            className="text-sm bg-white border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110 border px-2 py-1 rounded-full shadow-sm"
            onClick={handleCapture}
          >
            <div className="flex justify-center items-center gap-2">
              <IoCameraOutline />

              <span>Capturar</span>
            </div>
          </button>
          {frames.length > 0 && (
            <button
              className="text-sm bg-white border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110 border px-2 py-1 rounded-full shadow-sm"
              onClick={() => setFrames([])}
            >
              <div className="flex justify-center items-center gap-2">
                <GrPowerReset />

                <span>Reiniciar</span>
              </div>
            </button>
          )}
        </div>
        {/* Galería */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {frames.map((frame, frameIdx) => {
            const imgSize = imgSizes[frameIdx] || { width: 1, height: 1 };

            return (
              <div
                key={frameIdx}
                className="relative border border-stabilar rounded-lg overflow-hidden shadow-lg bg-white"
              >
                <button
                  onClick={() => handleExportFrame(frameIdx)}
                  className="absolute top-2 right-2 z-10 bg-slate-50/90 p-1 text-xl rounded-md border border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110"
                >
                  <PiExportDuotone />
                </button>
                <button
                  onClick={() => {
                    handleDeleteFrame(frameIdx);
                  }}
                  className="absolute top-2 right-12 z-10 bg-slate-50/90 p-1 text-xl rounded-md border border-stabilar text-stabilar hover:text-stabilar/80 hover:border-stabilar/80 hover:scale-110"
                >
                  <AiTwotoneDelete />
                </button>

                <img
                  src={frame.image}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgSizes((prev) => {
                      const newSizes = [...prev];
                      newSizes[frameIdx] = {
                        width: img.naturalWidth * 1.3,
                        height: img.naturalHeight * 1.3,
                      };
                      return newSizes;
                    });
                  }}
                />

                <svg
                  className="absolute top-0 left-0 w-full h-full"
                  viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
                >
                  {/* Líneas */}
                  {frame.lines.map(([a, b], idx) => {
                    const pa = frame.points[a];
                    const pb = frame.points[b];
                    if (!pa || !pb) return null;
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={pa.x * imgSize.width}
                        y1={pa.y * imgSize.height}
                        x2={pb.x * imgSize.width}
                        y2={pb.y * imgSize.height}
                        stroke="white"
                        strokeWidth="3"
                      />
                    );
                  })}

                  {/* Ángulos */}
                  {(() => {
                    const angulosPostura: [number, number, number][] = [
                      [23, 11, 13],
                      [11, 13, 15],
                      [24, 12, 14],
                      [12, 14, 16],
                      [12, 24, 26],
                      [24, 26, 28],
                      [11, 23, 25],
                      [23, 25, 27],
                    ];

                    return angulosPostura.map(([a, b, c], idx) => {
                      const pa = frame.points[a];
                      const pb = frame.points[b];
                      const pc = frame.points[c];
                      if (!pa || !pb || !pc) return null;

                      const angle = Math.round(calculateAngle(pa, pb, pc));
                      return (
                        <text
                          key={`angle-${idx}`}
                          x={pb.x * imgSize.width + 5}
                          y={pb.y * imgSize.height - 5}
                          fill="red"
                          fontSize={36}
                          fontWeight="bold"
                        >
                          {angle}º
                        </text>
                      );
                    });
                  })()}

                  {/* Puntos con drag */}
                  {Object.entries(frame.points).map(([id, p]) => (
                    <circle
                      key={`point-${id}`}
                      cx={p.x * imgSize.width}
                      cy={p.y * imgSize.height}
                      r={8}
                      fill="#ca2151"
                      style={{ cursor: "grab" }}
                      onMouseDown={() => {
                        const moveHandler = (ev: MouseEvent) =>
                          handleDrag(ev, Number(id), frameIdx);

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
            );
          })}
        </div>
      </div>
      <footer className="bg-stabilar h-14 w-full flex justify-center items-center gap-5 text-white mt-10 text-lg sm:text-xl">
        <a
          className="hover:scale-125 transition"
          href="https://www.instagram.com/stabil.ar"
          target="_blank"
        >
          <FaInstagram />
        </a>
        <span>-</span>
        <a
          className="hover:scale-125 transition"
          href="https://www.stabilar.com.ar"
          target="_blank"
        >
          <TbWorldWww />
        </a>
      </footer>
    </div>
  );
};

export { Stabilar };
