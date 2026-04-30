import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ChatPage from './pages/ChatPage';
import TaxCalculatorPage from './pages/TaxCalculatorPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import MyInfoPage from './pages/MyInfoPage';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/tax-calculator" element={<TaxCalculatorPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/my-info" element={<MyInfoPage />} />
      </Routes>
    </BrowserRouter>
  );
}