"use client";

export default function GlobalError() {
  return (
    <html lang="es">
      <body>
        <div className="app-error-screen">
          <div className="app-error-card">
            <p className="app-error-card__eyebrow">Error fatal</p>
            <h1>No pudimos cargar Carnify.</h1>
            <p>Recarga la pagina. Si el problema persiste, revisa la configuracion o los logs de produccion.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
