import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Rent from "./pages/Rent";
import LotDetail from "./pages/LotDetail";
import Host from "./pages/Host";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import DashboardPicker from "./pages/DashboardPicker";
import HostDashboard from "./pages/HostDashboard";
import HostObjectDetail from "./pages/HostObjectDetail";
import ClientDashboard from "./pages/ClientDashboard";
import Messages from "./pages/Messages";
import Document from "./pages/Document";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/rent" element={<Rent />} />
            <Route path="/lot/:id" element={<LotDetail />} />
            <Route path="/host" element={<Host />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPicker /></ProtectedRoute>} />
            <Route path="/dashboard/host/objects/:id" element={<ProtectedRoute requireRole="host"><HostObjectDetail /></ProtectedRoute>} />
            <Route path="/dashboard/host/*" element={<ProtectedRoute requireRole="host"><HostDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/client/*" element={<ProtectedRoute requireRole="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/docs/:slug" element={<Document />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
