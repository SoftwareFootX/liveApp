import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { kinnx_logo } from "../../../public";

interface FrameData {
  id: number;
  title: string;
  image: string;
  points: { name: string; x: number; y: number }[];
  lines: [number, number][];
  angles: { name: string; value: number; points: { x: number; y: number }[] }[];
}

const PdfPreview = ({
  frameSeleccionado,
  className,
}: {
  frameSeleccionado?: FrameData;
  className?: string;
}) => {
  const [modo, setModo] = useState<2 | 4>(2);

  // Multi-página
  const [paginas, setPaginas] = useState<(FrameData | null)[][]>([
    Array(2).fill(null),
  ]);
  const [paginaSeleccionada, setPaginaSeleccionada] = useState(0);
  const [cuadroSeleccionado, setCuadroSeleccionado] = useState<number | null>(
    null
  );
  const [observaciones, setObservaciones] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Actualiza la cantidad de cuadros si cambia el modo
  useEffect(() => {
    setPaginas((prev) =>
      prev.map((p) => {
        const nuevos = Array(modo).fill(null);
        for (let i = 0; i < Math.min(p.length, modo); i++) nuevos[i] = p[i];
        return nuevos;
      })
    );
  }, [modo]);

  // Carga frame en el cuadro seleccionado
  useEffect(() => {
    if (cuadroSeleccionado === null) return; // nada que hacer
    if (!frameSeleccionado) return;

    // Asigna frame solo si el usuario ya eligió el cuadro
    setPaginas((prev) => {
      const paginasCopy = [...prev];
      const pagina = [...paginasCopy[paginaSeleccionada]];
      pagina[cuadroSeleccionado] = frameSeleccionado;
      paginasCopy[paginaSeleccionada] = pagina;
      return paginasCopy;
    });

    // Limpiar selección para evitar que se reasigne automáticamente
    setCuadroSeleccionado(null);
  }, [frameSeleccionado]);

  // Agregar nueva página
  const handleAgregarPagina = () => {
    setPaginas((prev) => [...prev, Array(modo).fill(null)]);
    setPaginaSeleccionada(paginas.length);
  };

  const handlePaginaAnterior = () => {
    if (paginaSeleccionada > 0) setPaginaSeleccionada(paginaSeleccionada - 1);
  };

  const handlePaginaSiguiente = () => {
    if (paginaSeleccionada < paginas.length - 1)
      setPaginaSeleccionada(paginaSeleccionada + 1);
  };

  // Generar PDF multi-página
  const handleGenerarPDF = async () => {
    setCuadroSeleccionado(null);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();

    for (let i = 0; i < paginas.length; i++) {
      const pagina = paginas[i];

      // Creamos un contenedor temporal para renderizar la página
      const tempDiv = document.createElement("div");
      tempDiv.style.width = "800px";
      tempDiv.style.padding = "20px";
      tempDiv.style.backgroundColor = "#fff";
      tempDiv.style.fontFamily = "'Helvetica Neue', Arial, sans-serif";

      // Header
      tempDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">
          <div style="width:80px;height:50px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;border-radius:8px;">
            <img src="${kinnx_logo}" style="height:30px;" />
          </div>
          <div style="text-align:center;flex:1;">
            <h1 style="font-size:18px;font-weight:600;margin:0;color:#111827;">Consultorio Kinesiológico</h1>
            <h2 style="font-size:14px;font-weight:400;color:#6b7280;margin:0;">Análisis Postural y Funcional</h2>
          </div>
          <div style="width:80px;"></div>
        </div>
      `;

      // Cuadros
      const gridDiv = document.createElement("div");
      gridDiv.style.display = "grid";
      gridDiv.style.gap = "10px";
      if (modo === 2) gridDiv.style.gridTemplateColumns = "1fr 1fr";
      else gridDiv.style.gridTemplateColumns = "1fr 1fr";
      gridDiv.style.gridTemplateRows = modo === 4 ? "1fr 1fr" : "auto";

      pagina.forEach((frame) => {
        const frameDiv = document.createElement("div");
        frameDiv.style.border = "1px solid #d1d5db";
        frameDiv.style.padding = "6px";
        frameDiv.style.background = "#fafafa";
        frameDiv.style.display = "flex";
        frameDiv.style.flexDirection = "column";
        frameDiv.style.alignItems = "center";

        if (frame) {
          const img = document.createElement("img");
          img.src = frame.image;
          img.style.width = "100%";
          img.style.objectFit = "contain";
          frameDiv.appendChild(img);

          const title = document.createElement("span");
          title.textContent = frame.title;
          title.style.fontSize = "12px";
          title.style.fontWeight = "500";
          frameDiv.appendChild(title);
        } else {
          const span = document.createElement("span");
          span.textContent = "Sin título";
          span.style.fontSize = "12px";
          span.style.color = "#9ca3af";
          frameDiv.appendChild(span);
        }

        gridDiv.appendChild(frameDiv);
      });

      tempDiv.appendChild(gridDiv);

      // Observaciones
      const obsDiv = document.createElement("div");
      obsDiv.style.marginTop = "20px";
      obsDiv.style.padding = "10px";
      obsDiv.style.border = "1px solid #e5e7eb";
      obsDiv.style.background = "#f9fafb";
      obsDiv.textContent = observaciones;
      tempDiv.appendChild(obsDiv);

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        backgroundColor: "#fff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 20, 20, imgWidth, imgHeight);

      document.body.removeChild(tempDiv);
    }

    pdf.save("analisis.pdf");
  };

  const cuadrosActuales = paginas[paginaSeleccionada];

  return (
    <div className={`w-full mt-4 ${className}`}>
      {/* Controles página */}
      <div className="flex justify-between items-center gap-2 mb-3">
        <div>
          <button
            onClick={handlePaginaAnterior}
            disabled={paginaSeleccionada === 0}
            className="border px-3 py-1 rounded"
          >
            {"<"} Anterior
          </button>
          <span className="mx-2">
            Página {paginaSeleccionada + 1} / {paginas.length}
          </span>
          <button
            onClick={handlePaginaSiguiente}
            disabled={paginaSeleccionada === paginas.length - 1}
            className="border px-3 py-1 rounded"
          >
            Siguiente {">"}
          </button>
        </div>
        <button
          onClick={handleAgregarPagina}
          className="border px-3 py-1 rounded bg-green-100"
        >
          + Agregar Página
        </button>
      </div>

      {/* Modo */}
      <div className="flex justify-around items-center mb-3">
        <label className="font-medium">Modo:</label>
        <select
          value={modo}
          onChange={(e) => setModo(Number(e.target.value) as 2 | 4)}
          className="border rounded px-2 py-1"
        >
          <option value={2}>2 imágenes</option>
          <option value={4}>4 imágenes</option>
        </select>
      </div>

      {/* Contenedor página */}
      <div
        ref={containerRef}
        className="bg-white p-4 rounded-lg shadow-md"
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          color: "#1f2937",
        }}
      >
        <div
          className={`grid ${
            modo === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
          } gap-4`}
        >
          {cuadrosActuales.map((frame, idx) => (
            <div
              key={idx}
              className="relative flex justify-center items-center rounded-md flex-col"
              style={{
                border: `1px solid ${
                  cuadroSeleccionado === idx ? "#2563eb" : "#d1d5db"
                }`,
                backgroundColor: "#fafafa",
                padding: "6px",
              }}
              onClick={() => setCuadroSeleccionado(idx)}
            >
              <span
                style={{
                  paddingBottom: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  marginTop: "-5px",
                }}
              >
                {frame?.title || "Sin título"}
              </span>
              {frame ? (
                <FrameCanvas frame={frame} />
              ) : (
                <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                  Click para asignar
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Observaciones */}
        <div
          className="mt-6 p-4 rounded-md"
          style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
        >
          <label
            className="block mb-2 font-semibold"
            style={{ fontSize: "12px", color: "#111827" }}
          >
            Observaciones:
          </label>
          <textarea
            className="w-full p-3 rounded-md resize-none"
            style={{
              border: "1px solid #d1d5db",
              minHeight: "80px",
              fontSize: "12px",
              outline: "none",
            }}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Escriba sus observaciones aquí..."
          />
        </div>
      </div>

      {/* Botón generar PDF */}
      <div className="w-full flex justify-center items-center mt-2">
        <button
          onClick={handleGenerarPDF}
          className="bg-blue-600 text-white rounded px-20 hover:bg-blue-700"
        >
          Generar PDF
        </button>
      </div>
    </div>
  );
};

const FrameCanvas = ({ frame }: { frame: FrameData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calcularAngulo = (p1: any, p2: any, p3: any) => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    return (Math.acos(dot / (mag1 * mag2)) * 180) / Math.PI;
  };

  useEffect(() => {
    const img = new Image();
    img.src = frame.image;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      frame.lines.forEach(([a, b]) => {
        const p1 = frame.points[a];
        const p2 = frame.points[b];
        ctx.beginPath();
        ctx.moveTo(p1.x * img.width, p1.y * img.height);
        ctx.lineTo(p2.x * img.width, p2.y * img.height);
        ctx.stroke();
      });

      ctx.fillStyle = "yellow";
      frame.points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * img.width, p.y * img.height, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      for (let i = 0; i < frame.points.length; i++) {
        const conexiones = frame.lines.filter(([a, b]) => a === i || b === i);
        if (conexiones.length === 2) {
          const otro1 =
            conexiones[0][0] === i ? conexiones[0][1] : conexiones[0][0];
          const otro2 =
            conexiones[1][0] === i ? conexiones[1][1] : conexiones[1][0];
          const angulo = calcularAngulo(
            frame.points[otro1],
            frame.points[i],
            frame.points[otro2]
          );
          const p = frame.points[i];
          const text = `${angulo.toFixed(1)}°`;
          ctx.strokeStyle = "black";
          ctx.lineWidth = 3;
          ctx.strokeText(text, p.x * img.width + 5, p.y * img.height);
          ctx.fillText(text, p.x * img.width + 5, p.y * img.height);
        }
      }
    };
  }, [frame]);

  return <canvas ref={canvasRef} className="w-full h-auto" />;
};

export { PdfPreview };
