// api/cancel-order.ts — отмена заказа: пометка cancelled_at в orders (заказ остаётся в списке)
// + возврат баллов в iSpring + возврат товаров на склад. Отмену нельзя откатить. Только админ.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const GAMI_HOST = 'api-learn.ispringlearn.ru';
const REFUND_REASON = 'Отмена заказа в Магазине подарков';

function xmlEscape(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function ispringToken(): Promise<string> {
  const r = await fetch(`https://${process.env.ISPRING_DOMAIN}/api/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ISPRING_CLIENT_ID!,
      client_secret: process.env.ISPRING_CLIENT_SECRET!,
    }),
  });
  if (!r.ok)
    throw new Error(
      `ispring token ${r.status}: ${(await r.text()).slice(0, 120)}`
    );
  return ((await r.json()) as { access_token: string }).access_token;
}

async function awardPoints(
  token: string,
  ispringUserId: string,
  amount: number,
  reason: string
): Promise<void> {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<awardGamificationPoints>
    <userId>${ispringUserId}</userId>
    <amount>${amount}</amount>
    <reason>${xmlEscape(reason)}</reason>
</awardGamificationPoints>`;
  const r = await fetch(`https://${GAMI_HOST}/gamification/points/award`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
      'User-Agent': 'curl/8.0.1',
    },
    body,
  });
  if (!r.ok)
    throw new Error(`award ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

type OrderItem = { product_id?: number; quantity?: number; name?: string };

// Возвращает товар на склад: remains += qty. Обновление условное (remains = прочитанному
// значению), чтобы параллельная покупка в магазине не затёрла возврат; при гонке — повтор.
async function restockProduct(
  sb: SupabaseClient,
  productId: number,
  qty: number
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: p, error } = await sb
      .from('products')
      .select('remains')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error('товар удалён из каталога');
    const { data: upd, error: uerr } = await sb
      .from('products')
      .update({ remains: p.remains + qty })
      .eq('id', productId)
      .eq('remains', p.remains)
      .select('id');
    if (uerr) throw new Error(uerr.message);
    if (upd && upd.length) return;
  }
  throw new Error('не удалось обновить остаток (конкурентные изменения)');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });

  // --- гард: только залогиненный админ ---
  try {
    const t = req.cookies?.['admin-session'];
    if (!t) return res.status(401).json({ error: 'unauthorized' });
    const { payload } = await jwtVerify(
      t,
      new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
    );
    if (
      !['admin', 'superadmin'].includes((payload as { role?: string }).role || '')
    )
      return res.status(403).json({ error: 'forbidden' });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const orderId = Number((req.body || {}).orderId);
    if (!Number.isFinite(orderId))
      return res.status(400).json({ error: 'no orderId' });

    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1) заказ и iSpring-id покупателя — проверяем до удаления
    const { data: order, error: oerr } = await sb
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (oerr) return res.status(500).json({ error: 'ORDER: ' + oerr.message });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.cancelled_at)
      return res.status(409).json({ error: 'Заказ уже отменён' });

    const { data: u, error: uerr } = await sb
      .from('users')
      .select('ispring_user_id')
      .eq('id', order.user_id)
      .maybeSingle();
    if (uerr) return res.status(500).json({ error: 'USER: ' + uerr.message });
    const ispringId = u?.ispring_user_id;
    if (!ispringId)
      return res
        .status(400)
        .json({ error: 'У покупателя нет iSpring-аккаунта — баллы вернуть некуда' });

    const amount = Number(order.total_cost) || 0;

    // 2) помечаем заказ отменённым. Пометка идёт первой и условна (cancelled_at is null) —
    //    так двойной клик или параллельная отмена не вернут баллы дважды (вторая получит 0 строк).
    const { data: cancelled, error: cerr } = await sb
      .from('orders')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('cancelled_at', null)
      .select('id');
    if (cerr) return res.status(500).json({ error: 'CANCEL: ' + cerr.message });
    if (!cancelled || cancelled.length === 0)
      return res.status(409).json({ error: 'Заказ уже отменён' });

    // 3) возвращаем баллы; если iSpring не принял — снимаем пометку отмены
    if (amount > 0) {
      try {
        const token = await ispringToken();
        await awardPoints(token, ispringId, amount, REFUND_REASON);
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        const { error: rerr } = await sb
          .from('orders')
          .update({ cancelled_at: null })
          .eq('id', orderId);
        if (rerr) console.error('cancel-order: restore failed', rerr.message, orderId);
        return res.status(502).json({
          error: rerr
            ? `Баллы не начислены (${msg}), и пометку отмены не удалось снять: ${rerr.message}`
            : `Баллы не начислены, заказ не отменён: ${msg}`,
        });
      }
    }

    // 4) возвращаем товары на склад. Сюда доходит только запрос, который сам поставил
    //    пометку отмены (шаг 2), поэтому повторная отмена остатки второй раз не увеличит.
    //    Одинаковые товары в заказе суммируем, чтобы обновлять каждый один раз.
    const qtyByProduct = new Map<number, { qty: number; name: string }>();
    for (const it of (order.items || []) as OrderItem[]) {
      const id = Number(it.product_id);
      const qty = Number(it.quantity) || 0;
      if (!Number.isFinite(id) || qty <= 0) continue;
      const prev = qtyByProduct.get(id);
      qtyByProduct.set(id, {
        qty: (prev?.qty || 0) + qty,
        name: prev?.name || it.name || `#${id}`,
      });
    }
    const restockErrors: string[] = [];
    for (const [productId, { qty, name }] of qtyByProduct) {
      try {
        await restockProduct(sb, productId, qty);
      } catch (e) {
        restockErrors.push(`${name}: ${String((e as Error)?.message || e)}`);
      }
    }
    if (restockErrors.length) {
      console.error('cancel-order: restock failed', orderId, restockErrors);
      return res.status(207).json({
        ok: false,
        orderId,
        refunded: amount,
        error: `Заказ отменён, баллы возвращены, но остатки не обновлены — поправьте вручную: ${restockErrors.join('; ')}`,
      });
    }

    return res.status(200).json({ ok: true, orderId, refunded: amount });
  } catch (e) {
    console.error('cancel-order:', e);
    return res
      .status(500)
      .json({ error: 'SERVER: ' + String((e as Error)?.message || e) });
  }
}
