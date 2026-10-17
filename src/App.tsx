import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/components/LanguageProvider";
import { LoadState } from "@/components/Shell";
import { PlanProvider } from "@/context/PlanContext";
import Index from "./pages/Index";
import Start from "./pages/Start";
import Plan from "./pages/Plan";
import NotFound from "./pages/NotFound";

// Leaflet is heavy and browser-only, so the map page loads on demand
const MapPage = lazy(() => import("./pages/MapPage"));

const App = () => (
  <LanguageProvider>
    <PlanProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadState />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/start" element={<Start />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/map" element={<MapPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </PlanProvider>
  </LanguageProvider>
);

export default App;
