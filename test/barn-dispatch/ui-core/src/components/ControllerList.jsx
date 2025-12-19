import React from "react";

function ControllerList({ controllers, activeCode, onSelect }) {
  return (
    <div className="controller-list">
      {controllers.map((c) => {
        const isActive = c.code === activeCode;
        return (
          <button
            key={c.code}
            className={
              "controller-item" + (isActive ? " active" : "")
            }
            onClick={() => onSelect(c.code)}
          >
            <div className="controller-item-main">
              <span className="controller-name">
                {c.num}. {c.name}
              </span>
              <span className="controller-code">{c.code}</span>
            </div>
            <div className="controller-badge">
              {c.link.enabled ? "online*" : "offline"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ControllerList;
