import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Home } from "./pages/Home";
import { BoothDetail } from "./pages/BoothDetail";
import { Register } from "./pages/Register";
import { EditBooth } from "./pages/EditBooth";
import { Admin } from "./pages/Admin";
import { NotFound } from "./pages/NotFound";

/** Resets the error boundary on navigation by keying it to the pathname. */
function RoutedPages() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/booths/:slug" element={<BoothDetail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/edit/:id" element={<EditBooth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <RoutedPages />
      </Layout>
    </BrowserRouter>
  </StrictMode>,
);
