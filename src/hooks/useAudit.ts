import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types/erp';

export function useAudit() {
  const logAction = useCallback(async (
    entityType: string,
    entityId: string,
    action: AuditLog['action'],
    changes: Record<string, any>
  ) => {
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        entity_type: entityType,
        entity_id: entityId,
        action,
        user_id: user.data.user.id,
        changes,
        ip_address: window.location.hostname // In production, this should come from the server
      }]);

    if (error) {
      console.error('Error logging audit entry:', error);
      throw error;
    }
  }, []);

  return { logAction };
}