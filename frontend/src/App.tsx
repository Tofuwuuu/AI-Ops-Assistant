import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Agency } from "./pages/Agency";
import { AiAssistant } from "./pages/AiAssistant";
import { Analytics } from "./pages/Analytics";
import { CalendarPage } from "./pages/Calendar";
import { Campaigns } from "./pages/Campaigns";
import { ContactDetail } from "./pages/ContactDetail";
import { Contacts } from "./pages/Contacts";
import { Dashboard } from "./pages/Dashboard";
import { Funnels } from "./pages/Funnels";
import { Inbox } from "./pages/Inbox";
import { Invoices } from "./pages/Invoices";
import { Login } from "./pages/Login";
import { PipelinePage } from "./pages/Pipeline";
import { PublicBooking } from "./pages/PublicBooking";
import { PublicFunnel } from "./pages/PublicFunnel";
import { Settings } from "./pages/Settings";
import { Signup } from "./pages/Signup";
import { TicketDetail } from "./pages/TicketDetail";
import { Workflow } from "./pages/Workflow";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/book/:accountSlug" element={<PublicBooking />} />
            <Route path="/f/:accountSlug/:pageSlug" element={<PublicFunnel />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/contacts/:id" element={<ContactDetail />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/funnels" element={<Funnels />} />
                <Route path="/ai-assistant" element={<AiAssistant />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/agency" element={<Agency />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
