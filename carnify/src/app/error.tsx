"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="app-error-screen">
      <div className="app-error-card">
        <p className="app-error-card__eyebrow">Error de aplicacion</p>
        <h1>Algo salio mal.</h1>
        <p>La pantalla fallo antes de terminar de cargar. Puedes reintentar o volver mas tarde.</p>
        <button className="btn btn--primary" onClick={reset}>Reintentar</button>
      </div>
    </div>
  );
}
