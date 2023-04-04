import Navbar from './navbar'
import Header from './header'

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <Navbar />
      <main>{children}</main>
    </>
  )
}
