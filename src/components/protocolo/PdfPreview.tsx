import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { kinnx_logo } from "../../../public";

interface FrameData {
  id: number;
  title: string;
  etapa: string;
  image: string;
  points: { name: string; x: number; y: number }[];
  lines: [number, number][];
  angles: { name: string; value: number; points: { x: number; y: number }[] }[];
}

interface PaginaData {
  cuadros: (FrameData | null)[];
  observaciones: string;
  modo: 2 | 4;
}

const PdfPreview = ({
  frameSeleccionado,
  className,
}: {
  frameSeleccionado?: FrameData;
  className: any;
}) => {
  const [paginas, setPaginas] = useState<PaginaData[]>([
    { cuadros: [null, null], observaciones: "", modo: 2 },
  ]);
  const [paginaActual, setPaginaActual] = useState(0);
  const [cuadroSeleccionado, setCuadroSeleccionado] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentPage = paginas[paginaActual];

  // Si cambia el modo, ajusta los cuadros en la página actual
  const handleModoChange = (nuevoModo: 2 | 4) => {
    setPaginas((prev) => {
      const nuevas = [...prev];
      const pagina = { ...nuevas[paginaActual] };
      const nuevosCuadros = Array(nuevoModo).fill(null);
      for (let i = 0; i < Math.min(pagina.cuadros.length, nuevoModo); i++)
        nuevosCuadros[i] = pagina.cuadros[i];
      pagina.cuadros = nuevosCuadros;
      pagina.modo = nuevoModo;
      nuevas[paginaActual] = pagina;
      return nuevas;
    });
  };

  // Cuando se selecciona un frame, lo asigna al cuadro seleccionado
  useEffect(() => {
    if (cuadroSeleccionado !== null && frameSeleccionado) {
      setPaginas((prev) => {
        const nuevas = [...prev];
        const pagina = { ...nuevas[paginaActual] };
        const nuevosCuadros = [...pagina.cuadros];
        nuevosCuadros[cuadroSeleccionado] = frameSeleccionado;
        pagina.cuadros = nuevosCuadros;
        nuevas[paginaActual] = pagina;
        return nuevas;
      });
      setCuadroSeleccionado(null);
    }
  }, [frameSeleccionado]);

  // Nueva página
  const handleNuevaPagina = () => {
    setPaginas((prev) => [
      ...prev,
      { cuadros: [null, null], observaciones: "", modo: 2 },
    ]);
    setPaginaActual(paginas.length);
  };

  // Navegación entre páginas
  const handlePaginaAnterior = () => {
    if (paginaActual > 0) setPaginaActual((p) => p - 1);
  };
  const handlePaginaSiguiente = () => {
    if (paginaActual < paginas.length - 1) setPaginaActual((p) => p + 1);
  };

  // Generar PDF (todas las páginas)
  const handleGenerarPDF = async () => {
    setLoading(true);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });

    for (let i = 0; i < paginas.length; i++) {
      await new Promise<void>((resolve) => {
        setPaginaActual(i); // Muestra la página correcta antes de capturar
        setTimeout(async () => {
          if (!containerRef.current) return resolve();

          const canvas = await html2canvas(containerRef.current, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            onclone: (clonedDoc) => {
              // Reemplaza colores que usan oklch por hexadecimales seguros
              clonedDoc.querySelectorAll("*").forEach((el) => {
                const htmlEl = el as HTMLElement; // <-- casteo a HTMLElement
                const style = getComputedStyle(htmlEl);

                // Fondo
                if (style.backgroundColor.includes("oklch")) {
                  htmlEl.style.backgroundColor = "#ffffff";
                }
                // Texto
                if (style.color.includes("oklch")) {
                  htmlEl.style.color = "#111827";
                }
                // Bordes
                if (style.borderColor.includes("oklch")) {
                  htmlEl.style.borderColor = "#d1d5db";
                }
              });
            },
          });

          const imgData = canvas.toDataURL("image/jpeg", 1.0);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 20, 20, imgWidth, imgHeight);

          resolve();
        }, 300);
      });
    }

    pdf.save("kinnk.pdf");
    setLoading(false);
  };

  return (
    <div className={`w-full mt-2 ${className}`}>
      {/* Controles */}
      <div className="flex flex-col gap-2 items-center mb-3 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <label className="font-medium">Modo:</label>
          <select
            value={currentPage.modo}
            onChange={(e) => handleModoChange(Number(e.target.value) as 2 | 4)}
            className="border rounded px-2 py-1"
          >
            <option value={2}>2 imágenes</option>
            <option value={4}>4 imágenes</option>
          </select>
        </div>

        <div className="flex justify-between items-center gap-5">
          <div className="flex justify-center items-center gap-3">
            {/* Botón Página Anterior */}
            <button
              onClick={handlePaginaAnterior}
              disabled={paginaActual === 0}
              className={`${
                paginaActual === 0
                  ? "bg-gray-400 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-opacity"
              } rounded-full border border-gray-300 px-2 transition`}
            >
              <span className="text-sm">←</span>
            </button>

            <p className="text-xs text-gray-500">
              Página {paginaActual + 1} de {paginas.length}
            </p>

            {/* Botón Página Siguiente */}
            <button
              onClick={handlePaginaSiguiente}
              disabled={paginaActual >= paginas.length - 1}
              className={`${
                paginaActual >= paginas.length - 1
                  ? "bg-gray-400 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-opacity"
              } rounded-full border border-gray-300 px-2 transition`}
            >
              <span className="text-sm">→</span>
            </button>
          </div>

          {/* Botón Nueva Página */}
          <button
            onClick={handleNuevaPagina}
            className="rounded-full border border-gray-300 px-2 bg-primary text-white hover:bg-primary-opacity transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Contenedor principal */}
      <div ref={containerRef}>
        <Pagina
          pagina={currentPage}
          cuadroSeleccionado={cuadroSeleccionado}
          setCuadroSeleccionado={setCuadroSeleccionado}
          setPaginas={setPaginas}
          paginaActual={paginaActual}
          loading={loading}
        />
      </div>

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

// Componente individual de página
const Pagina = ({
  pagina,
  cuadroSeleccionado,
  setCuadroSeleccionado,
  setPaginas,
  paginaActual,
  loading,
}: any) => {
  const { cuadros, observaciones, modo } = pagina;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="bg-white p-4 rounded-lg shadow-md"
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      {/* Encabezado */}
      <div
        className="flex items-center justify-around mb-6 w-auto max-w-sm mx-auto"
        style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "10px" }}
      >
        <div
          style={{
            borderRadius: "8px",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          <img src={kinnx_logo} className="size-15" alt="Logo KinnX" />
        </div>
        <div className={`text-center ${loading ? "-mt-5" : "mt-0"}`}>
          <h1 className="font-semibold text-gray-900">
            Consultorio Kinesiológico
          </h1>
          <h2 className="text-xs text-gray-500">
            Análisis Postural y Funcional
          </h2>
        </div>
      </div>

      {/* Grid de imágenes */}
      <div
        className={`grid ${
          modo === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
        } gap-4`}
      >
        {cuadros.map((frame: FrameData | null, idx: number) => (
          <div
            key={idx}
            className="relative flex justify-center items-center rounded-md flex-col min-h-30"
            style={{
              border: `1px solid ${
                cuadroSeleccionado === idx ? "#2563eb" : "#d1d5db"
              }`,
              backgroundColor: "#fafafa",
            }}
            onClick={() => setCuadroSeleccionado(idx)}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "500",
                marginTop: loading ? "-6px" : "0px",
                marginBottom: loading ? "8px" : "0px",
              }}
            >
              {frame?.title || "Sin título"}
            </span>
            {frame?.etapa && (
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: "500",
                  position: "absolute",
                  top: "22px",
                  left: "2px",
                  background: "white",
                  borderRadius: "5px",
                  padding: "2px 5px",
                  height: "15px",
                }}
              >
                <p className={`${loading ? "-mt-[5px]" : "mt-0"}`}>
                  {frame?.etapa}
                </p>
              </span>
            )}

            {frame ? (
              <FrameCanvas frame={frame} />
            ) : (
              <div
                className="text-center"
                style={{ color: "#9ca3af", fontSize: "12px" }}
              >
                Click para asignar
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Observaciones */}
      <div
        className="mt-6 p-4 rounded-md"
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <label
          className="block mb-2 font-semibold"
          style={{
            fontSize: "12px",
            color: "#111827",
            marginTop: loading ? "-6px" : "0px",
          }}
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
          onChange={(e) =>
            setPaginas((prev: PaginaData[]) => {
              const nuevas = [...prev];
              nuevas[paginaActual] = {
                ...nuevas[paginaActual],
                observaciones: e.target.value,
              };
              return nuevas;
            })
          }
          placeholder="Escriba sus observaciones aquí..."
        />
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
    const angle = Math.acos(dot / (mag1 * mag2));
    return (angle * 180) / Math.PI;
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

  return <canvas ref={canvasRef} className="w-full h-auto rounded-b-[4px]" />;
};

export { PdfPreview };
