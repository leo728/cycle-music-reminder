import { AuthProvider } from '@/contexts/AuthContext';
import { CycleProvider } from '@/contexts/CycleContext';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { WebOnlyPrettyScrollbar } from './PrettyScrollbar'
import { HeroUINativeProvider } from '@/heroui';
import { NotificationHandler } from './NotificationHandler';

function Provider({ children }: { children: ReactNode }) {
  return <WebOnlyColorSchemeUpdater>
    <WebOnlyPrettyScrollbar>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <HeroUINativeProvider>
            <CycleProvider>
              <NotificationHandler />
              {children}
            </CycleProvider>
          </HeroUINativeProvider>
        </GestureHandlerRootView>
      </AuthProvider>
    </WebOnlyPrettyScrollbar>
  </WebOnlyColorSchemeUpdater>
}

export {
  Provider,
}
