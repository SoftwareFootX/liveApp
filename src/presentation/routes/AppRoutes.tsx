// AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { MediaPipe } from "../screens/MediaPipe";
import { ElectionApp } from "../screens/ElectionApp";
// import { OpenCV } from "../screens/OpenCV";
// import { OpenCVFromVideo } from "../screens/OpenCVFromVideo";
// import { Mano } from "../screens/Mano";
// import { TaskVision } from "../screens/TaskVision";
// import { AutomaticAssignment } from "../screens/AutomaticAssignment";
// import { OpenServer } from "../screens/OpenServer";
import { Maraton } from "../screens/Maraton";

const AppRoutes = () => {
  return (
    <>
      <Routes>
        {/* Rutas pública */}
        <Route path="/election" element={<ElectionApp />} />
        <Route path="/mediapipe" element={<MediaPipe />} />
        {/* <Route path="/opencv" element={<OpenCV />} />
        <Route path="/opencvfromvideo" element={<OpenCVFromVideo />} />
        <Route path="/mano" element={<Mano />} />
        <Route path="/taskvision" element={<TaskVision />} />
        <Route path="/automaticassignment" element={<AutomaticAssignment />} />
        <Route path="/openserver" element={<OpenServer />} /> */}
        <Route path="/maraton" element={<Maraton />} />

        {/* Rutas privada */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/election" replace />} />
      </Routes>
    </>
  );
};

export { AppRoutes };
