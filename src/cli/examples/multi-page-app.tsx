/**
 * 多页面路由系统
 *
 * 展示如何在键盘管理器中实现页面跳转
 */

import React, { useState, useCallback } from 'react';
import { render, Box, Text } from 'ink';
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority,
  type AppMode
} from './context';

/**
 * 方案 1: 扩展 AppMode
 * 适用于：页面数量少且固定
 */
export type AppModeWithPages =
  | 'idle'              // 空闲/主页
  | 'typing'            // 输入消息
  | 'commandSelect'     // 命令选择
  | 'page-settings'     // 设置页
  | 'page-help'         // 帮助页
  | 'page-about'        // 关于页
  | 'confirmExit';       // 退出确认

// ============== 方案 1 实现 ==============

const MultiPageApp_V1 = () => {
  const [mode, setMode] = useState<AppModeWithPages>('idle');

  // 页面内容
  const renderPage = () => {
    switch (mode) {
      case 'idle':
      case 'typing':
        return <HomePage mode={mode} setMode={setMode} />;
      case 'page-settings':
        return <SettingsPage onBack={() => setMode('idle')} />;
      case 'page-help':
        return <HelpPage onBack={() => setMode('idle')} />;
      case 'page-about':
        return <AboutPage onBack={() => setMode('idle')} />;
      default:
        return <HomePage mode={mode} setMode={setMode} />;
    }
  };

  // 页面导航处理器
  useGlobalKeyboard({
    id: 'page-navigation',
    priority: HandlerPriority.NAVIGATION,
    activeModes: ['idle', 'typing', 'page-settings', 'page-help', 'page-about'],
    handler: ({ input }) => {
      // 数字键快速跳转
      if (input === '1') setMode('page-settings');
      if (input === '2') setMode('page-help');
      if (input === '3') setMode('page-about');
      if (input === '0') setMode('idle');
      return true;
    }
  });

  return renderPage();
};

// ============== 方案 2: 导航模式 ==============

export type AppModeV2 =
  | 'idle'
  | 'typing'
  | 'commandSelect'
  | 'navigation';      // 新增：导航模式

type PageName = 'home' | 'settings' | 'help' | 'about';

const MultiPageApp_V2 = () => {
  const [mode, setMode] = useState<AppModeV2>('idle');
  const [currentPage, setCurrentPage] = useState<PageName>('home');
  const [pageHistory, setPageHistory] = useState<PageName[]>(['home']);

  // 导航到指定页面
  const navigateTo = useCallback((page: PageName) => {
    setPageHistory(prev => [...prev, page]);
    setCurrentPage(page);
    setMode('navigation');
  }, []);

  // 返回上一页
  const goBack = useCallback(() => {
    if (pageHistory.length > 1) {
      const newHistory = pageHistory.slice(0, -1);
      setPageHistory(newHistory);
      setCurrentPage(newHistory[newHistory.length - 1]);
    }
  }, [pageHistory]);

  // 页面组件映射
  const pages: Record<PageName, React.FC> = {
    home: () => <HomePage mode={mode} setMode={setMode} />,
    settings: () => <SettingsPage onBack={goBack} />,
    help: () => <HelpPage onBack={goBack} />,
    about: () => <AboutPage onBack={goBack} />,
  };

  // 当前页面处理器
  useGlobalKeyboard({
    id: 'page-router',
    priority: HandlerPriority.NAVIGATION,
    activeModes: ['navigation'],
    handler: ({ input, key }) => {
      // 数字键跳转
      if (input === '1') navigateTo('settings');
      if (input === '2') navigateTo('help');
      if (input === '3') navigateTo('about');
      if (input === '0') navigateTo('home');

      // Esc 返回
      if (key.escape) goBack();

      return true;
    }
  });

  // 渲染当前页面
  const CurrentPage = pages[currentPage];

  return (
    <Box flexDirection="column">
      <Box paddingX={1} borderBottom={true} borderColor="blue">
        <Text bold color="blue">MultiPage App (V2)</Text>
        <Text dimColor> | Page: {currentPage}</Text>
        <Text dimColor> | History: {pageHistory.join(' → ')}</Text>
      </Box>
      <CurrentPage />
      <NavigationMenu currentPage={currentPage} navigateTo={navigateTo} />
    </Box>
  );
};

// ============== 方案 3: 完全独立的路由系统 ==============

type RouterState = {
  currentPage: PageName;
  history: PageName[];
};

type RouteConfig = {
  id: string;
  path: PageName;
  label: string;
  component: React.FC;
};

const usePageRouter = (routes: RouteConfig[]) => {
  const [router, setRouter] = useState<RouterState>({
    currentPage: 'home',
    history: ['home'],
  });

  const navigateTo = useCallback((pageName: PageName) => {
    const route = routes.find(r => r.path === pageName);
    if (!route) {
      console.error(`Page not found: ${pageName}`);
      return;
    }

    setRouter(prev => ({
      currentPage: pageName,
      history: [...prev.history, pageName],
    }));
  }, [routes]);

  const goBack = useCallback(() => {
    setRouter(prev => {
      if (prev.history.length <= 1) return prev;

      const newHistory = prev.history.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];

      return {
        currentPage: previousPage,
        history: newHistory,
      };
    });
  }, []);

  const getCurrentRoute = useCallback(() => {
    return routes.find(r => r.path === router.currentPage);
  }, [router.currentPage, routes]);

  return { router, navigateTo, goBack, getCurrentRoute };
};

