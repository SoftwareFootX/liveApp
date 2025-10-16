import { useEffect, useState } from "react";

import { ProtocoloCiclismo } from "../../components/protocolo/ProtocoloCiclismo";
import { SaveSecuences } from "../../components/secuencias/SaveSecuences";
import { FrameView } from "../../components/secuencias/FrameView";
import { CanvasVideo } from "../../components/video/CanvasVideo";
import { usePoseView } from "../../hooks/usePoseView";
import { IoArrowBack } from "react-icons/io5";
import { Link } from "react-router-dom";

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
    setUsingUploadedVideo,
    setCurrentFrameIndex,
    handleVideoUpload,
    mediaPipePose,
    setRecording,
    setVideoURL,
    setSegundos,
    setFrames,
    setLado,

    usingUploadedVideo,
    recordingStartRef,
    currentFrameIndex,
    realtimeAngles,
    frameIdRef,
    recording,
    canvasRef,
    videoRef,
    videoURL,
    segundos,
    frames,
    lado,
  } = usePoseView();

  // ---------- Estado para secuencias ----------
  const [savedSequences, setSavedSequences] = useState<
    {
      title: string;
      frames: FrameData[];
      currentFrameIndex: number;
      etapa?: string;
    }[]
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
  }, [recording, lado, usingUploadedVideo]);

  // ------------------ Funciones ------------------
  const startRecording = () => {
    setFrames([]);
    frameIdRef.current = 0;
    recordingStartRef.current = null; // guardamos el timestamp del primer frame
    setRecording(true);
  };

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.src = videoURL;
      videoRef.current.controls = true;
      videoRef.current.muted = false;
      videoRef.current.loop = true;
      videoRef.current.play();
    }
  }, [videoURL]);

  const handleImportSequences = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);

        setSavedSequences((prev) => [...prev, ...imported]);
        console.log("✅ Se cargaron las secuencias:", imported);
      } catch (err) {
        console.error("❌ Error al leer el archivo JSON:", err);
        alert("Archivo inválido");
      }
    };
    reader.readAsText(file);
  };

  // ------------------ Render ------------------
  return (
    <div className="p-0 sm:p-2 lg:p-6 flex bg-gray-50 sm:min-h-screen flex-col sm:flex-row justify-between w-screen">
      <Link
        to="/election"
        className="absolute h-10 w-10 text-3xl top-5 right-5 text-primary"
      >
        <IoArrowBack />
      </Link>
      <div className="w-screen sm:w-2/5 flex justify-center items-center h-auto">
        {/* Encabezado */}
        <ProtocoloCiclismo
          data={{
            side: lado,
            setSide: setLado,
            frameSeleccionado,
          }}
        />
      </div>

      <div className="w-screen sm:w-3/5 flex flex-col items-center justify-center mt-5 sm:mt-0">
        {savedSequences.length > 0 && (
          <div className="flex items-center mb-3 sm:mb-5 gap-2 text-xs">
            <button
              className={`border border-gray-300 rounded-full px-2 py-1 ${
                recordingVideo
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-black"
              } hover:scale-105 cursor-pointer`}
              onClick={() => setRecordingVideo(true)}
            >
              GRABAR
            </button>
            <button
              className={`border border-gray-300 rounded-full px-2 py-1 ${
                recordingVideo
                  ? "bg-gray-200 text-black"
                  : "bg-primary text-white"
              } hover:scale-105 cursor-pointer`}
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

        {recordingVideo && (
          <div className="flex flex-col sm:flex-row justify-center items-center max-w-lg w-full mt-4 mb-4 sm:mb-0 text-xs gap-2">
            <label className="bg-primary hover:bg-primary-opacity text-white px-4 py-1 rounded-full cursor-pointer hover:scale-105">
              🎥 CARGAR VIDEO
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
            <button
              className="bg-primary hover:bg-primary-opacity text-white px-4 py-1 rounded-full cursor-pointer hover:scale-105"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.src = "";
                  videoRef.current.srcObject = null;
                }
                setUsingUploadedVideo(false);
                setVideoURL(null);
              }}
            >
              ⏺️ VIDEO EN VIVO
            </button>
            <label className="bg-primary hover:bg-primary-opacity  text-white px-4 py-1 rounded-full cursor-pointer hover:scale-105">
              📂 IMPORTAR SECUENCIAS
              <input
                type="file"
                accept=".json"
                onChange={handleImportSequences}
                className="hidden"
              />
            </label>
          </div>
        )}

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
        {frames.length > 10 && (
          <div className="flex justify-center gap-4 mt-2 mb-2 sm:mb-0">
            <button
              className="px-3 py-1 rounded-full text-xs bg-primary text-white font-medium shadow hover:bg-primary-opacity transition hover:scale-105"
              onClick={saveSequence}
            >
              💾 GUARDAR SECUENCIA
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
