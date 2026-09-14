import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Draft from "@/pages/Draft";
import Swap from "@/pages/Swap";
import Profile from "@/pages/Profile";
import Upload from "@/pages/Upload";

function StandardLayout({ children }) {
  return (
    <>
      <Nav />
      <main className="wrap relative z-10 flex-1 pt-10 pb-32 sm:pt-14">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <StandardLayout>
              <Home />
            </StandardLayout>
          }
        />
        <Route
          path="/draft"
          element={
            <StandardLayout>
              <Draft />
            </StandardLayout>
          }
        />
        <Route
          path="/swap"
          element={
            <StandardLayout>
              <Swap />
            </StandardLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <StandardLayout>
              <Profile />
            </StandardLayout>
          }
        />
        {/* Upload renders its own header/footer inline (no nav links, per the original upload.html) */}
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </BrowserRouter>
  );
}
