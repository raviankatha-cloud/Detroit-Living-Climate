export function Atmosphere() {
  return (
    <>
      {/* Dot grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Floating clouds */}
      <div className="atm-cloud atm-cloud-1" />
      <div className="atm-cloud atm-cloud-2" />
      <div className="atm-cloud atm-cloud-3" />
      <div className="atm-cloud atm-cloud-4" />
      <div className="atm-cloud atm-cloud-5" />
      <div className="atm-cloud atm-cloud-6" />
    </>
  );
}
