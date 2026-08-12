import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { SLIDES } from "@/features/apresentacao/slides";

const titulo = "Apresentação para investidores | Parque Brise";
const descricao =
  "Apresentação institucional do Parque Brise para investidores: projeto, mercado, empreendimentos e condições da operação.";

export const Route = createFileRoute("/apresentacao")({
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApresentacaoPage,
});

function ApresentacaoPage() {
  const navigate = useNavigate();
  const [indice, setIndice] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const total = SLIDES.length;
  const ultimo = indice === total - 1;

  const ir = useCallback(
    (delta: number) => setIndice((i) => Math.min(total - 1, Math.max(0, i + delta))),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") ir(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") ir(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    document.title = `${indice + 1}/${total} — Apresentação Parque Brise`;
  }, [indice, total]);

  const alternarFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  const simular = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    await navigate({ to: "/", hash: "investimento" });
    requestAnimationFrame(() => {
      document.getElementById("investimento")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {!fullscreen && (
        <header className="flex shrink-0 items-center gap-4 border-b border-border px-6 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
            Sair da apresentação
          </Link>
          <button
            type="button"
            onClick={alternarFullscreen}
            aria-label="Tela cheia"
            className="ml-auto flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="size-4" />
          </button>
        </header>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={SLIDES[indice].id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
          >
            <img
              src={SLIDES[indice].url}
              alt={`Slide ${indice + 1} de ${total}`}
              className="max-h-full max-w-full object-contain"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>

        {ultimo && (
          <motion.button
            type="button"
            onClick={simular}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-medium uppercase tracking-[0.12em] text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]"
          >
            Simular meu investimento
            <ArrowRight className="size-4" />
          </motion.button>
        )}

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 backdrop-blur">
          <button
            type="button"
            onClick={() => ir(-1)}
            disabled={indice === 0}
            aria-label="Slide anterior"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="numeric min-w-16 text-center text-xs text-muted-foreground">
            {indice + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => ir(1)}
            disabled={ultimo}
            aria-label="Próximo slide"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
          {fullscreen && (
            <button
              type="button"
              onClick={alternarFullscreen}
              aria-label="Sair da tela cheia"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Minimize2 className="size-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
