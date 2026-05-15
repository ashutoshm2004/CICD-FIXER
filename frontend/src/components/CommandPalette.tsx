"use client";

import { useEffect, useState } from "react";

import {
  Command,
  LayoutDashboard,
  Play,
  Workflow,
  X,
} from "lucide-react";

const items = [

  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },

  {
    label: "Workflows",
    href: "/workflows",
    icon: Workflow,
  },

  {
    label: "Launch Demo",
    href: "/demo",
    icon: Play,
  },
];

export default function CommandPalette() {

  const [open, setOpen] =
    useState(false);

  useEffect(() => {

    const down = (e: KeyboardEvent) => {

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k"
      ) {

        e.preventDefault();

        setOpen((o) => !o);
      }
    };

    window.addEventListener(
      "keydown",
      down
    );

    return () =>
      window.removeEventListener(
        "keydown",
        down
      );
  }, []);

  if (!open) return null;

  return (

    <div
      className="
        fixed inset-0 z-[100]
        flex items-start justify-center
        pt-[12vh]
        bg-black/60
        backdrop-blur-xl
      "
    >

      <div
        className="
          w-full max-w-2xl
          rounded-[34px]
          border border-white/[0.06]
          bg-[#090909]
          overflow-hidden
          shadow-[0_40px_120px_rgba(0,0,0,0.7)]
        "
      >

        {/* HEADER */}
        <div
          className="
            flex items-center justify-between
            px-6 py-5
            border-b border-white/[0.05]
          "
        >

          <div className="flex items-center gap-3 text-zinc-400">

            <Command size={18} />

            <span
              className="
                uppercase tracking-[0.2em]
                text-xs
              "
            >
              Command Center
            </span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="
              w-9 h-9 rounded-xl
              border border-white/[0.08]
              flex items-center justify-center
              hover:bg-white/[0.05]
              transition-all
            "
          >

            <X size={16} />

          </button>
        </div>

        {/* ITEMS */}
        <div className="p-4 space-y-2">

          {items.map((item) => {

            const Icon = item.icon;

            return (

              <a
                key={item.label}
                href={item.href}
                className="
                  flex items-center gap-4
                  rounded-2xl
                  border border-white/[0.04]
                  bg-white/[0.02]
                  px-5 py-4
                  hover:border-orange-500/20
                  hover:bg-orange-500/[0.04]
                  transition-all duration-300
                "
              >

                <div
                  className="
                    w-11 h-11
                    rounded-2xl
                    border border-orange-500/15
                    bg-orange-500/10
                    flex items-center justify-center
                  "
                >

                  <Icon
                    size={18}
                    className="text-orange-300"
                  />

                </div>

                <div>

                  <h3 className="text-white font-semibold">
                    {item.label}
                  </h3>

                  <p
                    className="
                      text-xs uppercase
                      tracking-[0.2em]
                      text-zinc-600 mt-1
                    "
                  >
                    Navigate
                  </p>

                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}