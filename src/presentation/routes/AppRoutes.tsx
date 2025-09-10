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

const AppRoutes = () => {
  return (
    <>
      <Routes>
        {/* Rutas pública */}
        <Route path="/election" element={<ElectionApp />} />
        <Route path="/mediapipe" element={<MediaPipe />} />
        <Route path="/mano" element={<Mano />} />
        {/* <Route path="/opencv" element={<OpenCV />} />
        <Route path="/opencvfromvideo" element={<OpenCVFromVideo />} />
        <Route path="/taskvision" element={<TaskVision />} />
        <Route path="/automaticassignment" element={<AutomaticAssignment />} />
        <Route path="/openserver" element={<OpenServer />} /> */}
        <Route path="/maratonh" element={<MaratonHorizontal />} />
        <Route path="/maratonv" element={<MaratonVertical />} />

        {/* Rutas privada */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/election" replace />} />
      </Routes>
    </>
  );
};

export { AppRoutes };
