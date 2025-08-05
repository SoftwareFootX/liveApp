import { Link } from "react-router-dom";

const ElectionApp = () => {
  return (
    <div className="flex flex-col sm:flex-row w-full max-w-4xl mx-auto h-screen justify-center items-center gap-6 px-4 bg-gray-50">
      <Link
        to="/mediapipe"
        className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-6 py-3 rounded-lg shadow-sm transition w-full sm:w-auto justify-center"
      >
        <span className="text-2xl">🖐️</span>
        <span className="font-medium text-lg">MediaPipe</span>
      </Link>

      <Link
        to="/opencv"
        className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-6 py-3 rounded-lg shadow-sm transition w-full sm:w-auto justify-center"
      >
        <span className="text-2xl">📷</span>
        <span className="font-medium text-lg">OpenCV</span>
      </Link>

      <Link
        to="/opencvfromvideo"
        className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-6 py-3 rounded-lg shadow-sm transition w-full sm:w-auto justify-center"
      >
        <span className="text-2xl">🎞️</span>
        <span className="font-medium text-lg">Open Video</span>
      </Link>

      <Link
        to="/mano"
        className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-6 py-3 rounded-lg shadow-sm transition w-full sm:w-auto justify-center"
      >
        <span className="text-2xl">✋</span>
        <span className="font-medium text-lg">Mano</span>
      </Link>
    </div>
  );
};

export { ElectionApp };
