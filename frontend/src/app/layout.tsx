import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CI/CD Failure Fixer — Autonomous AI DevOps",
  description:
    "An AI DevOps Engineer that autonomously diagnoses, fixes, validates, and recovers failed software deployments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-slate-200">
        {/* Top nav */}
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 font-semibold text-white">
              {/* Robot icon */}
              <span className="text-xl">🤖</span>
              <span>CI/CD Failure Fixer</span>
              <span className="ml-1 text-xs font-normal text-brand-400 bg-brand-900/40 px-2 py-0.5 rounded-full border border-brand-800">
                Autonomous
              </span>
            </a>

            <nav className="flex items-center gap-1">
              <a
                href="/"
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/workflows"
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Workflows
              </a>
              <a
                href="/demo"
                className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors font-medium"
              >
                🎮 Demo
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>

        <footer className="border-t border-gray-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
            Autonomous CI/CD Failure Fixer · Multi-Agent AI Pipeline · Powered by LangGraph + Gemini
          </div>
        </footer>
      </body>
    </html>
  );
}