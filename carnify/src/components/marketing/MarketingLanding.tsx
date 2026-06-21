import Link from "next/link";
import { ArrowRight, BarChart3, Beef, CreditCard, ShieldCheck, Store, Users2, Wallet } from "lucide-react";

const features = [
  {
    icon: FeatureIcon(Beef),
    title: "Punto de venta y balanza",
    description: "Vendé por unidad o por kilo, registrá medios de pago mixtos y acelerá la caja en horario pico.",
  },
  {
    icon: FeatureIcon(Wallet),
    title: "Caja y cierre diario",
    description: "Abrí, controlá y cerrá la caja con arqueo por método para detectar diferencias antes de que escalen.",
  },
  {
    icon: FeatureIcon(Users2),
    title: "Clientes y cuenta corriente",
    description: "Llevá saldos, pagos, períodos y comprobantes sin depender de cuadernos o planillas sueltas.",
  },
  {
    icon: FeatureIcon(BarChart3),
    title: "Reportes que sirven",
    description: "Mirá ventas, ticket promedio y medios de pago para decidir compras, precios y márgenes.",
  },
];

const steps = [
  "Creás tu cuenta y tu carnicería en minutos.",
  "Cargás productos, precios y reglas básicas del negocio.",
  "Abrís caja y empezás a vender el mismo día.",
];

function FeatureIcon(Icon: typeof Beef) {
  return <Icon size={18} />;
}

export default function MarketingLanding() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <div className="marketing-brand">
          <div className="marketing-brand__badge">
            <Store size={18} color="white" />
          </div>
          <span>Carnify</span>
        </div>
        <div className="marketing-nav__links">
          <Link href="/login" className="btn btn--ghost">Ingresar</Link>
          <Link href="/signup" className="btn btn--primary">Probar ahora</Link>
        </div>
      </header>

      <main className="marketing-hero">
        <section className="marketing-hero__copy">
          <div className="marketing-chip">
            <ShieldCheck size={14} />
            Software para carnicerías con foco operativo real
          </div>
          <h1>Controlá ventas, caja, clientes y productos sin improvisar.</h1>
          <p>
            Carnify está pensado para carnicerías que necesitan vender rápido, cerrar la caja sin sorpresas
            y dejar de depender de papelitos, planillas y memoria.
          </p>
          <div className="marketing-hero__actions">
            <Link href="/signup" className="btn btn--primary btn--large">
              Crear cuenta
              <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn--ghost btn--large">
              Ya tengo cuenta
            </Link>
          </div>
          <div className="marketing-stats">
            <div className="marketing-stat">
              <strong>Ventas</strong>
              <span>POS por kilo, unidad y cuenta corriente</span>
            </div>
            <div className="marketing-stat">
              <strong>Caja</strong>
              <span>Apertura, movimientos y cierre con arqueo</span>
            </div>
            <div className="marketing-stat">
              <strong>Multi negocio</strong>
              <span>Organizaciones y permisos por empleado</span>
            </div>
          </div>
        </section>

        <section className="marketing-hero__panel">
          <div className="marketing-panel">
            <div className="marketing-panel__top">
              <span className="marketing-dot" />
              <span className="marketing-dot" />
              <span className="marketing-dot" />
            </div>
            <div className="marketing-panel__headline">
              <span>Operación de hoy</span>
              <strong>Lista para abrir caja</strong>
            </div>
            <div className="marketing-kpis">
              <div className="marketing-kpi">
                <span>Ventas</span>
                <strong>$ 248.500</strong>
              </div>
              <div className="marketing-kpi">
                <span>Ticket medio</span>
                <strong>$ 12.425</strong>
              </div>
              <div className="marketing-kpi">
                <span>Caja</span>
                <strong>Abierta</strong>
              </div>
            </div>
            <div className="marketing-list">
              <div className="marketing-list__item">
                <Beef size={16} />
                <span>Productos con PLU y precio por kilo</span>
              </div>
              <div className="marketing-list__item">
                <CreditCard size={16} />
                <span>Cobros en efectivo, transferencia, tarjeta y fiado</span>
              </div>
              <div className="marketing-list__item">
                <Wallet size={16} />
                <span>Cierre de caja con diferencias por método</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="marketing-section">
        <div className="marketing-section__intro">
          <h2>Qué resuelve hoy</h2>
          <p>La idea no es mostrar funciones. Es cubrir lo que más duele en la operación diaria.</p>
        </div>
        <div className="marketing-grid">
          {features.map((feature) => (
            <article key={feature.title} className="marketing-card">
              <div className="marketing-card__icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section--alt">
        <div className="marketing-section__intro">
          <h2>Cómo se empieza</h2>
          <p>Pensado para salir rápido. Sin consultoría eterna ni implementación de meses.</p>
        </div>
        <div className="marketing-steps">
          {steps.map((step, index) => (
            <div key={step} className="marketing-step">
              <span className="marketing-step__number">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-cta">
        <div>
          <h2>Si tu carnicería ya vende, ya tiene sentido digitalizarla.</h2>
          <p>Empezá con tu operación real, no con una demo linda.</p>
        </div>
        <div className="marketing-cta__actions">
          <Link href="/signup" className="btn btn--primary btn--large">Empezar ahora</Link>
          <Link href="/login" className="btn btn--ghost btn--large">Entrar a mi cuenta</Link>
        </div>
      </section>
    </div>
  );
}
