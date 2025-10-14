import { Link } from "react-router-dom";
import { IoExitOutline } from "react-icons/io5";
import { useAuthStore } from "../Store/useStore";
import { useNavigate } from "react-router-dom";

const ElectionApp = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center w-full max-w-4xl mx-auto h-screen gap-4 p-4 bg-gray-50 overflow-x-auto">
      <button
        onClick={() => {
          logout();
          navigate("/election");
        }}
        className="absolute text-3xl top-5 right-5 text-primary"
      >
        <IoExitOutline />
      </button>
      {[
        { to: "/mediapipe", icon: "🧍🏻‍♂️", label: "MediaPipe" },
        // { to: "/opencv", icon: "📷", label: "OpenCV" },
        // { to: "/opencvfromvideo", icon: "🎞️", label: "Open Video" },
        { to: "/mano", icon: "✋", label: "Mano" },
        // { to: "/automaticassignment", icon: "⚙️", label: "Auto" },
        // { to: "/openserver", icon: "⚙️", label: "OpenServer" },
        { to: "/maratonv", icon: "👟", label: "Vertical" },
        { to: "/maratonh", icon: "👟", label: "Horizontal" },
        { to: "/biomecanica", icon: "🚴🏼‍♂️", label: "KinnX" },
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
