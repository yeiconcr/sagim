import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageLoading } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with default size (md)', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.w-6');
    expect(spinner).toBeInTheDocument();
  });

  it('renders small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.w-4');
    expect(spinner).toBeInTheDocument();
  });

  it('renders large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.w-10');
    expect(spinner).toBeInTheDocument();
  });

  it('renders text when provided', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render text when not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="my-custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});

describe('PageLoading', () => {
  it('renders with default text', () => {
    render(<PageLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<PageLoading text="Procesando datos..." />);
    expect(screen.getByText('Procesando datos...')).toBeInTheDocument();
  });

  it('renders large spinner', () => {
    const { container } = render(<PageLoading />);
    const spinner = container.querySelector('.w-10');
    expect(spinner).toBeInTheDocument();
  });
});
