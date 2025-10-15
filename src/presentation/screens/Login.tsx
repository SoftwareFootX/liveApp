import { useState } from "react";

import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { useAuthStore } from "../Store/useStore";
import { PiWhatsappLogoThin } from "react-icons/pi";

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

        if (user.usu_app_footx_administrador.data[0] === 1) {
          const userData = {
            idtusuarios: user.idtusuarios,
            fk_consultorio: user.fk_consultorio,
            usu_nombre: user.usu_nombre,
            usu_apellido: user.usu_apellido,
            usu_username: user.usu_username,
            usu_email: user.usu_email,
            usu_telefono: user.usu_telefono,
            usu_celular: user.usu_celular,
            usu_app_footx_administrador:
              user.usu_app_footx_administrador.data[0],
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
        setMessageError("Email y/o contraseña incorrecta");
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-xl md:text-2xl font-bold text-center text-primary mb-8">
          INICIAR SESIÓN
        </h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <div>
            <label className="block mb-1 text-primary font-medium">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={form.usu_username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, usu_username: e.target.value }))
              }
              className="w-full border border-gray-300 py-1 px-2 rounded text-gray-700 focus:outline-none focus:ring focus:border-primary"
            />
          </div>

          <label className="block mb-1 text-primary font-medium">
            Contraseña
          </label>
          <div className="w-full py-1 px-2 text-gray-700 border border-gray-300 rounded mb-4 focus:outline-none focus:ring focus:border-red-500 flex justify-between items-center">
            <input
              type={showPassword ? "text" : "password"}
              value={form.usu_password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, usu_password: e.target.value }))
              }
              className=" w-full"
            />
            <button
              type="button"
              className="px-3"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword(!showPassword);
              }}
            >
              {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>

          {messageError !== "" && (
            <div className="text-red-600 text-sm text-center">
              {messageError}
            </div>
          )}
          <div className="w-full flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-2/3  bg-primary text-white py-1 rounded font-semibold hover:bg-primary-opacity transition disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Iniciar sesión"}
            </button>
          </div>
        </form>
        <a
          target="_blank"
          href="https://wa.me/+5493434529527"
          className="flex items-center gap-2 hover:underline  justify-center mt-4 text-primary"
        >
          <PiWhatsappLogoThin className="text-primary text-xl" />
          Soporte técnico
        </a>
      </div>
    </div>
  );
};

export { Login };
