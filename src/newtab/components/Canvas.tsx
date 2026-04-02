import React from "react";
import { Widget } from "../helpers/types";
import { WidgetsHorMenu } from "./canvas/WidgetsHorMenu";
import { WidgetSticker } from "./canvas/WidgetSticker";

export function Canvas(p: {
  selectedWidgetIds: number[];
  editingWidgetId: number | undefined;
  widgets: Widget[];
}) {
  return (
    <div className="canvas-container">
      {p.widgets.map((widget: Widget) => (
        <WidgetSticker
          key={widget.id}
          data={widget}
          selected={p.selectedWidgetIds.includes(widget.id)}
          inEdit={p.editingWidgetId === widget.id}
        />
      ))}
      <div className="widgets-selection-frame"></div>
      <WidgetsHorMenu
        widgets={p.widgets}
        selectedWidgetIds={p.selectedWidgetIds}
      />
    </div>
  );
}
