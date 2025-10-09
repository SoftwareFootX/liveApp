import { useEffect, useRef, useState } from "react";

interface PropsSecuencies {
  savedSequences: any[];
}

interface Props {
  data: PropsSecuencies;
}

const SaveSecuences = ({ data }: Props) => {
  const { savedSequences } = data;
  const [imgSize, setImgSize] = useState({ width: 640, height: 480 });

  // 🔹 Cada secuencia maneja su propio estado interno de frame actual
  const [currentIndexes, setCurrentIndexes] = useState<number[]>(
    savedSequences.map(() => 0)
  );

  const intervalRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    savedSequences.map(() => null)
  );

  const handleNext = (seqIdx: number) => {
    setCurrentIndexes((prev) => {
      const updated = [...prev];
      const seq = savedSequences[seqIdx];
      updated[seqIdx] = Math.min(updated[seqIdx] + 1, seq.frames.length - 1);
      return updated;
    });
  };

  const handlePrev = (seqIdx: number) => {
    setCurrentIndexes((prev) => {
      const updated = [...prev];
      updated[seqIdx] = Math.max(updated[seqIdx] - 1, 0);
      return updated;
    });
  };

  const handlePressStart = (seqIdx: number, direction: "next" | "prev") => {
    direction === "next" ? handleNext(seqIdx) : handlePrev(seqIdx);
    const fn = direction === "next" ? handleNext : handlePrev;
    intervalRefs.current[seqIdx] = setInterval(() => fn(seqIdx), 150);
  };

  const handlePressEnd = (seqIdx: number) => {
    if (intervalRefs.current[seqIdx]) {
      clearInterval(intervalRefs.current[seqIdx]!);
      intervalRefs.current[seqIdx] = null;
    }
  };

  const handleDrag = (e: MouseEvent, seqIdx: number, idx: number) => {
    const rect = (
      e.target as SVGCircleElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    savedSequences[seqIdx].frames[currentIndexes[seqIdx]].points[idx] = {
      ...savedSequences[seqIdx].frames[currentIndexes[seqIdx]].points[idx],
      x,
      y,
    };
  };

  function angleBetweenPoints(p1: any, p2: any, p3: any) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.acos(dot / (mag1 * mag2));
  }

  const angleArcPath = ({ p1, p2, p3, radius }: any) => {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    if (angle2 < angle1) angle2 += 2 * Math.PI;
    const x1 = p2.x + radius * Math.cos(angle1);
    const y1 = p2.y + radius * Math.sin(angle1);
    const x2 = p2.x + radius * Math.cos(angle2);
    const y2 = p2.y + radius * Math.sin(angle2);
    const largeArcFlag = angle2 - angle1 > Math.PI ? 1 : 0;
    return `M ${p2.x},${p2.y} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;
  };

  useEffect(() => {
    console.log("SECUENCIAS: ", savedSequences);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
      {savedSequences.map((seq, seqIdx) => {
        const frame = seq.frames[currentIndexes[seqIdx]];
        if (!frame) return null;

        return (
          <div
            key={seqIdx}
            className="p-2 border rounded-lg shadow bg-white flex flex-col items-center"
          >
            {/* 🔹 Título / Selector */}
            <div className="w-full mb-2 text-center">{`Secuencia ${
              seqIdx + 1
            }`}</div>

            {/* 🔹 Controles de navegación */}
            <div className="flex items-center justify-center gap-6 text-gray-700 mb-4">
              <button
                onMouseDown={() => handlePressStart(seqIdx, "prev")}
                onMouseUp={() => handlePressEnd(seqIdx)}
                onMouseLeave={() => handlePressEnd(seqIdx)}
                disabled={currentIndexes[seqIdx] === 0}
                className="rounded-full border px-2 hover:bg-gray-100"
              >
                ←
              </button>

              <span className="text-sm font-medium">
                {currentIndexes[seqIdx] + 1} / {seq.frames.length}
              </span>

              <button
                onMouseDown={() => handlePressStart(seqIdx, "next")}
                onMouseUp={() => handlePressEnd(seqIdx)}
                onMouseLeave={() => handlePressEnd(seqIdx)}
                disabled={currentIndexes[seqIdx] === seq.frames.length - 1}
                className="rounded-full border px-2 hover:bg-gray-100"
              >
                →
              </button>
            </div>

            {/* 🔹 Imagen con SVG overlay */}
            <div className="relative border rounded-lg overflow-hidden shadow-lg w-64 mx-auto">
              <img
                src={frame.image}
                alt={`frame-${currentIndexes[seqIdx]}`}
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
                    // setFrames((prev: any) =>
                    //   prev.filter((_: any, idx: any) => idx !== currentFrameIndex)
                    // );
                    // setCurrentFrameIndex((i: any) => (i > 0 ? i - 1 : 0));
                  }}
                >
                  🗑️
                </button>

                <button
                  className="bg-white px-2 py-1 rounded shadow hover:bg-blue-500 text-sm z-10"
                  onClick={() => {
                    // Exportar frame con líneas y puntos dibujados
                    // const canvas = document.createElement("canvas");
                    // canvas.width = canvasRef.current?.width || 640;
                    // canvas.height = canvasRef.current?.height || 480;
                    // const ctx = canvas.getContext("2d");
                    // if (!ctx) return;
                    // const frame = frames[currentFrameIndex];
                    // const img = new Image();
                    // img.src = frame.image;
                    // img.onload = () => {
                    //   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    //   // dibujar líneas
                    //   ctx.strokeStyle = "cyan";
                    //   ctx.lineWidth = 3;
                    //   frame.lines.forEach(([a, b]) => {
                    //     const pa = frame.points[a];
                    //     const pb = frame.points[b];
                    //     ctx.beginPath();
                    //     ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
                    //     ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
                    //     ctx.stroke();
                    //   });
                    //   // dibujar puntos
                    //   ctx.fillStyle = "red";
                    //   frame.points.forEach((p) => {
                    //     ctx.beginPath();
                    //     ctx.arc(
                    //       p.x * canvas.width,
                    //       p.y * canvas.height,
                    //       6,
                    //       0,
                    //       2 * Math.PI
                    //     );
                    //     ctx.fill();
                    //   });
                    //   // Descargar la imagen
                    //   const link = document.createElement("a");
                    //   link.download = `frame_${currentFrameIndex + 1}.png`;
                    //   link.href = canvas.toDataURL("image/png");
                    //   link.click();
                    // };
                  }}
                >
                  💾
                </button>
              </div>

              <svg
                className="absolute top-0 left-0 w-full h-full z-0"
                viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
              >
                {/* Líneas */}
                {frame.lines.map(([a, b]: any, idx: number) => {
                  const pa = frame.points[a];
                  const pb = frame.points[b];
                  return (
                    <line
                      key={`line-${idx}`}
                      x1={pa.x * imgSize.width}
                      y1={pa.y * imgSize.height}
                      x2={pb.x * imgSize.width}
                      y2={pb.y * imgSize.height}
                      stroke="#DE0000"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Ángulos */}
                {(() => {
                  const points = frame.points;
                  const lines = frame.lines;
                  const cw = imgSize.width;
                  const ch = imgSize.height;
                  const angles: any = [];

                  points.forEach((p: any, idx: number) => {
                    const connectedLines = lines.filter((line: any) =>
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
                          p1: other1,
                          p2: idx,
                          p3: other2,
                          value: angleValue,
                        });
                      }
                    }
                  });

                  return angles.map((a: any, idx: number) => {
                    const p1 = {
                      x: points[a.p1].x * cw,
                      y: points[a.p1].y * ch,
                    };
                    const p2 = {
                      x: points[a.p2].x * cw,
                      y: points[a.p2].y * ch,
                    };
                    const p3 = {
                      x: points[a.p3].x * cw,
                      y: points[a.p3].y * ch,
                    };
                    const radius = Math.min(30, cw * 0.05);
                    const path = angleArcPath({ p1, p2, p3, radius });
                    return (
                      <g key={`angle-${idx}`}>
                        <path d={path} fill="rgba(255,0,0,0.3)" stroke="red" />
                        <text
                          x={p2.x + radius + 5}
                          y={p2.y - 5}
                          fill="#60DE00"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {Math.round((a.value * 180) / Math.PI)}°
                        </text>
                      </g>
                    );
                  });
                })()}

                {/* Puntos */}
                {frame.points.map((p: any, idx: number) => (
                  <circle
                    key={`point-${idx}`}
                    cx={p.x * imgSize.width}
                    cy={p.y * imgSize.height}
                    r="4"
                    fill="#60DE00"
                    style={{ cursor: "grab" }}
                    onMouseDown={() => {
                      const moveHandler = (ev: MouseEvent) =>
                        handleDrag(ev, seqIdx, idx);
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
        );
      })}
    </div>
  );
};

export { SaveSecuences };
