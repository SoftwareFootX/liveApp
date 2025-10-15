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
  function angleBetweenPoints(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const angleRad = Math.acos(dot / (mag1 * mag2));
    return angleRad;
  }

  // Función para generar el path SVG de un arco tipo sector

  interface PropsAngles {
    p1: any;
    p2: any;
    p3: any;
    radius: number;
  }
  const angleArcPath = ({ p1, p2, p3, radius }: PropsAngles) => {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    if (angle2 < angle1) angle2 += 2 * Math.PI;

    const x1 = p2.x + radius * Math.cos(angle1);
    const y1 = p2.y + radius * Math.sin(angle1);
    const x2 = p2.x + radius * Math.cos(angle2);
    const y2 = p2.y + radius * Math.sin(angle2);

    const largeArcFlag = angle2 - angle1 > Math.PI ? 1 : 0;

    return `
    M ${p2.x},${p2.y} 
    L ${x1},${y1} 
    A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} 
    Z
  `;
  };

  const [imgSize, setImgSize] = useState({ width: 640, height: 480 });

  return (
    <>
      {frames.length > 0 && (
        <div className="mt-4 max-w-lg">
          <div className="flex items-center justify-center gap-6 text-gray-700 select-none mb-4">
            <button
              onMouseDown={handlePrevPressStart}
              onMouseUp={handlePrevPressEnd}
              onMouseLeave={handlePrevPressEnd}
              onTouchStart={handlePrevPressStart}
              onTouchEnd={handlePrevPressEnd}
              disabled={currentFrameIndex === 0}
              className="rounded-full border border-gray-300 px-2  hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
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
              className="rounded-full border border-gray-300 px-2  hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="text-sm">→</span>
            </button>
          </div>

          <div className="relative border rounded-lg overflow-hidden shadow-lg w-78 sm:w-82 mx-auto">
            <img
              src={frames[currentFrameIndex].image}
              alt={`frame-${currentFrameIndex}`}
              className="w-full"
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
                className="bg-white px-2 py-1 rounded shadow hover:bg-red-400 text-sm z-10"
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
                  const radius = Math.min(30, cw * 0.05);
                  const path = angleArcPath({ p1, p2, p3, radius });

                  return (
                    <g key={`angle-${idx}`}>
                      <path
                        d={path}
                        fill="rgba(255,0,0,0.3)"
                        stroke="red"
                        strokeWidth="1"
                      />
                      <text
                        x={p2.x + radius + 5}
                        y={p2.y - 5}
                        fill="#60DE00"
                        fontSize="10"
                        fontWeight="bold"
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
