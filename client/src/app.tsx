import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard-page";
import SchedulePage from "@/pages/schedule-page";
import UsersPage from "@/pages/users-page";
import BadgesPage from "@/pages/badges-page";
import TelegramPage from "@/pages/telegram-page";
import ZoomPage from "@/pages/zoom-page";
import AutomationPage from "@/pages/automation-page";
import StatisticsPage from "@/pages/statistics-page";
import TelegramTestPage from "@/pages/telegram-test-page";
import TelegramWebhookPage from "@/pages/telegram-webhook-page";
import TelegramPlaygroundPage from "@/pages/telegram-playground-page";
import AuthPage from "@/pages/auth-page-new";
import { ProtectedRoute } from "@/lib/protected-route";
import Layout from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";

// Fonction d'enrobage pour chaque page afin d'appliquer la barre latérale
const withLayout = (Component: React.ComponentType) => {
  return function WrappedComponent(props: any) {
    // Pour les pages sans authentification, on ne montre pas la barre latérale
    const isAuthPage = window.location.pathname === "/auth";

    if (isAuthPage) {
      return <Component {...props} />;
    }

    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
};

// Applique le layout à toutes nos pages
const LayoutDashboardPage = withLayout(DashboardPage);
const LayoutSchedulePage = withLayout(SchedulePage);
const LayoutUsersPage = withLayout(UsersPage);
const LayoutBadgesPage = withLayout(BadgesPage);
const LayoutTelegramPage = withLayout(TelegramPage);
const LayoutZoomPage = withLayout(ZoomPage);
const LayoutAutomationPage = withLayout(AutomationPage);
const LayoutStatisticsPage = withLayout(StatisticsPage);
const LayoutTelegramTestPage = withLayout(TelegramTestPage);
const LayoutTelegramWebhookPage = withLayout(TelegramWebhookPage);
const LayoutTelegramPlaygroundPage = withLayout(TelegramPlaygroundPage);
const LayoutNotFound = withLayout(NotFound);

function AppRoutes() {
  return (
    <Switch>
      {/* Redirection conditionnelle vers le tableau de bord ou la page d'authentification */}
      <Route path="/">
        {() => {
          const { user } = useAuth();
          return user ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />;
        }}
      </Route>

      {/* Page d'authentification */}
      <Route path="/auth" component={AuthPage} />

      {/* Pages protégées avec layout intégré */}
      <ProtectedRoute path="/dashboard" component={LayoutDashboardPage} />
      <ProtectedRoute path="/schedule" component={LayoutSchedulePage} />
      <ProtectedRoute path="/users" component={LayoutUsersPage} />
      <ProtectedRoute path="/badges" component={LayoutBadgesPage} />
      <ProtectedRoute path="/telegram" component={LayoutTelegramPage} />
      <ProtectedRoute path="/telegram/test" component={LayoutTelegramTestPage} />
      <ProtectedRoute path="/telegram/webhook" component={LayoutTelegramWebhookPage} />
      <ProtectedRoute path="/telegram/playground" component={LayoutTelegramPlaygroundPage} />
      <ProtectedRoute path="/zoom" component={LayoutZoomPage} />
      <ProtectedRoute path="/automations" component={LayoutAutomationPage} />
      <ProtectedRoute path="/statistics" component={LayoutStatisticsPage} />

      {/* 404 Page */}
      <Route component={LayoutNotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
