import React from "react";
import Plasma from "./Plasma";

const PlasmaBackground: React.FC = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Plasma
        color="#8b5cf6"
        speed={2}
        direction="forward"
        scale={2}
        opacity={0.3}
        mouseInteractive={false}
      />
    </div>
  );
};

export default PlasmaBackground;
