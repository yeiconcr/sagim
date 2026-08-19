import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders label', () => {
    render(
      <FormField label="Nombre">
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormField label="Email">
        <input type="email" data-testid="email-input" />
      </FormField>
    );
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });

  it('renders required indicator when required', () => {
    render(
      <FormField label="Campo requerido" required>
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not render required indicator when not required', () => {
    render(
      <FormField label="Campo opcional">
        <input type="text" />
      </FormField>
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders error message', () => {
    render(
      <FormField label="Email" error="Email inválido">
        <input type="email" />
      </FormField>
    );
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });

  it('renders description when no error', () => {
    render(
      <FormField label="Password" description="Mínimo 8 caracteres">
        <input type="password" />
      </FormField>
    );
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('hides description when error is present', () => {
    render(
      <FormField label="Password" description="Mínimo 8 caracteres" error="Password muy corto">
        <input type="password" />
      </FormField>
    );
    expect(screen.queryByText('Mínimo 8 caracteres')).not.toBeInTheDocument();
    expect(screen.getByText('Password muy corto')).toBeInTheDocument();
  });

  it('applies htmlFor to label', () => {
    render(
      <FormField label="Username" htmlFor="username-field">
        <input type="text" id="username-field" />
      </FormField>
    );
    const label = screen.getByText('Username');
    expect(label).toHaveAttribute('for', 'username-field');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Test" className="custom-class">
        <input type="text" />
      </FormField>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies destructive style to label when error', () => {
    render(
      <FormField label="Email" error="Error">
        <input type="email" />
      </FormField>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveClass('text-destructive');
  });
});
