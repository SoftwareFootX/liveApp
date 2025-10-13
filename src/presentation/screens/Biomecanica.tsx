import { useEffect, useState } from "react";

import { ProtocoloCiclismo } from "../../components/protocolo/ProtocoloCiclismo";
import { SaveSecuences } from "../../components/secuencias/SaveSecuences";
import { FrameView } from "../../components/secuencias/FrameView";
import { CanvasVideo } from "../../components/video/CanvasVideo";
import { usePoseView } from "../../hooks/usePoseView";

// ------------------ Interfaces ------------------
interface PosePoint {
  name: string;
  x: number;
  y: number;
}

interface FrameData {
  id: number;
  image: string;
  points: PosePoint[];
  lines: [number, number][];
  angles: { name: string; value: number; points: [number, number, number] }[];
}

// ------------------ Componente ------------------
const Biomecanica = () => {
  const {
    setCurrentFrameIndex,
    mediaPipePose,
    setRecording,
    setSegundos,
    setFrames,
    setLado,

    recordingStartRef,
    currentFrameIndex,
    realtimeAngles,
    frameIdRef,
    recording,
    canvasRef,
    videoRef,
    frames,
    segundos,
    lado,
  } = usePoseView();

  // ---------- Estado para secuencias ----------
  const [savedSequences, setSavedSequences] = useState<
    { title: string; frames: FrameData[]; currentFrameIndex: number }[]
  >([]);

  const [config, setConfig] = useState(false);
  const [frameSeleccionado, setFrameSeleccionado] = useState(null);
  const [recordingVideo, setRecordingVideo] = useState(true);

  // ---------- Guardar secuencia ----------
  const saveSequence = () => {
    if (frames.length === 0) return;

    const title = prompt(
      "Nombre de la secuencia:",
      `Secuencia ${savedSequences.length + 1}`
    );
    if (!title) return;

    setSavedSequences((prev) => [
      ...prev,
      { title, frames: [...frames], currentFrameIndex: 0 },
    ]);

    // Limpiar la secuencia actual
    setFrames([]);
    frameIdRef.current = 0;
    setCurrentFrameIndex(0);
  };

  useEffect(() => {
    const stop = mediaPipePose();
    return () => {
      stop?.();
    };
  }, [recording, lado]);

  // ------------------ Funciones ------------------
  const startRecording = () => {
    setFrames([]);
    frameIdRef.current = 0;
    recordingStartRef.current = null; // guardamos el timestamp del primer frame
    setRecording(true);
  };

  // ------------------ Render ------------------
  return (
    <div className="p-6 flex bg-gray-50 min-h-screen">
      <div className="w-1/3 flex justify-center items-center h-screen">
        {/* Encabezado */}
        <ProtocoloCiclismo
          data={{
            side: lado,
            setSide: setLado,
            frameSeleccionado,
          }}
        />
      </div>

      <div className="w-2/3 flex flex-col items-center justify-center">
        {(frames.length > 0 || savedSequences.length > 0) && (
          <div className="w-1/2 flex justify-between items-center mb-5">
            <button
              className={`border border-gray-600 rounded px-8 py-1 text-sm ${
                recordingVideo
                  ? "bg-gray-600 text-white"
                  : "bg-gray-200 text-black"
              }`}
              onClick={() => setRecordingVideo(true)}
            >
              GRABAR
            </button>
            <button
              className={`border border-gray-600 rounded px-8 py-1 text-sm ${
                recordingVideo
                  ? "bg-gray-200 text-black"
                  : "bg-gray-600 text-white"
              }`}
              onClick={() => setRecordingVideo(false)}
            >
              VER SECUENCIAS
            </button>
          </div>
        )}
        {/* Video en vivo */}
        <CanvasVideo
          data={{
            videoRef,
            canvasRef,
            lado,
            config,
            setConfig,
            setSegundos,
            segundos,
            realtimeAngles,
            recording,
            startRecording,
            recordingVideo,
          }}
        />

        {/* Visor de frames */}
        {frames.length > 0 && !recording && (
          <FrameView
            data={{
              frames,
              currentFrameIndex,
              setCurrentFrameIndex,
              setFrames,
              canvasRef,
            }}
          />
        )}

        {/* Fila 2 - Botones */}
        {frames.length > 35 && (
          <div className="flex justify-center gap-4 mt-2">
            <button
              className="px-3 py-1 rounded-md bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
              onClick={saveSequence}
            >
              💾 Guardar secuencia
            </button>
          </div>
        )}

        {!recordingVideo && (
          <SaveSecuences data={{ savedSequences, setFrameSeleccionado }} />
        )}
      </div>
    </div>
  );
};

export { Biomecanica };
