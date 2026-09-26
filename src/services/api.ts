import { supabase } from '../lib/supabaseClient';
import * as offline from '../lib/offline';

export async function syncPendingOps() {
  const ops = await offline.dequeuePending();
  let synced = 0;
  for (const op of ops) {
    const res =
      op.action === 'upsert'
        ? await supabase
            .from(op.table)
            .upsert({ ...op.payload, sync_status: 'synced' }, { onConflict: 'sesi_peserta_id' })
        : op.action === 'insert'
          ? await supabase.from(op.table).insert({ ...op.payload, sync_status: 'synced' })
          : await supabase
              .from(op.table)
              .update({ ...op.payload, sync_status: 'synced' })
              .eq('id', op.id);
    if (res.error) {
      await offline.enqueuePending(op);
    } else {
      synced += 1;
    }
  }
  return synced;
}

export async function markSynced(table: string, id: string) {
  await supabase.from(table).update({ sync_status: 'synced', updated_at: new Date().toISOString() }).eq('id', id);
}
