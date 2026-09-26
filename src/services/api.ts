import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';

export async function syncPendingOps() {
  const ops = await offline.dequeuePending();
  for (const op of ops) {
    try {
      if (op.action === 'insert') {
        await supabase.from(op.table).insert(op.payload);
      } else {
        await supabase.from(op.table).update(op.payload).eq('id', op.id);
      }
    } catch {
      await offline.enqueuePending(op);
    }
  }
  return ops.length;
}

export async function markSynced(table: string, id: string) {
  await supabase.from(table).update({ sync_status: 'synced', updated_at: new Date().toISOString() }).eq('id', id);
}
