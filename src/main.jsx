import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { ShopProvider } from './lib/shop.jsx';
import { Spinner } from './components/ui.jsx';
import SiteLayout from './pages/site/SiteLayout.jsx';
import Home from './pages/site/Home.jsx';
import Products from './pages/site/Products.jsx';
import ProductPage from './pages/site/ProductPage.jsx';
import Services from './pages/site/Services.jsx';
import Contact from './pages/site/Contact.jsx';
import Cart from './pages/site/Cart.jsx';
import Track from './pages/site/Track.jsx';
import CustomerArea from './pages/site/CustomerArea.jsx';
import NotFound from './pages/site/NotFound.jsx';

const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<Spinner label="Abrindo o painel" />}><AdminApp /></Suspense>} />
        <Route element={<ShopProvider><SiteLayout /></ShopProvider>}>
          <Route index element={<Home />} />
          <Route path="produtos" element={<Products />} />
          <Route path="categorias/:slug" element={<Products />} />
          <Route path="produto/:slug" element={<ProductPage />} />
          <Route path="servicos" element={<Services />} />
          <Route path="contato" element={<Contact />} />
          <Route path="carrinho" element={<Cart />} />
          <Route path="rastreio" element={<Track />} />
          <Route path="area-cliente" element={<CustomerArea />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
