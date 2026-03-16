import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DesignerPage from './pages/DesignerPage';
import ConnectionsPage from './pages/ConnectionsPage';
import { usePathname } from './utils/navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  const pathname = usePathname();

  return (
    <QueryClientProvider client={queryClient}>
      {pathname === '/connections' ? <ConnectionsPage /> : <DesignerPage />}
    </QueryClientProvider>
  );
}
