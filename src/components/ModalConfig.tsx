interface Props {
  handleChange: (record: any, e: any) => void;
  config: {
    modelComplexity: number;
    smoothLandmarks: boolean;
    enableSegmentation: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
    open: boolean;
    sizeVideo: number;
    record: boolean;
  };
}

const ModalConfig = ({ handleChange, config }: Props) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
      <div className="bg-white p-3 rounded max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Configuración</h2>

        {/* Switches */}
        <div className="flex justify-between items-center mb-2">
          <label>Grabar</label>
          <input
            type="checkbox"
            checked={config.record}
            onChange={(e) => handleChange("record", e.target.checked)}
          />
        </div>

        <div className="flex justify-between items-center mb-2">
          <label>Smooth Landmarks</label>
          <input
            type="checkbox"
            checked={config.smoothLandmarks}
            onChange={(e) => handleChange("smoothLandmarks", e.target.checked)}
          />
        </div>

        <div className="flex justify-between items-center mb-2">
          <label>Enable Segmentation</label>
          <input
            type="checkbox"
            checked={config.enableSegmentation}
            onChange={(e) =>
              handleChange("enableSegmentation", e.target.checked)
            }
          />
        </div>

        {/* Números */}
        <div className="mb-2">
          <label>Model Complexity</label>
          <input
            type="number"
            value={config.modelComplexity}
            onChange={(e) =>
              handleChange("modelComplexity", Number(e.target.value))
            }
            className="border ml-2 px-1"
          />
        </div>

        <div className="mb-2">
          <label>Min Detection Confidence</label>
          <input
            type="number"
            step="0.1"
            value={config.minDetectionConfidence}
            onChange={(e) =>
              handleChange("minDetectionConfidence", Number(e.target.value))
            }
            className="border ml-2 px-1"
          />
        </div>

        <div className="mb-2">
          <label>Min Tracking Confidence</label>
          <input
            type="number"
            step="0.1"
            value={config.minTrackingConfidence}
            onChange={(e) =>
              handleChange("minTrackingConfidence", Number(e.target.value))
            }
            className="border ml-2 px-1"
          />
        </div>

        <div className="mb-2">
          <label>Video Size</label>
          <input
            type="number"
            value={config.sizeVideo}
            onChange={(e) => handleChange("sizeVideo", Number(e.target.value))}
            className="border ml-2 px-1"
          />
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-end mt-4">
          <button
            onClick={() => handleChange("open", false)}
            className="px-2 py-1 bg-red-500 text-white rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export { ModalConfig };
