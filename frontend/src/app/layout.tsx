import type { Metadata } from "next";

import "./globals.css";

import {
  Bebas_Neue,
  Inter,
} from "next/font/google";

import {
  Activity,
  ArrowUpRight,
  Radar,
} from "lucide-react";

// import ParticlesBackground from "@/components/ParticlesBackground";
// import CommandPalette from "@/components/CommandPalette";
// import PageTransition from "@/components/PageTransition";

/* ================================================= */
/* FONTS */
/* ================================================= */

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

/* ================================================= */
/* META */
/* ================================================= */

export const metadata: Metadata = {
  title: "ARGUS",
  description:
    "Autonomous AI Deployment Recovery Engine",
};

/* ================================================= */
/* LAYOUT */
/* ================================================= */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <html
      lang="en"
      className={`
        ${bebas.variable}
        ${inter.variable}
        dark
      `}
    >

      <body
        className="
          bg-[#020202]
          text-white
          overflow-x-hidden
          antialiased
        "
      >

                    {/* ================================================= */}
            {/* PREMIUM CINEMATIC BACKGROUND */}
            {/* ================================================= */}

            {/* matte black base */}
            <div className="fixed inset-0 bg-[#050505] pointer-events-none" />

            {/* cinematic background image */}
           <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: "url('/bg-cinematic.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: 0.14,
              filter: "blur(2px)",
              transform: "scale(1.05)",
            }}
          />

            {/* dark overlay */}
            <div className="fixed inset-0 bg-black/82 pointer-events-none" />

            {/* subtle top glow */}
            <div
              className="
                fixed
                top-[-260px]
                left-[-220px]
                w-[700px]
                h-[700px]
                rounded-full
                bg-orange-500/[0.05]
                blur-[180px]
                pointer-events-none
              "
            />

            {/* subtle bottom glow */}
            <div
              className="
                fixed
                bottom-[-280px]
                right-[-220px]
                w-[700px]
                h-[700px]
                rounded-full
                bg-red-500/[0.04]
                blur-[220px]
                pointer-events-none
              "
            />

            {/* premium grid */}
            <div
              className="
                fixed inset-0
                cyber-grid
                opacity-[0.12]
                pointer-events-none
              "
            />

            {/* premium noise */}
            <div
              className="
                fixed inset-0
                noise-overlay
                opacity-[0.018]
                pointer-events-none
              "
            />

        {/* ================================================= */}
        {/* NAVBAR */}
        {/* ================================================= */}

        <header
          className="
            sticky top-0 z-50
            px-4 lg:px-8
            pt-4
          "
        >

          <div
            className="
              max-w-[1700px]
              mx-auto
              rounded-[28px]
              border border-white/[0.06]
              bg-black/35
              backdrop-blur-2xl
              shadow-[0_20px_80px_rgba(0,0,0,0.55)]
            "
          >

            <div
              className="
                h-[78px]
                px-6 lg:px-8
                flex items-center justify-between
              "
            >

              {/* LEFT */}
              <a
                href="/"
                className="
                  flex items-center gap-5
                  group
                "
              >

                {/* LOGO */}
                <div
                  className="
                    relative
                    w-12 h-12
                    rounded-2xl
                    border border-orange-500/20
                    bg-orange-500/10
                    flex items-center justify-center
                    shadow-[0_0_40px_rgba(255,120,40,0.18)]
                  "
                >

                  <div
                    className="
                      absolute inset-0
                      rounded-2xl
                      bg-orange-500/10
                      animate-pulse
                    "
                  />

                  <Radar
                    size={20}
                    className="
                      relative z-10
                      text-orange-300
                    "
                  />

                </div>

                {/* TEXT */}
                <div>

                  <h1
                    className="
                      text-[26px]
                      tracking-[0.32em]
                      font-black
                      uppercase
                      leading-none
                      text-white
                    "
                  >
                    ARGUS
                  </h1>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      uppercase
                      tracking-[0.34em]
                      text-zinc-600
                    "
                  >
                    Autonomous Recovery Engine
                  </p>

                </div>
              </a>

              {/* CENTER NAV */}
              <nav
                className="
                  hidden md:flex
                  items-center gap-2
                  rounded-full
                  border border-white/[0.05]
                  bg-white/[0.02]
                  p-1.5
                "
              >

                {[
                  [
                    "Dashboard",
                    "/",
                  ],

                  [
                    "Workflows",
                    "/workflows",
                  ],

                  [
                    "Simulation",
                    "/demo",
                  ],
                ].map(
                  ([label, href]) => (

                    <a
                      key={label}
                      href={href}
                      className="
                        relative
                        px-5 py-2.5
                        rounded-full
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.22em]
                        text-zinc-400
                        transition-all duration-300
                        hover:text-white
                        hover:bg-white/[0.04]
                      "
                    >
                      {label}
                    </a>
                  )
                )}
              </nav>

              {/* RIGHT */}
              <div className="flex items-center gap-4">

                {/* STATUS */}
                <div
                  className="
                    hidden lg:flex
                    items-center gap-3
                    rounded-full
                    border border-emerald-400/15
                    bg-emerald-400/10
                    px-5 py-2.5
                  "
                >

                  <div className="relative">

                    <div
                      className="
                        absolute inset-0
                        rounded-full
                        bg-emerald-400
                        blur-md
                        opacity-50
                      "
                    />

                    <div
                      className="
                        relative
                        w-2 h-2
                        rounded-full
                        bg-emerald-400
                        animate-pulse
                      "
                    />

                  </div>

                  <span
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.22em]
                      font-semibold
                      text-emerald-300
                    "
                  >
                    System Active
                  </span>

                </div>

                {/* CTA */}
                <a
                  href="/demo"
                  className="
                    group
                    relative overflow-hidden
                    rounded-full
                    border border-orange-500/20
                    bg-orange-500/10
                    px-6 py-3
                    transition-all duration-300
                    hover:border-orange-500/40
                    hover:shadow-[0_0_60px_rgba(255,120,40,0.28)]
                  "
                >

                  {/* hover bg */}
                  <div
                    className="
                      absolute inset-0
                      translate-y-full
                      bg-gradient-to-r
                      from-orange-500
                      via-red-500
                      to-orange-400
                      transition-transform duration-300
                      group-hover:translate-y-0
                    "
                  />

                  <div
                    className="
                      relative z-10
                      flex items-center gap-3
                    "
                  >

                    <Activity
                      size={15}
                      className="
                        text-orange-300
                        group-hover:text-black
                      "
                    />

                    <span
                      className="
                        text-[11px]
                        uppercase
                        tracking-[0.22em]
                        font-semibold
                        text-orange-100
                        group-hover:text-black
                      "
                    >
                      Launch Recovery
                    </span>

                    <ArrowUpRight
                      size={14}
                      className="
                        text-orange-200
                        group-hover:text-black
                      "
                    />

                  </div>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================= */}
        {/* MAIN */}
        {/* ================================================= */}

        <main
          className="
            relative z-10
            max-w-[1700px]
            mx-auto
            px-4 lg:px-8
            py-8 lg:py-10
          "
        >

            {children}

        </main>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <footer
          className="
            relative z-10
            px-4 lg:px-8
            pb-8 pt-10
          "
        >

          <div
            className="
              max-w-[1700px]
              mx-auto
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              overflow-hidden
            "
          >

            <div
              className="
                border-t border-white/[0.05]
                px-8 py-5
                flex flex-col md:flex-row
                items-center justify-between
                gap-4
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-[0.2em]
                  text-zinc-600
                "
              >
                ARGUS • Autonomous Deployment Recovery
              </p>

              <div
                className="
                  flex items-center gap-3
                  rounded-full
                  border border-orange-500/15
                  bg-orange-500/10
                  px-4 py-2
                "
              >

                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />

                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.2em]
                    text-orange-200
                  "
                >
                  Real-time Infrastructure Active
                </span>

              </div>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}