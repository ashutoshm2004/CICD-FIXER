"use client";

import { motion } from "framer-motion";

export default function ParticlesBackground() {

  return (

    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">

      {[...Array(40)].map((_, i) => (

        <motion.div
          key={i}
          className="absolute rounded-full bg-orange-500/20"

          initial={{
            opacity: 0.2,
            scale: 0.8,
            x: Math.random() * 2000,
            y: Math.random() * 1200,
          }}

          animate={{
            opacity: [0.15, 0.4, 0.15],
            y: [0, -40, 0],
            x: [0, 20, 0],
          }}

          transition={{
            duration: 6 + Math.random() * 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}

          style={{
            width: `${4 + Math.random() * 10}px`,
            height: `${4 + Math.random() * 10}px`,
          }}
        />
      ))}
    </div>
  );
}