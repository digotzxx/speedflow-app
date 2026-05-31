import AppLayout from "../components/AppLayout";

function Team() {
  return (
    <AppLayout
      title="Equipe"
      subtitle="Convide membros e organize permissões."
      action={<button className="btn-primary">Convidar membro</button>}
    >
      <div className="card empty-state">
        <h3>Nenhum membro convidado</h3>
        <p>Na próxima etapa vamos criar convite por e-mail e cargos.</p>
      </div>
    </AppLayout>
  );
}

export default Team;
