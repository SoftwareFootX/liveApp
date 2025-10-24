import { useRef, useState } from "react";
import { type Recording } from "../../hooks/usePoseView";

interface Props {
  frames: Recording;
  currentFrameIndex: any;
  setCurrentFrameIndex: any;
  setFrames: any;
  canvasRef: any;
}

interface PropsFrameView {
  data: Props;
}

const FrameView = ({ data }: PropsFrameView) => {
  const {
    frames,
    currentFrameIndex,
    setCurrentFrameIndex,
    setFrames,
    canvasRef,
  } = data;

  const [imgSize, setImgSize] = useState({
    width: 1280,
    height: 720,
  });

  const intervalRef = useRef<any | null>(null);

  // ------------------ Next Frame ------------------

  const nextFrame = () => {
    setCurrentFrameIndex((prev: any) => Math.min(prev + 1, frames.length - 1));
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
    setCurrentFrameIndex((prev: any) => Math.max(prev - 1, 0));
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
  const handleDrag = (e: MouseEvent, idx: number) => {
    const rect = (
      e.target as SVGCircleElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFrames((prev: any) => {
      const updated = [...prev];
      updated[currentFrameIndex].points[idx] = {
        ...updated[currentFrameIndex].points[idx],
        x,
        y,
      };
      return updated;
    });
  };

  {
    /* Función para calcular ángulo entre tres puntos */
  }
  function angleBetweenPoints(p1: any, p2: any, p3: any) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    // Ángulo en radianes (0 → 180)
    let angle = Math.acos(dot / (mag1 * mag2));

    return angle;
  }

  {
    /* Función para generar el arco SVG del ángulo */
  }
  function angleArcPath({
    p1,
    p2,
    p3,
    radius,
  }: {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    p3: { x: number; y: number };
    radius: number;
  }) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);

    // Producto cruzado → determina el lado del arco
    const cross = v1.x * v2.y - v1.y * v2.x;
    const sweepFlag = cross < 0 ? 0 : 1;

    // Diferencia angular (0 → π)
    let delta = Math.abs(angle2 - angle1);
    if (delta > Math.PI) delta = 2 * Math.PI - delta;

    // Si el ángulo supera 180°, limitamos para que no se invierta el relleno
    const largeArcFlag = 0; // siempre 0 porque solo queremos hasta 180°

    // Puntos inicial y final del arco
    const start = {
      x: p2.x + Math.cos(angle1) * radius,
      y: p2.y + Math.sin(angle1) * radius,
    };
    const end = {
      x: p2.x + Math.cos(angle2) * radius,
      y: p2.y + Math.sin(angle2) * radius,
    };

    // Generamos el path SVG cerrado (sector)
    return `M ${p2.x},${p2.y}
          L ${start.x},${start.y}
          A ${radius},${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x},${end.y}
          Z`;
  }

  return (
    <>
      {frames.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-center gap-6 text-gray-700 select-none mb-4">
            <button
              onMouseDown={handlePrevPressStart}
              onMouseUp={handlePrevPressEnd}
              onMouseLeave={handlePrevPressEnd}
              onTouchStart={handlePrevPressStart}
              onTouchEnd={handlePrevPressEnd}
              disabled={currentFrameIndex === 0}
              className="hover:scale-105 rounded-full border border-gray-300 px-2  hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="text-sm">←</span>
            </button>

            <span className="text-sm font-medium tracking-wide text-gray-600">
              {currentFrameIndex + 1} / {frames.length}
            </span>

            <button
              onMouseDown={handleNextPressStart}
              onMouseUp={handleNextPressEnd}
              onMouseLeave={handleNextPressEnd}
              onTouchStart={handleNextPressStart}
              onTouchEnd={handleNextPressEnd}
              disabled={currentFrameIndex === frames.length - 1}
              className="hover:scale-105 rounded-full border border-gray-300 px-2  hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="text-sm">→</span>
            </button>
          </div>

          <div className="relative border rounded-lg overflow-hidden shadow-lg">
            <img
              src={frames[currentFrameIndex].image}
              alt={`frame-${currentFrameIndex}`}
              className="w-92 md:w-full h-auto object-contain max-w-2xl"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgSize({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              }}
            />

            {/* Botones sobrepuestos */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                className="bg-white px-2 py-1 rounded shadow hover:bg-red-400 text-sm z-10 hover:scale-120"
                onClick={() => {
                  // Eliminar el frame actual

                  setFrames((prev: any) =>
                    prev.filter((_: any, idx: any) => idx !== currentFrameIndex)
                  );

                  setCurrentFrameIndex((i: any) => (i > 0 ? i - 1 : 0));
                }}
              >
                🗑️
              </button>

              <button
                className="bg-white px-2 py-1 rounded shadow hover:bg-blue-500 text-sm z-10 hover:scale-120"
                onClick={() => {
                  // Exportar frame con líneas y puntos dibujados
                  const canvas = document.createElement("canvas");
                  canvas.width = canvasRef.current?.width || 1280;
                  canvas.height = canvasRef.current?.height || 720;
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
              viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
            >
              {/* Líneas */}
              {frames[currentFrameIndex].lines.map(([a, b], idx) => {
                const pa = frames[currentFrameIndex].points[a];
                const pb = frames[currentFrameIndex].points[b];
                return (
                  <line
                    key={`line-${idx}`}
                    x1={pa.x * imgSize.width}
                    y1={pa.y * imgSize.height}
                    x2={pb.x * imgSize.width}
                    y2={pb.y * imgSize.height}
                    stroke="#DE0000"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Ángulos */}
              {(() => {
                const points = frames[currentFrameIndex].points;
                const lines = frames[currentFrameIndex].lines;
                const cw = imgSize.width;
                const ch = imgSize.height;
                const angles: any = [];

                points.forEach((p, idx) => {
                  const connectedLines = lines.filter((line) =>
                    line.includes(idx)
                  );
                  for (let i = 0; i < connectedLines.length; i++) {
                    for (let j = i + 1; j < connectedLines.length; j++) {
                      const line1 = connectedLines[i];
                      const line2 = connectedLines[j];
                      const other1 = line1[0] === idx ? line1[1] : line1[0];
                      const other2 = line2[0] === idx ? line2[1] : line2[0];
                      const angleValue = angleBetweenPoints(
                        points[other1],
                        p,
                        points[other2]
                      );
                      angles.push({
                        vertex: idx,
                        p1: other1,
                        p2: idx,
                        p3: other2,
                        value: angleValue,
                      });
                    }
                  }
                });

                return angles.map((a: any, idx: any) => {
                  const p1 = { x: points[a.p1].x * cw, y: points[a.p1].y * ch };
                  const p2 = { x: points[a.p2].x * cw, y: points[a.p2].y * ch };
                  const p3 = { x: points[a.p3].x * cw, y: points[a.p3].y * ch };
                  const radius = Math.min(25, cw * 0.1);
                  const path = angleArcPath({ p1, p2, p3, radius });

                  // --- Calcular posición del texto dentro del arco ---
                  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
                  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

                  // Ajuste de sentido del arco (igual que en canvas)
                  let a1 = angle1;
                  let a2 = angle2;
                  const cross =
                    (p3.x - p2.x) * (p1.y - p2.y) -
                    (p3.y - p2.y) * (p1.x - p2.x);
                  const anticlockwise = cross > 0;
                  if (!anticlockwise && a2 < a1) a2 += 2 * Math.PI;
                  if (anticlockwise && a1 < a2) a1 += 2 * Math.PI;

                  const midAngle = (a1 + a2) / 2;
                  const textRadius = radius * 0.6; // posición del texto dentro del arco
                  const textX = p2.x + textRadius * Math.cos(midAngle);
                  const textY = p2.y + textRadius * Math.sin(midAngle);

                  return (
                    <g key={`angle-${idx}`}>
                      <path
                        d={path}
                        fill="rgba(255,0,0,0.3)"
                        stroke="red"
                        strokeWidth="1"
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill="#60DE00"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {Math.round((a.value * 180) / Math.PI)}°
                      </text>
                    </g>
                  );
                });
              })()}

              {/* Puntos */}
              {frames[currentFrameIndex].points.map((p, idx) => (
                <circle
                  key={`point-${idx}`}
                  cx={p.x * imgSize.width}
                  cy={p.y * imgSize.height}
                  r="3"
                  fill="#60DE00"
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
    </>
  );
};

export { FrameView };
