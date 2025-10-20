import { Link } from "react-router-dom";
import { IoExitOutline } from "react-icons/io5";
import { useAuthStore } from "../Store/useStore";
import { useNavigate } from "react-router-dom";
import { logo_stabilar } from "../../../public";

const ElectionApp = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-100 to-gray-200">
      {/* Botón de Logout */}
      <button
        onClick={() => {
          logout();
          navigate("/election");
        }}
        className="absolute top-5 right-5 text-primary text-3xl hover:scale-110 transition-transform"
      >
        <IoExitOutline />
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Selecciona una opción
      </h1>

      <div className="flex flex-wrap justify-center gap-6">
        {[
          { to: "/mediapipe", icon: "🧍🏻‍♂️", label: "MediaPipe" },
          { to: "/mano", icon: "✋", label: "Mano" },
          { to: "/maratonv", icon: "👟", label: "Vertical" },
          { to: "/maratonh", icon: "👟", label: "Horizontal" },
          { to: "/biomecanica", icon: "🚴🏼‍♂️", label: "KinnX" },
          {
            to: "/stabilar",
            icon: logo_stabilar,
            label: "Stabilar",
            isImage: true,
          },
        ].map(({ to, icon, label, isImage }) => (
          <Link
            key={to}
            to={to}
            className="relative w-48 h-48 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl
                   bg-white/30 backdrop-blur-md border border-white/30 shadow-lg
                   hover:bg-white/50 hover:scale-105 transition-all duration-300"
          >
            {isImage ? (
              <img
                src={icon}
                alt={label}
                className="w-12 h-12 object-contain"
              />
            ) : (
              <span className="text-4xl">{icon}</span>
            )}
            <span className="text-lg font-semibold text-gray-800">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export { ElectionApp };
