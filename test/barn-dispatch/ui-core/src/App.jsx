import React from "react";
import ControllerList from "./components/ControllerList";
import ControllerStatus from "./components/ControllerStatus";
import ControllerSettings from "./components/ControllerSettings";
import LiveParams from "./components/LiveParams";
import { useControllersState } from "./hooks/useControllersState";

function App() {
  const {
    controllers,
    activeCode,
    setActiveCode,
    activeController,
    updateController,
  } = useControllersState();

  const toggleMock = () => {
    if (!activeController) return;
    updateController(activeController.code, {
      health: {
        ...activeController.health,
        mockEnabled: !activeController.health.mockEnabled,
      },
    });
  };

  const toggleLink = () => {
    if (!activeController) return;
    updateController(activeController.code, {
      link: {
        ...activeController.link,
        enabled: !activeController.link.enabled,
      },
    });
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <div className="app-title">barn-dispatch · ui-core</div>
          <div className="app-subtitle">
            визуализация контроллеров · базовая конфигурация связи
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-sm" onClick={toggleMock}>
            {activeController?.health.mockEnabled ? "Mock: ON" : "Mock: OFF"}
          </button>
          <button className="btn btn-sm" onClick={toggleLink}>
            {activeController?.link.enabled ? "Связь: ВКЛ" : "Связь: ВЫКЛ"}
          </button>
        </div>
      </header>

      <main className="app-layout">
        <section className="panel">
          <div className="panel-title">
            <span>Контроллеры</span>
            <span>всего: {controllers.length}</span>
          </div>
          <ControllerList
            controllers={controllers}
            activeCode={activeCode}
            onSelect={setActiveCode}
          />
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <div className="panel-title">
              <span>Статус контроллера</span>
            </div>
            <span>
              активен:{" "}
              <strong>
                {activeController?.num}. {activeController?.name}
              </strong>
            </span>
          </div>
          <ControllerStatus controller={activeController} />
          <LiveParams controller={activeController} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Настройки контроллера</span>
            <span>ui-core config</span>
          </div>
          <ControllerSettings
            controller={activeController}
            onChange={(patch) =>
              activeController &&
              updateController(activeController.code, patch)
            }
          />
        </section>
      </main>
    </div>
  );
}

export default App;
