import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Navbar ko import karo
import Navbar from './components/Navbar';

import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CreatePostPage from './pages/CreatePostPage';
import EditPostPage from './pages/EditPostPage';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ModerationPage from './pages/ModerationPage';
import ProtectedRoute from './components/ProtectedRoute';
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = savedTheme;
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        {/* Navbar ko Routes ke upar rakha hai taaki ye har page par dikhe */}
        <Navbar />
        
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/post/:slug" element={<PostPage />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/tag/:tagName" element={<CategoryPage mode="tag" />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/posts/new"
              element={
                <ProtectedRoute>
                  <CreatePostPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/posts/:id/edit"
              element={
                <ProtectedRoute>
                  <EditPostPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <ProtectedRoute>
                  <ModerationPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>

        <ChatbotWidget />
      </div>
    </BrowserRouter>
  );
}

export default App;
