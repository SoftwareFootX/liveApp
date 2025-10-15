import { BsRecordCircle } from "react-icons/bs";
import { CiNoWaitingSign, CiTimer } from "react-icons/ci";

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
}

interface PropsCanvasVideo {
  data: Props;
}

const CanvasVideo = ({ data }: PropsCanvasVideo) => {
  const {
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
  } = data;

  return (
    <div
      className={`relative w-[340px] lg:w-[448px] rounded-lg overflow-hidden shadow-lg border border-gray-200 mx-auto ${
        recordingVideo ? "block" : "hidden"
      } mt-5 sm:mt-0`}
      style={{
        aspectRatio:
          videoRef.current?.videoWidth / videoRef.current?.videoHeight || 1.333,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas) {
            // ⚙️ Igualar dimensiones del canvas al video real
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
        }}
        className="w-full h-full object-contain bg-black"
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      <div className="absolute top-2 left-2 bg-white/70 px-3 py-1 rounded text-sm font-medium text-gray-700 shadow-sm">
        {lado === "der" ? "Derecho" : "Izquierdo"}
      </div>
      {config ? (
        <div className="absolute top-2 right-2 bg-white/70 rounded text-sm p-2">
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
          className="absolute top-2 right-2 text-white text-2xl"
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
        }`}
        onClick={startRecording}
        disabled={recording}
      >
        {recording ? <CiNoWaitingSign /> : <BsRecordCircle />}
      </button>
    </div>
  );
};

export { CanvasVideo };
