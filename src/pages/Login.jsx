import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "../contexts/useAuth";

function getLoginErrorMessage(error) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed") || normalized.includes("not confirmed")) {
    return "Seu email ainda nao foi confirmado. Verifique sua caixa de entrada ou reenvie a confirmacao.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email ou senha invalidos. Confira os dados e tente novamente.";
  }

  if (normalized.includes("email logins are disabled") || normalized.includes("provider is disabled")) {
    return "Login por email e senha esta desativado no Supabase. Ative Email Provider em Authentication > Providers.";
  }

  if (normalized.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return message || "Nao foi possivel entrar. Tente novamente.";
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendConfirmation, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const redirectFrom = location.state?.from;
  const redirectTo = redirectFrom
    ? `${redirectFrom.pathname || "/dashboard"}${redirectFrom.search || ""}`
    : "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCanResendConfirmation(false);
    setLoading(true);

    const { error: signInError } = await signIn({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(getLoginErrorMessage(signInError));
      setCanResendConfirmation(signInError.message?.toLowerCase().includes("not confirmed"));
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  async function handleResendConfirmation() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Digite seu email para reenviar a confirmacao.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    const { error: resendError } = await resendConfirmation(cleanEmail);
    setResending(false);

    if (resendError) {
      setError(resendError.message || "Nao foi possivel reenviar a confirmacao.");
      return;
    }

    setMessage("Email de confirmacao reenviado. Verifique sua caixa de entrada.");
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/" className="auth-logo">
          <div>
            <Zap size={22} />
          </div>
          <strong>SpeedPost</strong>
        </Link>

        <h1>Entrar na conta</h1>
        <p>Acesse seu painel para gerenciar suas publicacoes.</p>

        <form onSubmit={handleSubmit}>
          <label>E-mail</label>
          <input
            className="input"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Senha</label>
          <input
            className="input"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {canResendConfirmation && (
            <button
              className="auth-secondary-button"
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
            >
              {resending ? "Reenviando..." : "Reenviar confirmacao"}
            </button>
          )}
        </form>

        <span className="auth-link">
          Ainda nao tem conta? <Link to="/register">Criar conta</Link>
        </span>
      </div>
    </div>
  );
}

export default Login;
