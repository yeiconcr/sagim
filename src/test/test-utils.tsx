import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Add any providers here (e.g., theme, store)
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, userEvent };
