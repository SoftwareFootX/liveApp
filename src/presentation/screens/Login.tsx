import { useState } from "react";

import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";

import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { PiWhatsappLogoThin } from "react-icons/pi";
import { useAuthStore } from "../Store/useStore";

const Login = () => {
  const [form, setForm] = useState({ usu_username: "", usu_password: "" });
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = import.meta.env.VITE_API_SERVER;

  const login = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${apiUrl}/usuarios/login_usuario`,
        form
      );

      if (!response.data.error) {
        const { user, token } = response.data.body;

        if (user.usu_acceso_kinnx_liveapp.data[0] === 1) {
          const userData = {
            idtusuarios: user.idtusuarios,
            fk_consultorio: user.fk_consultorio,
            usu_nombre: user.usu_nombre,
            usu_apellido: user.usu_apellido,
            usu_username: user.usu_username,
            usu_email: user.usu_email,
            usu_telefono: user.usu_telefono,
            usu_celular: user.usu_celular,
            usu_acceso_kinnx_liveapp: user.usu_acceso_kinnx_liveapp.data[0],
          };

          navigate("/election");
          setAuth(userData, token);
        } else {
          return setMessageError(
            "No tiene acceso al contenido, comuniquese con soporte técnico"
          );
        }

        setMessageError("");
      }
    } catch (error) {
      const err = error as AxiosError;
      if (err.message === "Network Error") {
        // console.log("Servidor sin conexión: ", error);
        setMessageError("Servidor sin conexión");
        return;
      }
      if (err.status === 401) {
        setMessageError("Usuario y/o contraseña incorrecta");
        // console.log("Email y/o contraseña incorrecta: ", error);
        return;
      } else {
        setMessageError("Error inesperado, contacte con soporte");
        // console.log("ERROR AL INICIAR SESION: ", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-primary/10 px-4 py-10">
      {/* CONTENEDOR GLASS */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-white/25 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/30" />
        <div className="relative z-10 p-8 rounded-3xl text-gray-800 bg-primary/15">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-primary mb-8 tracking-wide">
            INICIAR SESIÓN
          </h1>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
          >
            {/* Nombre de usuario */}
            <div>
              <label className="block mb-2 text-primary font-medium">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={form.usu_username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, usu_username: e.target.value }))
                }
                className="w-full border border-white/50 bg-white/40 backdrop-blur-sm py-2 px-4 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block mb-2 text-primary font-medium">
                Contraseña
              </label>
              <div className="flex items-center border border-white/50 bg-white/40 backdrop-blur-sm rounded-full px-4 focus-within:ring-2 focus-within:ring-primary/60 focus-within:border-primary transition">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.usu_password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usu_password: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent py-2 text-gray-700 focus:outline-none"
                />
                <button
                  type="button"
                  className="text-primary text-xl flex items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                >
                  {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
            </div>

            {/* Error */}
            {messageError !== "" && (
              <div className="text-red-500 text-sm text-center bg-red-50/60 py-2 rounded-full">
                {messageError}
              </div>
            )}

            {/* Botón */}
            <div className="w-full flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-primary text-white py-2 rounded-full font-semibold text-lg hover:bg-primary/80 active:scale-[0.98] transition disabled:opacity-50 shadow-lg"
              >
                {loading ? "Cargando..." : "Iniciar sesión"}
              </button>
            </div>
          </form>

          {/* Soporte */}
          <a
            target="_blank"
            href="https://wa.me/+5493434529527"
            className="flex items-center gap-2 justify-center mt-6 text-primary hover:underline"
          >
            <PiWhatsappLogoThin className="text-xl" />
            Soporte técnico
          </a>
        </div>
      </div>
    </div>
  );
};

export { Login };
