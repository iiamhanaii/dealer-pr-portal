import { Routes, Route } from 'react-router-dom'
import Apply from './pages/Apply.jsx'
import Admin from './pages/Admin.jsx'
import Header from './components/Header.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <>
          <Header />
          <div className="shell"><Apply /></div>
        </>
      } />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