// ============== 页面组件 ==============

interface PageProps {
  mode?: AppMode;
  setMode?: (mode: AppMode) => void;
  onBack?: () => void;
}

const HomePage = ({ mode, setMode }: PageProps) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>🏠 主页</Text>
      <Text dimColor>Welcome to the application!</Text>
      <Box marginTop={1}>
        <Text>Commands:</Text>
        <Text dimColor>  1. Settings</Text>
        <Text dimColor>  2. Help</Text>
        <Text dimColor>  3. About</Text>
      </Box>
      <Text dimColor marginTop={1}>Type a message or /command...</Text>
    </Box>
  );
};

const SettingsPage = ({ onBack }: PageProps) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>⚙️ 设置</Text>
      <Box marginTop={1}>
        <Text>Theme: Dark</Text>
        <Text>Language: English</Text>
      </Box>
      <Text dimColor marginTop={1}>Press Esc to go back</Text>
    </Box>
  );
};

const HelpPage = ({ onBack }: PageProps) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>❓ 帮助</Text>
      <Box marginTop={1}>
        <Text>Ctrl+C: Exit</Text>
        <Text>Esc: Go back</Text>
        <Text>1/2/3: Navigate</Text>
      </Box>
      <Text dimColor marginTop={1}>Press Esc to go back</Text>
    </Box>
  );
};

const AboutPage = ({ onBack }: PageProps) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>ℹ️ 关于</Text>
      <Box marginTop={1}>
        <Text>Version: 1.0.0</Text>
        <Text>Author: AI Agent</Text>
        <Text>License: MIT</Text>
      </Box>
      <Text dimColor marginTop={1}>Press Esc to go back</Text>
    </Box>
  );
};

// ============== 导航菜单组件 ==============

interface NavigationMenuProps {
  currentPage: PageName;
  navigateTo: (page: PageName) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentPage, navigateTo }) => {
  const menuItems: { key: number; label: string; page: PageName }[] = [
    { key: 1, label: 'Settings', page: 'settings' },
    { key: 2, label: 'Help', page: 'help' },
    { key: 3, label: 'About', page: 'about' },
  ];

  return (
    <Box marginTop={1}>
      <Text bold>Menu:</Text>
      {menuItems.map(item => (
        <Text
          key={item.key}
          color={currentPage === item.page ? 'cyan' : 'white'}
        >
          {item.key}. {item.label}
        </Text>
      ))}
    </Box>
  );
};

// ============== 方案 1: 完整示例 ==============

const ExampleApp_V1 = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <GlobalShortcuts />
      <MultiPageApp_V1 />
    </KeyboardManager>
  );
};

const GlobalShortcuts = () => {
  useGlobalShortcuts(() => process.exit(0));
  return null;
};

// ============== 方案 2: 完整示例 ==============

const ExampleApp_V2 = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <GlobalShortcuts />
      <MultiPageApp_V2 />
    </KeyboardManager>
  );
};

// ============== 方案 3: 使用路由器的完整示例 ==============

const routes: RouteConfig[] = [
  { id: 'home', path: 'home', label: 'Home', component: HomePage },
  { id: 'settings', path: 'settings', label: 'Settings', component: SettingsPage },
  { id: 'help', path: 'help', label: 'Help', component: HelpPage },
  { id: 'about', path: 'about', label: 'About', component: AboutPage },
];

const ExampleApp_V3 = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <GlobalShortcuts />
      <RouterApp routes={routes} />
    </KeyboardManager>
  );
};

const RouterApp: React.FC<{ routes: RouteConfig[] }> = ({ routes }) => {
  const { router, navigateTo, goBack, getCurrentRoute } = usePageRouter(routes);

  // 全局导航处理器
  useGlobalKeyboard({
    id: 'global-navigation',
    priority: HandlerPriority.NAVIGATION,
    activeModes: ['idle', 'typing'],  // 在 idle 和 typing 模式下激活
    handler: ({ input }) => {
      // 数字键快速跳转
      if (input === '1') navigateTo('settings');
      if (input === '2') navigateTo('help');
      if (input === '3') navigateTo('about');
      if (input === '0') navigateTo('home');
      return true;
    }
  });

  const CurrentPage = getCurrentRoute()?.component || HomePage;

  return (
    <Box flexDirection="column">
      {/* 顶部栏 */}
      <Box paddingX={1} borderBottom={true} borderColor="blue">
        <Text bold>Multi-Page App</Text>
        <Text dimColor> | </Text>
        <Text>{getCurrentRoute()?.label || 'Home'}</Text>
        <Text dimColor> | </Text>
        <Text dimColor>[H]ome</Text>
      </Box>

      {/* 当前页面 */}
      <Box flexGrow={1}>
        <CurrentPage onBack={goBack} mode="typing" setMode={() => {}} />
      </Box>

      {/* 底部导航 */}
      <Box paddingX={1} borderTop={true} borderColor="gray">
        <Text dimColor>1-Settings 2-Help 3-About 0-Home</Text>
      </Box>
    </Box>
  );
};

// 导出方案 1
export { AppModeWithPages, MultiPageApp_V1 as ExampleApp1 };

// 导出方案 2
export { AppModeV2, MultiPageApp_V2 as ExampleApp2 };

// 导出方案 3
export { usePageRouter, ExampleApp_V3 };

// 默认导出方案 2（推荐）
export default MultiPageApp_V2;
