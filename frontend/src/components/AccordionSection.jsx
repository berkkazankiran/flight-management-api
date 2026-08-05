import { useState } from "react";
import "./FlightDetailPanel.css";

function AccordionSection({
  title,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="accordion-section">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="accordion-arrow">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </section>
  );
}

export default AccordionSection;
