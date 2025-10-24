import { useRef } from "react";
import { BsRecordCircle } from "react-icons/bs";
import { CiNoWaitingSign, CiTimer } from "react-icons/ci";
import { IoCameraReverseOutline } from "react-icons/io5";

interface Props {
  videoRef: any;
  canvasRef: any;
  lado: any;
  config: any;
  setConfig: any;
  setSegundos: any;
  segundos: any;
  realtimeAngles: any;
  recording: any;
  startRecording: any;
  recordingVideo: any;
  setFacingMode: (value: any) => void;
}

interface PropsCanvasVideo {
  data: Props;
}

const CanvasVideo = ({ data }: PropsCanvasVideo) => {
  const {
    setFacingMode,

    recordingVideo,
    realtimeAngles,
    startRecording,
    setSegundos,
    canvasRef,
    recording,
    setConfig,
    videoRef,
    segundos,
    config,
    lado,
  } = data;

  const containerRef = useRef<HTMLDivElement>(null);

  const liveMode = "w-92 md:w-full h-auto max-w-2xl";

  return (
    <div
      ref={containerRef}
      className={`relative ${liveMode} ${
        !recordingVideo ? "hidden" : ""
      } rounded-lg overflow-hidden shadow-lg border border-gray-200 mx-auto mt-5 sm:mt-0`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const container = containerRef.current;
          if (video && canvas && container) {
            // Igualar tamaño real del canvas al video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Ajustar contenedor al aspect ratio del video
            container.style.aspectRatio = (
              video.videoWidth / video.videoHeight
            ).toString();
          }
        }}
        className={`${liveMode} bg-black`}
      />
      <canvas ref={canvasRef} className={`absolute top-0 left-0 ${liveMode}`} />

      <div className="absolute top-2 left-2 bg-white/70 px-3 py-1 rounded text-sm font-medium text-gray-700 shadow-sm">
        {lado === "der" ? "Derecho" : "Izquierdo"}
      </div>

      {config ? (
        <div className="absolute top-2 right-2 bg-white/70 rounded text-sm p-2 cursor-pointer">
          <p className="font-medium mb-1">Segundos:</p>
          <ul className="flex gap-2">
            {[2, 3, 4, 5].map((s) => (
              <li
                key={s}
                onClick={() => {
                  setConfig(false);
                  setSegundos(s);
                }}
                className={`cursor-pointer px-2 py-1 rounded ${
                  segundos === s
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-200"
                }`}
              >
                {s}s
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <CiTimer
          onClick={() => setConfig(true)}
          className="absolute top-2 right-2 text-white text-2xl cursor-pointer hover:scale-120"
        />
      )}

      <div className="absolute bottom-1 left-1 bg-white p-1 rounded shadow text-xs opacity-70">
        {realtimeAngles.map((a: any) => (
          <div key={a.name}>
            {a.name}: {a.value.toFixed(0)}°
          </div>
        ))}
      </div>

      <button
        className={`absolute bottom-2 px-3 py-1 rounded-md text-3xl w-full flex items-center justify-center font-medium transition ${
          recording
            ? "text-gray-400 cursor-not-allowed"
            : "text-red-600 hover:text-red-700"
        } cursor-pointer hover:scale-120`}
        onClick={startRecording}
        disabled={recording}
      >
        {recording ? <CiNoWaitingSign /> : <BsRecordCircle />}
      </button>

      <button
        onClick={() =>
          setFacingMode((prev: any) =>
            prev === "user" ? "environment" : "user"
          )
        }
        className="absolute bottom-2 right-2 text-white text-2xl cursor-pointer hover:scale-120"
      >
        <IoCameraReverseOutline />
      </button>
    </div>
  );
};

export { CanvasVideo };
