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
  className: any;
}) => {
  const [modo, setModo] = useState<2 | 4>(2);
  const [observaciones, setObservaciones] = useState("");

  const [cuadros, setCuadros] = useState<(FrameData | null)[]>([null, null]);
  const [cuadroSeleccionado, setCuadroSeleccionado] = useState<number | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Actualiza la cantidad de cuadros al cambiar el modo
  useEffect(() => {
    setCuadros((prev) => {
      const nuevos = Array(modo).fill(null);
      for (let i = 0; i < Math.min(prev.length, modo); i++) nuevos[i] = prev[i];
      return nuevos;
    });
  }, [modo]);

  // Carga un nuevo frame en el cuadro seleccionado
  useEffect(() => {
    if (cuadroSeleccionado !== null && frameSeleccionado) {
      const updated = [...cuadros];
      updated[cuadroSeleccionado] = frameSeleccionado;
      setCuadros(updated);
    }
  }, [frameSeleccionado]);

  // Genera PDF a partir de lo visible
  const handleGenerarPDF = () => {
    setCuadroSeleccionado(null);
    setTimeout(async () => {
      if (!containerRef.current) return;
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 20, 20, imgWidth, imgHeight);
      pdf.save("analisis.pdf");
    }, 500);
  };

  return (
    <div className={`w-full mt-4 ${className}`}>
      {/* Controles */}
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

      {/* Contenedor de previsualización + observaciones */}
      <div
        ref={containerRef}
        className="bg-white p-4 rounded-lg shadow-md"
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          color: "#1f2937", // gris oscuro
        }}
      >
        {/* Encabezado */}
        <div
          className="flex items-center justify-between mb-6"
          style={{
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: "10px",
          }}
        >
          {/* Logo o espacio reservado */}
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
            <img src={kinnx_logo} className="size-20" alt="Logo KinnX" />
          </div>

          {/* Título */}
          <div className="text-center flex-1">
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "4px",
                color: "#111827",
              }}
            >
              Consultorio Kinesiológico
            </h1>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "400",
                color: "#6b7280",
              }}
            >
              Análisis Postural y Funcional
            </h2>
          </div>

          {/* Espaciador derecho */}
          <div style={{ width: "80px" }}></div>
        </div>

        {/* Grid de imágenes */}
        <div
          className={`grid ${
            modo === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
          } gap-4`}
        >
          {cuadros.map((frame, idx) => (
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
                  marginBottom: "5px",
                  marginTop: "-5px",
                }}
              >
                {frame?.title || "Sin título"}
              </span>

              {frame ? (
                <FrameCanvas frame={frame} />
              ) : (
                <div
                  className="text-center"
                  style={{
                    color: "#9ca3af",
                    fontSize: "12px",
                  }}
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
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Escriba sus observaciones aquí..."
          />
        </div>
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

const FrameCanvas = ({ frame }: { frame: FrameData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calcularAngulo = (p1: any, p2: any, p3: any) => {
    // Vectores
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    // Producto punto y magnitudes
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    // Ángulo en grados
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

      // --- Dibuja líneas ---
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

      // --- Dibuja puntos ---
      ctx.fillStyle = "yellow";
      frame.points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * img.width, p.y * img.height, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- Calcula y dibuja ángulos ---
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      // Ejemplo: recorrer todos los tripletes conectados
      for (let i = 0; i < frame.points.length; i++) {
        // Busca todas las líneas que pasan por este punto
        const conexiones = frame.lines.filter(([a, b]) => a === i || b === i);

        // Si el punto conecta exactamente con 2 líneas, se puede calcular un ángulo
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
