import { Outlet } from 'react-router-dom'
import Nav from './layout/Nav'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-[1920px] px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:pb-6">
        <Outlet />
      </main>
    </div>
  )
}
