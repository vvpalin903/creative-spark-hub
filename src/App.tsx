import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Rent from "./pages/Rent";
import LotDetail from "./pages/LotDetail";
import Host from "./pages/Host";
import Admin from "./pages/Admin";
import Document from "./pages/Document";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/rent" element={<Rent />} />
          <Route path="/lot/:id" element={<LotDetail />} />
          <Route path="/host" element={<Host />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/docs/:slug" element={<Document />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
