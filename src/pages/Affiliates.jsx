import AppLayout from "../components/AppLayout";

function Affiliates() {
  return (
    <AppLayout
      title="Afiliados"
      subtitle="Programa de indicação e comissões."
      action={<button className="btn-primary">Entrar como afiliado</button>}
    >
      <div className="card empty-state">
        <h3>Programa de Afiliados</h3>
        <p>Em breve vamos criar painel de indicação e ganhos.</p>
      </div>
    </AppLayout>
  );
}

export default Affiliates;
