import { useState } from 'react';
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { LandingPage } from "./components/LandingPage";
import { CreatorDashboard } from "./components/CreatorDashboard";
import { CollaborationChat } from "./components/CollaborationChat";
import { 
  Home,
  BarChart3,
  MessageCircle,
  Settings,
  LogOut,
  TrendingUp
} from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'chat' | 'settings'>('landing');

  const handleGoToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleBackToHome = () => {
    setCurrentView('landing');
  };

  // Если мы на главной странице, показываем её без навигации
  if (currentView === 'landing') {
    return <LandingPage onGetStarted={handleGoToDashboard} onLogin={handleGoToDashboard} />;
  }

  // Для остальных страниц показываем с навигацией
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r shadow-sm z-40">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h1 className="text-xl">Reemmy</h1>
          </div>

          <nav className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleBackToHome}
            >
              <Home className="h-4 w-4 mr-3" />
              Главная
            </Button>

            <Button
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('dashboard')}
            >
              <BarChart3 className="h-4 w-4 mr-3" />
              Панель управления
            </Button>

            <Button
              variant={currentView === 'chat' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('chat')}
            >
              <MessageCircle className="h-4 w-4 mr-3" />
              Чаты и коллабы
            </Button>

            <Button
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('settings')}
            >
              <Settings className="h-4 w-4 mr-3" />
              Настройки
            </Button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white">
                U
              </div>
              <div>
                <p className="text-sm">@username</p>
                <p className="text-xs text-muted-foreground">1,247 подписчиков</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {currentView === 'dashboard' && <CreatorDashboard />}
        {currentView === 'chat' && <CollaborationChat />}
        {currentView === 'settings' && (
          <div className="p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl mb-2">Настройки</h2>
                <p className="text-muted-foreground">
                  Здесь будут настройки профиля, уведомлений и интеграций
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}