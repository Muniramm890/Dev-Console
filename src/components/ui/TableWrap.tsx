// @ts-nocheck
// Mobile-safe table wrapper: horizontal swipe scroll (+ optional vertical limit). Use around every raw <table>.
export const TableWrap = ({ children, maxHeight, style }) => (
  <div
    className={maxHeight ? "table-scroll-y" : "table-scroll"}
    style={{ ...(maxHeight ? { maxHeight } : null), ...style }}
  >
    {maxHeight ? <div style={{ minWidth: 520 }}>{children}</div> : children}
  </div>
);
