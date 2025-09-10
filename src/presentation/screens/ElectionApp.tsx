import { Link } from "react-router-dom";

const ElectionApp = () => {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center w-full max-w-4xl mx-auto h-screen gap-4 p-4 bg-gray-50 overflow-x-auto">
      {[
        // { to: "/mediapipe", icon: "🖐️", label: "MediaPipe" },
        // { to: "/opencv", icon: "📷", label: "OpenCV" },
        // { to: "/opencvfromvideo", icon: "🎞️", label: "Open Video" },
        // { to: "/mano", icon: "✋", label: "Mano" },
        // { to: "/automaticassignment", icon: "⚙️", label: "Auto" },
        // { to: "/openserver", icon: "⚙️", label: "OpenServer" },
        { to: "/maratonv", icon: "👟", label: "Vertical" },
        { to: "/maratonh", icon: "👟", label: "Horizontal" },
      ].map(({ to, icon, label }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-6 py-3 rounded-lg shadow-sm transition w-full sm:w-auto justify-center"
        >
          <span className="text-2xl">{icon}</span>
          <span className="font-medium text-lg">{label}</span>
        </Link>
      ))}
    </div>
  );
};

export { ElectionApp };
