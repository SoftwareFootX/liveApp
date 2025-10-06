import { useState } from "react";
import { CiCircleChevLeft, CiCircleChevRight } from "react-icons/ci";
import { LiaHandPointLeft, LiaHandPointRight } from "react-icons/lia";

import {
  bici1_der,
  bici2_der,
  bici3_der,
  bici4_der,
  bici5_der,
  bici6_der,
  bici7_der,
  bici8_der,
  bici1_izq,
  bici2_izq,
  bici3_izq,
  bici4_izq,
  bici5_izq,
  bici6_izq,
  bici7_izq,
  bici8_izq,
} from "../../public";

const ProtocoloCiclismo = () => {
  const bikeImagesDer = [
    { src: bici1_der, title: "Avance inicial" },
    { src: bici2_der, title: "Avance medio" },
    { src: bici3_der, title: "Impulso inicial" },
    { src: bici4_der, title: "Impulso medio" },
    { src: bici5_der, title: "Arrastre inicial" },
    { src: bici6_der, title: "Arrastre medio" },
    { src: bici7_der, title: "Recobro inicial" },
    { src: bici8_der, title: "Recobro medio" },
  ];

  const bikeImagesIzq = [
    { src: bici1_izq, title: "Avance inicial" },
    { src: bici2_izq, title: "Avance medio" },
    { src: bici3_izq, title: "Impulso inicial" },
    { src: bici4_izq, title: "Impulso medio" },
    { src: bici5_izq, title: "Arrastre inicial" },
    { src: bici6_izq, title: "Arrastre medio" },
    { src: bici7_izq, title: "Recobro inicial" },
    { src: bici8_izq, title: "Recobro medio" },
  ];

  // 🔹 Estado para índice actual
  const [currentIndex, setCurrentIndex] = useState(0);
  // 🔹 Estado para lado activo ("der" o "izq")
  const [side, setSide] = useState<"der" | "izq">("der");

  const bikeImages = side === "der" ? bikeImagesDer : bikeImagesIzq;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? bikeImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === bikeImages.length - 1 ? 0 : prev + 1));
  };

  const handleSideChange = (newSide: "der" | "izq") => {
    setSide(newSide);
    setCurrentIndex(0); // opcional: volver a la primera imagen al cambiar de lado
  };

  const current = bikeImages[currentIndex];

  return (
    <div className="w-80">
      {/* 🔹 Botones para elegir lado */}
      <div className="flex justify-around items-center p-2 text-gray-700 gap-2">
        <button
          className={`border rounded w-40 flex justify-center items-center py-1 ${
            side === "izq" ? "border-blue-600 bg-blue-100" : "border-gray-700"
          }`}
          onClick={() => handleSideChange("izq")}
        >
          <LiaHandPointLeft size={20} />
        </button>

        <button
          className={`border rounded w-40 flex justify-center items-center py-1 ${
            side === "der" ? "border-blue-600 bg-blue-100" : "border-gray-700"
          }`}
          onClick={() => handleSideChange("der")}
        >
          <LiaHandPointRight size={20} />
        </button>
      </div>

      {/* 🔹 Navegación entre imágenes */}
      <div className="flex justify-around items-center p-2 text-gray-700">
        <button onClick={handlePrev}>
          <CiCircleChevLeft size={30} />
        </button>

        <span className="border border-gray-700 rounded w-40 flex justify-center items-center">
          {current.title}
        </span>

        <button onClick={handleNext}>
          <CiCircleChevRight size={30} />
        </button>
      </div>

      {/* 🔹 Imagen actual */}
      <img
        src={current.src}
        alt="bici"
        className="w-full rounded-xl shadow-md"
      />

      {/* 🔹 Indicador opcional */}
      <div className="text-center text-gray-500 mt-2">
        {/* {currentIndex + 1} / {bikeImages.length} —{" "}
        {side === "der" ? "Derecha" : "Izquierda"} */}
        Puntos: Mano, codo, hombro, cadera, rodilla, tobillo, punta del pie.
      </div>
      <div className="text-center text-gray-500 mt-2">
        {/* {currentIndex + 1} / {bikeImages.length} —{" "}
        {side === "der" ? "Derecha" : "Izquierda"} */}
        Angulos: Codo, cadera, rodilla, tobillo.
      </div>
    </div>
  );
};

export { ProtocoloCiclismo };
