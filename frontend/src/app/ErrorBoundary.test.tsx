import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ErrorBoundary from './ErrorBoundary';

function Broken(): never {
  throw new Error('Kaboom');
}

describe('ErrorBoundary', () => {
  it('shows the error and a way back instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to menu' })).toHaveAttribute('href', '/');
    vi.restoreAllMocks();
  });

  it('renders its children when nothing fails', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>All good</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
