import React, { useRef, useState, useEffect } from "react";

// Tipado para punto
interface Point {
  x: number;
  y: number;
}

const AutomaticAssignment: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [clickPoints, setClickPoints] = useState<Point[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<ImageData[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Cargar imagen seleccionada
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Click para marcar puntos manualmente
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAutoMode || !canvasRef.current || !imgRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...clickPoints, { x, y }];
    setClickPoints(newPoints);

    if (newPoints.length === 4) {
      // Guardar templates (parches alrededor de los puntos)
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const patches = newPoints.map((pt) =>
        ctx.getImageData(pt.x - 10, pt.y - 10, 20, 20)
      );
      setSavedTemplates(patches);
    }
  };

  // Dibuja puntos y líneas
  const draw = (points: Point[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = imgRef.current;
    if (!img) return;

    canvas.width = 300;
    canvas.height = (img.naturalHeight / img.naturalWidth) * 300;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "lime";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;

    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    });

    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    }

    if (points.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(points[2].x, points[2].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.stroke();
    }
  };

  // Matching automático
  const runTemplateMatching = () => {
    if (!imageSrc || savedTemplates.length !== 4) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const newPoints: Point[] = [];

    savedTemplates.forEach((template) => {
      const tplCanvas = document.createElement("canvas");
      tplCanvas.width = template.width;
      tplCanvas.height = template.height;
      const tplCtx = tplCanvas.getContext("2d")!;
      tplCtx.putImageData(template, 0, 0);

      const tplData = tplCtx.getImageData(
        0,
        0,
        tplCanvas.width,
        tplCanvas.height
      );
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let bestMatch = { x: 0, y: 0 };
      let minDiff = Infinity;

      for (let y = 0; y < canvas.height - tplCanvas.height; y++) {
        for (let x = 0; x < canvas.width - tplCanvas.width; x++) {
          let diff = 0;

          for (let j = 0; j < tplCanvas.height; j++) {
            for (let i = 0; i < tplCanvas.width; i++) {
              const tplIdx = (j * tplCanvas.width + i) * 4;
              const imgIdx = ((y + j) * canvas.width + (x + i)) * 4;

              for (let k = 0; k < 3; k++) {
                diff += Math.abs(
                  tplData.data[tplIdx + k] - imgData.data[imgIdx + k]
                );
              }
            }
          }

          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = {
              x: x + tplCanvas.width / 2,
              y: y + tplCanvas.height / 2,
            };
          }
        }
      }

      newPoints.push(bestMatch);
    });

    setClickPoints(newPoints);
    setIsAutoMode(true);
  };

  // Redibujar cada vez que se actualizan los puntos o la imagen
  useEffect(() => {
    if (imageSrc && imgRef.current?.complete) {
      draw(clickPoints);
    }
  }, [clickPoints, imageSrc]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Automatic Assignment</h2>

      <input type="file" accept="image/*" onChange={handleImageUpload} />

      {imageSrc && (
        <div className="relative mt-4">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="border shadow rounded-md cursor-crosshair"
          />
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Uploaded"
            style={{ display: "none" }}
            onLoad={() => draw(clickPoints)}
          />
        </div>
      )}

      {clickPoints.length === 4 && !isAutoMode && (
        <button
          onClick={runTemplateMatching}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Subir nueva imagen y asignar automáticamente
        </button>
      )}
    </div>
  );
};

export { AutomaticAssignment };
