import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";//rotas, framework para gerar rotas no react 
import Index from "./pages/Index";//vem do pages e sao o front-end da nossa aplicação...(pagina principal)
import CryptoDetail from "./pages/CryptoDetail";//vem do pages e sao o front-end da nossa aplicação(Detalhes das moedas, 2 rota)
import NotFound from "./pages/NotFound";//Serve para caso o backend pare de funcioanr ele gere um erro 404 
///AQUI TEM AS PRIMEIROS FRAMEWORKS: 
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/crypto/:id" element={<CryptoDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
