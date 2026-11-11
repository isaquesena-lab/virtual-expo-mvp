import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { BoothDetail } from "./pages/BoothDetail";
import { Register } from "./pages/Register";
import { EditBooth } from "./pages/EditBooth";
import { Admin } from "./pages/Admin";
import { NotFound } from "./pages/NotFound";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booths/:slug" element={<BoothDetail />} />
          <Route path="/register" element={<Register />} />
          <Route path="/edit/:id" element={<EditBooth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </StrictMode>,
);
