import Sidebar from "./Sidebar";

function AppLayout({ title, subtitle, action, children }) {
  return (
    <div>
      <Sidebar />

      <main className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>

          {action && <div>{action}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}

export default AppLayout;
