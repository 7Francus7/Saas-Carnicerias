// Fallback de navegacion para las rutas internas. Se muestra dentro de
// <main> mientras el server component destino resuelve su guard, dando
// feedback instantaneo sin remontar el Sidebar (vive en el layout). Reusa
// las clases .skeleton / .skeleton-card existentes (respetan
// prefers-reduced-motion) para mantener coherencia visual con el sistema.
export default function AppLoading() {
  return (
    <div className="page-container" aria-busy="true" aria-label="Cargando">
      <div className="page-header">
        <div
          className="page-header__left"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div className="skeleton" style={{ width: 140, height: 14 }} />
          <div className="skeleton" style={{ width: 260, height: 30 }} />
        </div>
        <div className="page-header__right" style={{ display: "flex", gap: 12 }}>
          <div className="skeleton" style={{ width: 130, height: 44, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 120, height: 44, borderRadius: 12 }} />
        </div>
      </div>

      <div
        className="stats-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 48, height: 20, borderRadius: 999 }} />
            </div>
            <div className="skeleton" style={{ width: "65%", height: 24, marginTop: 4 }} />
            <div className="skeleton" style={{ width: "45%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
