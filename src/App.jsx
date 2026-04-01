import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SchoolsPage from './pages/SchoolsPage';
import ClassRepsPage from './pages/ClassRepsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Role } from './utils/constants';
import ClassesPage from './pages/ClassesPage';
import ReviewUploadsPage from './pages/ReviewUploadsPage';

import MyClassPage from './pages/MyClassPage';
import UploadFilesPage from './pages/UploadFilesPage';
import NameListReviewPage from './pages/NameListReviewPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OrderList from './pages/OrderList';
import BackDesignConfiguratorPage from './pages/BackDesignConfiguratorPage';
import NameListPage from './pages/NameListPage';
import BackDesignTemplatesPage from './pages/BackDesignTemplatesPage';
import StudentOverview from './pages/StudentOverview';
import ProfilePage from './pages/ProfilePage';
import ProductionFilesPage from './pages/ProductionFilesPage';
import CountriesPage from './pages/CountriesPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // Or a loading spinner

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (

    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/set-password" element={<ResetPasswordPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={
          user?.role === Role.CLASS_REPRESENTATIVE ?
            <Navigate to="/my-class" replace /> :
            <DashboardPage />
        } />
        <Route
          path="schools"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <SchoolsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="class-reps"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <ClassRepsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="countries-logo"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <CountriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="all-classes"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <ClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="review-uploads"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <ReviewUploadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="design-templates"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <BackDesignTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="name-list"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <NameListReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-class"
          element={
            <ProtectedRoute allowedRoles={[Role.CLASS_REPRESENTATIVE]}>
              <MyClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="upload-files"
          element={
            <ProtectedRoute allowedRoles={[Role.CLASS_REPRESENTATIVE]}>
              <UploadFilesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="namelist"
          element={
            <ProtectedRoute allowedRoles={[Role.CLASS_REPRESENTATIVE]}>
              <NameListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="back-design-configurator"
          element={
            <ProtectedRoute allowedRoles={[Role.CLASS_REPRESENTATIVE]}>
              <BackDesignConfiguratorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="student-overview"
          element={
            <ProtectedRoute allowedRoles={[Role.CLASS_REPRESENTATIVE]}>
              <StudentOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders-list"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.CLASS_REPRESENTATIVE]}>
              <OrderList />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="production-files"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <ProductionFilesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="countries"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <CountriesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

  );
};

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
          borderRadius: 12,
          fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          Button: {
            borderRadius: 6,
            controlHeight: 40,
          },
          Card: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
