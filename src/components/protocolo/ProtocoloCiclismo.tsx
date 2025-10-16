import { useState } from "react";
import { GoArrowLeft, GoArrowRight } from "react-icons/go";

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
  icono_bici_der,
  icono_bici_izq,
} from "../../../public";
import { PdfPreview } from "./PdfPreview";

interface PropsProtocolo {
  side: string;
  setSide: (value: any) => void;
  frameSeleccionado: any;
}

interface Props {
  data: PropsProtocolo;
}

const bikeImagesDer = [
  { src: bici1_der, title: "AVANCE INICIAL" },
  { src: bici2_der, title: "AVANCE MEDIO" },
  { src: bici3_der, title: "IMPULSO INICIAL" },
  { src: bici4_der, title: "IMPULSO MEDIO" },
  { src: bici5_der, title: "ARRASTRE INICIAL" },
  { src: bici6_der, title: "ARRASTRE MEDIO" },
  { src: bici7_der, title: "RECOBRO INICIAL" },
  { src: bici8_der, title: "RECOBRO MEDIO" },
];

const bikeImagesIzq = [
  { src: bici1_izq, title: "AVANCE INICIAL" },
  { src: bici2_izq, title: "AVANCE MEDIO" },
  { src: bici3_izq, title: "IMPULSO INICIAL" },
  { src: bici4_izq, title: "IMPULSO MEDIO" },
  { src: bici5_izq, title: "ARRASTRE INICIAL" },
  { src: bici6_izq, title: "ARRASTRE MEDIO" },
  { src: bici7_izq, title: "RECOBRO INICIAL" },
  { src: bici8_izq, title: "RECOBRO MEDIO" },
];

const ProtocoloCiclismo = ({ data }: Props) => {
  const { side, setSide, frameSeleccionado } = data;
  const [protocolo, setProtocolo] = useState(true);

  // 🔹 Estado para índice actual
  const [currentIndex, setCurrentIndex] = useState(0);
  // 🔹 Estado para lado activo ("der" o "izq")

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
    <div className="sm:w-full w-84 flex flex-col justify-center items-center mt-5 sm:mt-0 text-xs">
      {/* 🔹 Navegación protocolo o previsualizacion */}
      <div className="flex justify-between items-center gap-10 text-xs">
        <button
          className={`border border-gray-300 rounded-full px-2 py-1 ${
            protocolo ? "bg-primary text-white" : "bg-gray-200 text-black"
          } hover:scale-105 cursor-pointer`}
          onClick={() => setProtocolo(true)}
        >
          PROTOCOLO
        </button>
        <button
          className={`border border-gray-300 rounded-full px-2 py-1 ${
            protocolo ? "bg-gray-200 text-black" : "bg-primary text-white"
          } hover:scale-105 cursor-pointer`}
          onClick={() => setProtocolo(false)}
        >
          PREVISUALIZAR
        </button>
      </div>
      {protocolo && (
        <div className="flex flex-col items-center">
          {/* 🔹 Navegación entre imágenes */}
          <div className="flex justify-around items-center p-2 text-gray-600 gap-2">
            <button
              className={`border rounded-full flex justify-center items-center px-2 py-1 ${
                side === "izq"
                  ? "border-primary bg-primary-opacity"
                  : "border-gray-600"
              } hover:scale-105 cursor-pointer`}
              onClick={() => handleSideChange("izq")}
            >
              <img src={icono_bici_izq} className="w-[18px]" />
            </button>
            <button
              className="border-gray-600 border hover:bg-primary-opacity rounded-full hover:scale-105 cursor-pointer px-2 py-1"
              onClick={handlePrev}
            >
              <GoArrowLeft size={16} />
            </button>

            <span className="border border-gray-600 rounded-full w-40 flex justify-center items-center px-2 py-1 ">
              {current.title}
            </span>

            <button
              className="border-gray-600 border hover:bg-primary-opacity rounded-full hover:scale-105 cursor-pointer px-2 py-1"
              onClick={handleNext}
            >
              <GoArrowRight size={16} />
            </button>
            <button
              className={`border rounded-full flex justify-center items-center px-2 py-1 ${
                side === "der"
                  ? "border-primary bg-primary-opacity"
                  : "border-gray-600"
              } hover:scale-105 cursor-pointer`}
              onClick={() => handleSideChange("der")}
            >
              <img src={icono_bici_der} className="w-[18px]" />
            </button>
          </div>

          {/* 🔹 Imagen actual */}
          <img
            src={current.src}
            alt="bici"
            className="w-60 lg:w-72 2xl:w-84  rounded-xl shadow-md"
          />

          {/* 🔹 Indicador opcional */}
          <div className="text-center text-gray-600 mt-2 text-sm">
            Puntos: Mano, codo, hombro, cadera, rodilla, tobillo, punta del pie.
          </div>
          <div className="text-center text-gray-600 mt-2 text-sm">
            Angulos: Codo, cadera, rodilla, tobillo.
          </div>
        </div>
      )}

      <PdfPreview
        frameSeleccionado={frameSeleccionado}
        className={`${protocolo ? "hidden" : "block"}`}
      />
    </div>
  );
};

export { ProtocoloCiclismo };
