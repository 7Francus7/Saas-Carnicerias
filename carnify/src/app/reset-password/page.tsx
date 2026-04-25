import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

function ResetPasswordFallback() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ display: "block", maxWidth: 520 }}>
        <div className="auth-card__main">
          <div className="auth-logo">
            <span className="auth-logo-text">Carnify</span>
          </div>
          <h1 className="auth-title">Nueva contrasena</h1>
          <p className="auth-subtitle">Cargando formulario de recuperacion...</p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
