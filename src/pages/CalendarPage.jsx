import AppLayout from "../components/AppLayout";

function CalendarPage() {
  return (
    <AppLayout
      title="Calendário"
      subtitle="Visualize seus posts agendados por data."
    >
      <div className="card empty-state">
        <h3>Calendário ainda vazio</h3>
        <p>Quando houver posts agendados, eles aparecerão aqui.</p>
      </div>
    </AppLayout>
  );
}

export default CalendarPage;
