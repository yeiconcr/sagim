import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders ACTIVO for estado A', () => {
    render(<StatusBadge estado="A" />);
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
  });

  it('renders INACTIVO for estado I', () => {
    render(<StatusBadge estado="I" />);
    expect(screen.getByText('INACTIVO')).toBeInTheDocument();
  });

  it('renders ANULADO for estado X', () => {
    render(<StatusBadge estado="X" />);
    expect(screen.getByText('ANULADO')).toBeInTheDocument();
  });

  it('renders PENDIENTE for estado P', () => {
    render(<StatusBadge estado="P" />);
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
  });

  it('renders CANCELADO for estado C', () => {
    render(<StatusBadge estado="C" />);
    expect(screen.getByText('CANCELADO')).toBeInTheDocument();
  });

  it('renders VENCIDO for estado V', () => {
    render(<StatusBadge estado="V" />);
    expect(screen.getByText('VENCIDO')).toBeInTheDocument();
  });

  it('renders unknown estado as-is', () => {
    render(<StatusBadge estado="UNKNOWN" />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders with badge element', () => {
    const { container } = render(<StatusBadge estado="A" />);
    // Badge component uses inline-flex and rounded-full classes
    const badge = container.querySelector('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('inline-flex');
  });
});
