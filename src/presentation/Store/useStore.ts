import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Definir los tipos del estado y las acciones
interface Store {
  theme: boolean; // El estado 'theme' es un booleano
  setTheme: (newTheme: boolean) => void; // Acción que acepta un booleano para actualizar 'theme'
}

interface User {
  idtusuarios: number;
  fk_consultorio: number;
  usu_nombre: string;
  usu_apellido: string;
  usu_username: string;
  usu_email: string;
  usu_telefono: string;
  usu_celular: string;
  usu_acceso_kinnx_liveapp: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

// Crear el store usando Zustand con el tipo definido
const useStore = create<Store>((set) => ({
  theme: false, // valor inicial del tema (false para un tema claro, por ejemplo)
  setTheme: (newTheme: boolean) => set({ theme: newTheme }),
}));

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),

      // ✅ Actualiza solo lo que le pases, sin pisar todo el user
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export { useStore, useAuthStore };
