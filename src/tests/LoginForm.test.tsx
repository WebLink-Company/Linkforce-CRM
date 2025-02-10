import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { supabase } from '../lib/supabase';

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginForm = () => {
    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );
  };

  it('renders login form correctly', () => {
    renderLoginForm();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    renderLoginForm();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ingrese un correo electrónico válido/i)).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    renderLoginForm();
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales/i)).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'token123' };
    
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'julioesar@sediweb.com' } });
    fireEvent.change(passwordInput, { target: { value: 'prueba33' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'julioesar@sediweb.com',
        password: 'prueba33',
      });
    });
  });

  it('handles failed login attempts and account lockout', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new Error('Invalid credentials'));

    renderLoginForm();
    
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // Simulate 3 failed login attempts
    for (let i = 0; i < 3; i++) {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/credenciales.*incorrectos/i)).toBeInTheDocument();
      });
    }

    // Verify account lockout
    await waitFor(() => {
      expect(screen.getByText(/cuenta bloqueada/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});