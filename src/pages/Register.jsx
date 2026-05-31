import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "../contexts/useAuth";

function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || "Nao foi possivel criar sua conta.");
      return;
    }

    if (data.session) {
      setMessage("Conta criada com sucesso. Redirecionando...");
      window.setTimeout(() => navigate("/dashboard"), 800);
      return;
    }

    setMessage("Conta criada. Confirme seu email antes de fazer login.");
    window.setTimeout(() => navigate("/login"), 1800);
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

        <h1>Criar conta</h1>
        <p>Crie sua conta para comecar a agendar seus posts.</p>

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
            placeholder="Crie uma senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <label>Confirmar senha</label>
          <input
            className="input"
            type="password"
            placeholder="Repita sua senha"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <span className="auth-link">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </span>
      </div>
    </div>
  );
}

export default Register;
