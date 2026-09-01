import { memo } from "react";

export const AmbientField = memo(function AmbientField() {
  return (
    <div className="ws-ambient" aria-hidden="true">
      <div className="ws-ambient__depth ws-ambient__depth--far">
        <div className="ws-ambient__plane ws-ambient__plane--far" />
      </div>
      <div className="ws-ambient__depth ws-ambient__depth--mid">
        <div className="ws-ambient__plane ws-ambient__plane--mid" />
      </div>
      <div className="ws-ambient__depth ws-ambient__depth--near">
        <div className="ws-ambient__plane ws-ambient__plane--near" />
      </div>
      <div className="ws-ambient__light" />
      <div className="ws-ambient__grain" />
    </div>
  );
});
