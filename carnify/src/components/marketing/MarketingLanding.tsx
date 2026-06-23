import Link from "next/link";
import { ArrowRight, Beef, Store, Wallet, Users2 } from "lucide-react";

const highlights = [
  { icon: <Beef size={15} />, label: "Punto de venta por kilo y unidad" },
  { icon: <Wallet size={15} />, label: "Caja y cierre diario con arqueo" },
  { icon: <Users2 size={15} />, label: "Clientes y cuenta corriente" },
];

export default function MarketingLanding() {
  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-brand">
          <div className="landing-brand__badge">
            <Store size={22} color="white" />
          </div>
          <span>Carnify</span>
        </div>

        <h1 className="landing-title">
          El sistema de tu carnicería,
          <br />
          en un solo lugar.
        </h1>
        <p className="landing-subtitle">
          Ventas, caja, clientes y productos. Iniciá sesión o creá tu cuenta para empezar.
        </p>

        <div className="landing-actions">
          <Link href="/signup" className="btn btn--primary btn--large">
            Crear cuenta
            <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn btn--ghost btn--large">
            Iniciar sesión
          </Link>
        </div>

        <ul className="landing-highlights">
          {highlights.map((item) => (
            <li key={item.label} className="landing-highlight">
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="landing-footer">Carnify · POS para carnicerías</p>
    </div>
  );
}
