import { useRef, useState } from "react";
import {
  closestCenter,
  PointerSensor,
  useSensors,
  DndContext,
  useSensor,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PropsSecuencies {
  savedSequences: any[];
  setFrameSeleccionado: any;
}

interface Props {
  data: PropsSecuencies;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem = ({ id, children }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* 🔹 Drag handle */}
      <div
        {...listeners}
        className="cursor-grab p-1 text-gray-500 text-2xl select-none absolute rounded px-2 hover:scale-105"
      >
        ⠿
      </div>

      {/* 🔹 Resto del contenido */}
      {children}
    </div>
  );
};

const SaveSecuences = ({ data }: Props) => {
  const { setFrameSeleccionado, savedSequences } = data;
  const [sequences, setSequences] = useState(
    savedSequences.map((seq, i) => ({ ...seq, id: i }))
  );

  const [imgSize, setImgSize] = useState({ width: 640, height: 480 });
  const [currentIndexes, setCurrentIndexes] = useState<number[]>(
    sequences.map(() => 0)
  );
  const intervalRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    sequences.map(() => null)
  );
  const [etapaSeleccionada, setEtapaSeleccionada] = useState("---");

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = sequences.findIndex((s) => s.id === active.id);
      const newIndex = sequences.findIndex((s) => s.id === over.id);
      setSequences((items) => arrayMove(items, oldIndex, newIndex));
      setCurrentIndexes((indexes) => arrayMove(indexes, oldIndex, newIndex));
    }
  };

  const handleNext = (seqIdx: number) => {
    setCurrentIndexes((prev) => {
      const updated = [...prev];
      const seq = sequences[seqIdx];
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

  const handleDragPoint = (e: MouseEvent, seqIdx: number, idx: number) => {
    const rect = (
      e.target as SVGCircleElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    sequences[seqIdx].frames[currentIndexes[seqIdx]].points[idx] = {
      ...sequences[seqIdx].frames[currentIndexes[seqIdx]].points[idx],
      x,
      y,
    };
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

  // dentro de SaveSecuences (antes del return), pegá:

  /**
   * Elimina el frame actual de la secuencia seqIdx.
   * Actualiza sequences (estado local) y currentIndexes (clamp).
   */
  const handleDeleteFrame = (seqIdx: number) => {
    setSequences((prev) => {
      const copy = prev.map((s) => ({ ...s, frames: [...s.frames] }));
      const seq = copy[seqIdx];
      if (!seq) return prev;
      const frameIdx = currentIndexes[seqIdx];
      if (frameIdx < 0 || frameIdx >= seq.frames.length) return prev;

      // quitar el frame
      seq.frames.splice(frameIdx, 1);

      // si no quedan frames, podés decidir eliminar la secuencia o dejarla vacía.
      // Aquí dejamos la secuencia con frames = [] para no romper índices.
      return copy;
    });

    // ajustar currentIndexes
    setCurrentIndexes((prev) => {
      const updated = [...prev];
      if (updated[seqIdx] > 0) {
        updated[seqIdx] = Math.max(0, updated[seqIdx] - 1);
      } else {
        // si quedó fuera de rango (sequence vacía), mantener 0
        updated[seqIdx] = 0;
      }
      return updated;
    });
  };

  /**
   * Dibuja sobre un canvas la imagen + líneas + puntos + ángulos
   * y lanza la descarga como PNG.
   */
  const handleSaveFrame = async (seqIdx: number) => {
    const seq = sequences[seqIdx];
    if (!seq) return;
    const frame = seq.frames[currentIndexes[seqIdx]];
    if (!frame) return;

    // Crear imagen base
    const img = new Image();
    img.src = frame.image;
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Error cargando la imagen"));
    });

    // Crear canvas del tamaño de la imagen
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dibujar la imagen base
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // --- Dibujar líneas ---
    ctx.strokeStyle = "#DE0000";
    ctx.lineWidth = Math.max(
      2,
      Math.round(Math.min(img.width, img.height) * 0.004)
    );
    frame.lines.forEach(([a, b]: any) => {
      const p1 = frame.points[a];
      const p2 = frame.points[b];
      ctx.beginPath();
      ctx.moveTo(p1.x * img.width, p1.y * img.height);
      ctx.lineTo(p2.x * img.width, p2.y * img.height);
      ctx.stroke();
    });

    // --- Dibujar puntos ---
    ctx.fillStyle = "#60DE00";
    frame.points.forEach((p: any) => {
      ctx.beginPath();
      ctx.arc(
        p.x * img.width,
        p.y * img.height,
        Math.max(3, Math.round(Math.min(img.width, img.height) * 0.006)),
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // --- Dibujar ángulos ---
    const { points, lines } = frame;
    for (let i = 0; i < points.length; i++) {
      const connected = lines.filter((ln: any) => ln.includes(i));
      if (connected.length < 2) continue;

      for (let a = 0; a < connected.length; a++) {
        for (let b = a + 1; b < connected.length; b++) {
          const line1 = connected[a];
          const line2 = connected[b];
          const other1 = line1[0] === i ? line1[1] : line1[0];
          const other2 = line2[0] === i ? line2[1] : line2[0];

          const p1 = {
            x: points[other1].x * img.width,
            y: points[other1].y * img.height,
          };
          const p2 = {
            x: points[i].x * img.width,
            y: points[i].y * img.height,
          };
          const p3 = {
            x: points[other2].x * img.width,
            y: points[other2].y * img.height,
          };

          // --- Calcular ángulo ---
          const angleRad = angleBetweenPoints(
            points[other1],
            points[i],
            points[other2]
          );
          const deg = Math.round((angleRad * 180) / Math.PI);

          // --- Dibujar arco ---
          const radius = Math.min(30, img.width * 0.05);
          const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
          const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

          const angle1 = Math.atan2(v1.y, v1.x);
          const angle2 = Math.atan2(v2.y, v2.x);
          const cross = v1.x * v2.y - v1.y * v2.x;
          const anticlockwise = cross < 0;

          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.arc(p2.x, p2.y, radius, angle1, angle2, anticlockwise);
          ctx.lineTo(p2.x, p2.y);
          ctx.fillStyle = "rgba(255,0,0,0.3)";
          ctx.fill();
          ctx.strokeStyle = "red";
          ctx.lineWidth = Math.max(
            2,
            Math.round(Math.min(img.width, img.height) * 0.004)
          );
          ctx.stroke();

          // --- Dibujar texto ---
          const a1 = angle1;
          const a2 = angle2;
          const midAngle = anticlockwise ? (a2 + a1) / 2 : (a1 + a2) / 2;
          const textRadius = radius * 0.6;
          const textX = p2.x + textRadius * Math.cos(midAngle);
          const textY = p2.y + textRadius * Math.sin(midAngle);

          ctx.font = `${Math.max(12, Math.round(img.width * 0.02))}px Arial`;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillStyle = "#60DE00";
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = 3;
          ctx.strokeText(`${deg}°`, textX, textY);
          ctx.fillText(`${deg}°`, textX, textY);
        }
      }
    }

    // --- Guardar imagen final ---
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const frameIdx = currentIndexes[seqIdx] ?? 0;
      a.download = `sequence-${seqIdx + 1}_frame-${frameIdx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleExportSequences = () => {
    // Convertimos a string JSON

    const dataStr = JSON.stringify(sequences, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    // Creamos enlace de descarga
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sequences_backup.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sequences.map((s) => s.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {sequences.map((seq, seqIdx) => {
            const frame = seq.frames[currentIndexes[seqIdx]];
            if (!frame) return null;

            return (
              <SortableItem key={seq.id} id={seq.id}>
                <div className="p-2 border rounded-lg shadow bg-white flex flex-col items-center">
                  <span className="text-gray-500 text-sm">{seq.title}</span>
                  <div className="flex items-center gap-2 w-full  justify-between text-gray-700  my-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        // 1️⃣ Actualizar el frame seleccionado
                        setFrameSeleccionado({
                          ...frame,
                          title: seq.title,
                          etapa: etapaSeleccionada,
                        });
                      }}
                      className="rounded-full border px-2 hover:bg-gray-100 z-10 hover:scale-105 cursor-pointer"
                    >
                      Seleccionar
                    </button>
                    <button
                      onMouseDown={() => handlePressStart(seqIdx, "prev")}
                      onMouseUp={() => handlePressEnd(seqIdx)}
                      onMouseLeave={() => handlePressEnd(seqIdx)}
                      disabled={currentIndexes[seqIdx] === 0}
                      className="rounded-full border px-2 hover:bg-gray-100 hover:scale-105 cursor-pointer"
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
                      disabled={
                        currentIndexes[seqIdx] === seq.frames.length - 1
                      }
                      className="rounded-full border px-2 hover:bg-gray-100 hover:scale-105 cursor-pointer"
                    >
                      →
                    </button>
                  </div>

                  <div className="flex justify-center items-center gap-3 text-sm text-gray-600 mb-2">
                    <span>Etapa: </span>
                    <select
                      className="cursor-pointer"
                      value={seq.etapa}
                      onChange={(e) => {
                        // 2️⃣ Actualizar solo el objeto actual en 'sequences'
                        setSequences((prev) =>
                          prev.map((item, i) =>
                            i === seqIdx
                              ? { ...item, etapa: e.target.value } // agrega o reemplaza la etapa
                              : item
                          )
                        );

                        setEtapaSeleccionada(e.target.value);
                      }}
                    >
                      <option value="---">-------------</option>
                      <option value="Avance inicial">Avance inicial</option>
                      <option value="Avance medio">Avance medio</option>
                      <option value="Impulso inicial">Impulso inicial</option>
                      <option value="Impulso medio">Impulso medio</option>
                      <option value="Arrastre inicial">Arrastre inicial</option>
                      <option value="Arrastre medio">Arrastre medio</option>
                      <option value="Recobro inicial">Recobro inicial</option>
                      <option value="Recobro medio">Recobro medio</option>
                    </select>
                  </div>

                  <div className="relative border rounded-lg overflow-hidden shadow-lg w-40 sm:w-44 md:w-48 lg:w-54 xl:w-82 mx-auto">
                    <img
                      src={frame.image}
                      alt={`frame-${currentIndexes[seqIdx]}`}
                      className="w-full h-auto object-contain"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImgSize({
                          width: img.naturalWidth,
                          height: img.naturalHeight,
                        });
                      }}
                    />

                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                      <button
                        className="bg-white px-2 py-1 rounded shadow hover:bg-red-400 text-sm hover:scale-120 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrame(seqIdx);
                        }}
                        title="Eliminar frame"
                      >
                        🗑️
                      </button>

                      <button
                        className="bg-white px-2 py-1 rounded shadow hover:bg-blue-500 text-sm hover:scale-120 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveFrame(seqIdx);
                        }}
                        title="Guardar frame como PNG"
                      >
                        💾
                      </button>
                    </div>

                    <svg
                      className="absolute top-0 left-0 w-full h-full z-0"
                      viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
                    >
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

                      {(() => {
                        const points = frame.points;
                        const lines = frame.lines;
                        const cw = imgSize.width;
                        const ch = imgSize.height;
                        const angles: any = [];

                        // Recorremos cada punto y buscamos combinaciones de líneas para formar ángulos
                        points.forEach((p: any, idx: number) => {
                          const connectedLines = lines.filter((line: any) =>
                            line.includes(idx)
                          );
                          for (let i = 0; i < connectedLines.length; i++) {
                            for (
                              let j = i + 1;
                              j < connectedLines.length;
                              j++
                            ) {
                              const line1 = connectedLines[i];
                              const line2 = connectedLines[j];
                              const other1 =
                                line1[0] === idx ? line1[1] : line1[0];
                              const other2 =
                                line2[0] === idx ? line2[1] : line2[0];
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

                        // Renderizamos arco y texto para cada ángulo
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

                          // --- Posición del texto dentro del arco ---
                          const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
                          const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                          let a1 = angle1;
                          let a2 = angle2;
                          const cross =
                            (p3.x - p2.x) * (p1.y - p2.y) -
                            (p3.y - p2.y) * (p1.x - p2.x);
                          const anticlockwise = cross > 0;
                          if (!anticlockwise && a2 < a1) a2 += 2 * Math.PI;
                          if (anticlockwise && a1 < a2) a1 += 2 * Math.PI;
                          const midAngle = (a1 + a2) / 2;
                          const textRadius = radius * 0.6;
                          const textX = p2.x + textRadius * Math.cos(midAngle);
                          const textY = p2.y + textRadius * Math.sin(midAngle);

                          return (
                            <g key={`angle-${idx}`}>
                              <path
                                d={path}
                                fill="rgba(255,0,0,0.3)"
                                stroke="red"
                              />
                              <text
                                x={textX}
                                y={textY}
                                fill="#60DE00"
                                fontSize="12"
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
                              handleDragPoint(ev, seqIdx, idx);
                            const upHandler = () => {
                              window.removeEventListener(
                                "mousemove",
                                moveHandler
                              );
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
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
      <div className="w-full flex justify-center items-center max-w-sm">
        {sequences.length > 0 && (
          <button
            className="px-3 cursor-pointer hover:scale-105 py-1 rounded-full text-sm bg-primary text-white font-medium shadow hover:bg-primary-opacity transition mt-5"
            onClick={handleExportSequences}
          >
            📤 Exportar secuencias
          </button>
        )}
      </div>
    </DndContext>
  );
};

export { SaveSecuences };
