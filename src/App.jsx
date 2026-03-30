import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth }               from './hooks/useAuth'
import { SubmissionsProvider }                 from './hooks/useSubmissions'
import { FormConfigsProvider }                 from './hooks/useFormConfigs'
import { OrganizationsProvider }               from './hooks/useOrganizations'
import { CardTemplatesProvider }               from './hooks/useCardTemplates'
import Navbar         from './components/Navbar'
import Home           from './pages/Home'
import Dashboard      from './pages/Dashboard'
import AddTemplate    from './pages/AddTemplate'
import DetailsForm    from './pages/DetailsForm'
import Admin          from './pages/Admin'
import AllTemplates   from './pages/AllTemplates'
import Organizations  from './pages/Organizations'
import IDCardBuilder  from './pages/IDCardBuilder'
import Success        from './pages/Success'
import About          from './pages/About'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><div style={{ width:40,height:40,border:'3px solid var(--border)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin .7s linear infinite' }}/></div>
  return user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  /* Hide navbar on public form routes — students don't need admin nav */
  const { pathname } = useLocation()
  const showNav = !pathname.startsWith('/form/') && pathname !== '/success'
  return (
    <>
      {showNav && <Navbar />}
      <Routes>
        <Route path="/"              element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/form/:urlId"   element={<DetailsForm />} />
        <Route path="/success"       element={<Success />} />
        <Route path="/about"         element={<About />} />
        <Route path="/dashboard"     element={<Protected><Dashboard /></Protected>} />
        <Route path="/add-template"  element={<Protected><AddTemplate /></Protected>} />
        <Route path="/admin"         element={<Protected><Admin /></Protected>} />
        <Route path="/templates"     element={<Protected><AllTemplates /></Protected>} />
        <Route path="/organizations" element={<Protected><Organizations /></Protected>} />
        <Route path="/card-builder"  element={<Protected><IDCardBuilder /></Protected>} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SubmissionsProvider>
        <FormConfigsProvider>
          <OrganizationsProvider>
            <CardTemplatesProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppRoutes />
                <Toaster position="bottom-right" toastOptions={{ style:{ fontFamily:'Instrument Sans,sans-serif',fontSize:13,fontWeight:600 }, success:{iconTheme:{primary:'#00c48c',secondary:'#fff'}}, error:{iconTheme:{primary:'#ef4444',secondary:'#fff'}} }}/>
              </BrowserRouter>
            </CardTemplatesProvider>
          </OrganizationsProvider>
        </FormConfigsProvider>
      </SubmissionsProvider>
    </AuthProvider>
  )
}