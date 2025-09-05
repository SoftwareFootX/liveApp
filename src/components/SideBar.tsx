import { type ReactNode } from "react";
import { CiHome } from "react-icons/ci";
import { LiaRunningSolid } from "react-icons/lia";
import { SiGoogleanalytics } from "react-icons/si";
import { FiTool } from "react-icons/fi";
import { FaPlay, FaStop } from "react-icons/fa";
import { IoBody, IoHandLeft, IoHandRight } from "react-icons/io5";

import type { Tab } from "../types/types";

const tabs: { key: Tab; icon: ReactNode; size?: number }[] = [
  { key: "home", icon: <CiHome size={35} /> },
  { key: "walk", icon: <LiaRunningSolid size={35} /> },
  { key: "stadistics", icon: <SiGoogleanalytics size={27} /> },
  { key: "config", icon: <FiTool size={27} /> },
  { key: "play", icon: <FaPlay size={25} /> },
  { key: "stop", icon: <FaStop size={25} /> },
  { key: "body", icon: <IoBody size={25} /> },
  { key: "left", icon: <IoHandLeft size={25} /> },
  { key: "right", icon: <IoHandRight size={25} /> },
];
interface Props {
  selected: string;
  setSelected: (value: Tab) => void;
}

const SideBar = ({ selected, setSelected }: Props) => {
  return (
    <div className="bg-secundary w-14 rounded-2xl m-2 flex flex-col items-center py-3 gap-4">
      {tabs.map(({ key, icon }) => (
        <div key={key}>
          <button
            onClick={() => setSelected(key)}
            className={`flex justify-center items-center group relative ${
              key === "play" && selected === "play"
                ? "opacity-10"
                : "opacity-100"
            }`}
          >
            {/* Barra indicadora */}
            <span
              className={`absolute left-0 top-0 bg-primary transition-all duration-300 ${
                selected === key ? "w-2 h-2 opacity-100" : "w-0 h-0 opacity-0"
              } rounded-2xl`}
            />
            {/* Ícono */}
            <span
              className={`text-slate-50 transition-opacity duration-200 ${
                selected === key ? "opacity-100" : "group-hover:opacity-40"
              }`}
            >
              {icon}
            </span>
          </button>
          <span className="w-8 h-[1px] mt-2 rounded-xl bg-terciary flex" />
        </div>
      ))}
    </div>
  );
};

export { SideBar };
