export default function Header({ right }) {
  return (
    <div className="brand-header">
      <div className="brand-header-overlay" />
      <div className="brand-header-inner">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="快電商 C2C buy" />
          <span className="brand-title">公關品申請系統</span>
        </div>
        {right}
      </div>
    </div>
  )
}
