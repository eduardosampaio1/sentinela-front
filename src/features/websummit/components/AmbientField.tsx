import { memo } from "react";

export const AmbientField = memo(function AmbientField() {
  return (
    <div className="ws-ambient" aria-hidden="true">
      <div className="ws-ambient__light" />
      <div className="ws-ambient__grain" />
    </div>
  );
});
