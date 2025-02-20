import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import type { Invoice } from '../../types/billing';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export default function SendEmailModal({ isOpen, onClose, invoice }: SendEmailModalProps) {
  const [email, setEmail] = useState(invoice.customer?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Here you would implement the email sending logic
      // For now, we'll just simulate it with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error sending email');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70]">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-md border border-white/10">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          {/* Top border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Bottom border */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Left border */}
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Right border */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Corner glows */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Enviar Factura por Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary inline-flex items-center"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}