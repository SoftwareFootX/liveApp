// AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { MediaPipe } from "../screens/MediaPipe";
import { ElectionApp } from "../screens/ElectionApp";
// import { OpenCV } from "../screens/OpenCV";
// import { OpenCVFromVideo } from "../screens/OpenCVFromVideo";
import { Mano } from "../screens/Mano";
// import { TaskVision } from "../screens/TaskVision";
// import { AutomaticAssignment } from "../screens/AutomaticAssignment";
// import { OpenServer } from "../screens/OpenServer";
import { MaratonHorizontal } from "../screens/MaratonHorizontal";
import { MaratonVertical } from "../screens/MaratonVertical";
import { Biomecanica } from "../screens/Biomecanica";
import { useAuthStore } from "../Store/useStore";
import { Login } from "../screens/Login";

const AppRoutes = () => {
  const { user } = useAuthStore();

  return (
    <>
      <Routes>
        {user?.usu_app_footx_administrador === 1 ? (
          <>
            <Route path="/election" element={<ElectionApp />} />
            <Route path="/mediapipe" element={<MediaPipe />} />
            <Route path="/biomecanica" element={<Biomecanica />} />
            <Route path="/mano" element={<Mano />} />
            <Route path="/maratonh" element={<MaratonHorizontal />} />
            <Route path="/maratonv" element={<MaratonVertical />} />
          </>
        ) : (
          <Route path="/login" element={<Login />} />
        )}
        {/* Rutas pública */}
        {/* <Route path="/opencv" element={<OpenCV />} />
        <Route path="/opencvfromvideo" element={<OpenCVFromVideo />} />
        <Route path="/taskvision" element={<TaskVision />} />
        <Route path="/automaticassignment" element={<AutomaticAssignment />} />
        <Route path="/openserver" element={<OpenServer />} /> */}

        {/* Rutas privada */}

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={user ? "/election" : "/login"} replace />}
        />
      </Routes>
    </>
  );
};

export { AppRoutes };
