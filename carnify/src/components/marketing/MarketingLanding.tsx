import Link from "next/link";
import { ArrowRight, BarChart3, Beef, CreditCard, ShieldCheck, Store, Users2, Wallet } from "lucide-react";

const features = [
  {
    icon: FeatureIcon(Beef),
    title: "Punto de venta y balanza",
    description: "Vende por unidad o por kilo, registra medios de pago mixtos y acelera caja en horario pico.",
  },
  {
    icon: FeatureIcon(Wallet),
    title: "Caja y cierre diario",
    description: "Abre, controla y cierra caja con arqueo por metodo para detectar diferencias antes de que escalen.",
  },
  {
    icon: FeatureIcon(Users2),
    title: "Clientes y cuenta corriente",
    description: "Lleva saldos, pagos, periodos y comprobantes sin depender de cuadernos o planillas sueltas.",
  },
  {
    icon: FeatureIcon(BarChart3),
    title: "Reportes que sirven",
    description: "Ve ventas, ticket promedio y medios de pago para decidir compras, precios y margenes.",
  },
];

const steps = [
  "Creas tu cuenta y tu carniceria en minutos.",
  "Cargas productos, precios y reglas basicas del negocio.",
  "Abres caja y empiezas a vender el mismo dia.",
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
            SaaS para carnicerias con foco operativo real
          </div>
          <h1>Controla ventas, caja, clientes y productos sin improvisar.</h1>
          <p>
            Carnify esta pensado para carnicerias que necesitan vender rapido, cerrar caja sin sorpresas
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
              <span>Operacion de hoy</span>
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
                <span>Cierre de caja con diferencias por metodo</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="marketing-section">
        <div className="marketing-section__intro">
          <h2>Que resuelve hoy</h2>
          <p>La idea no es mostrar features. La idea es cubrir lo que mas duele en la operacion diaria.</p>
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
          <h2>Como se empieza</h2>
          <p>Pensado para salir rapido. Sin consultoria eterna ni implementacion de meses.</p>
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
          <h2>Si tu carniceria ya vende, ya tiene sentido digitalizarla.</h2>
          <p>Empieza con tu operacion real, no con una demo linda.</p>
        </div>
        <div className="marketing-cta__actions">
          <Link href="/signup" className="btn btn--primary btn--large">Empezar ahora</Link>
          <Link href="/login" className="btn btn--ghost btn--large">Entrar a mi cuenta</Link>
        </div>
      </section>
    </div>
  );
}
