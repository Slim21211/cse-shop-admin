import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ISpringUser,
  ISpringUserListResponse,
  ISpringUserField,
} from './types.js';

// --- Вспомогательные интерфейсы ---

interface ExcelRow {
  fullName: string;
  email: string;
  points: number;
  reason: string;
}

interface ProcessResult {
  success: boolean;
  fullName: string;
  email: string;
  points: number;
  reason: string;
  error?: string;
}

// -------------------------------------------------------------------------
// --- Функции-помощники для преобразования данных ---
// -------------------------------------------------------------------------

/**
 * Извлекает значение поля из массива fields по имени.
 */
function extractFieldValue(fields: ISpringUserField[], name: string): string {
  const field = fields.find((f) => f.name === name);
  return field?.value || '';
}

/**
 * Преобразует "сырой" объект ISpringUser из API в "расширенный" ISpringUser,
 * добавляя email, firstName и lastName на верхний уровень, как того требует ваш код.
 * * @param rawUser Объект пользователя, возвращенный API.
 * @returns Объект пользователя, преобразованный для использования в вашем коде.
 */
function transformUser(rawUser: ISpringUser): ISpringUser {
  // Временно создаем новый объект и добавляем поля, которые ваш код ожидает на верхнем уровне,
  // чтобы устранить ошибку Type 'ISpringUser' is missing...
  const transformed: ISpringUser = {
    ...rawUser,
    email: extractFieldValue(rawUser.fields, 'EMAIL'),
    firstName: extractFieldValue(rawUser.fields, 'FIRST_NAME'),
    lastName: extractFieldValue(rawUser.fields, 'LAST_NAME'),
  };

  return transformed;
}

// -------------------------------------------------------------------------
// --- Основные функции API ---
// -------------------------------------------------------------------------

// Получение токена доступа
async function getAccessToken(): Promise<string> {
  const clientId = process.env.ISPRING_CLIENT_ID;
  const clientSecret = process.env.ISPRING_CLIENT_SECRET;
  const domain = process.env.ISPRING_DOMAIN;

  if (!clientId || !clientSecret || !domain) {
    throw new Error('Missing iSpring credentials in environment variables');
  }

  const response = await fetch(`https://${domain}/api/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('iSpring Authorization Error Body:', errorText);
    throw new Error(
      `Failed to get access token: ${response.statusText} (${response.status}). See console for error details.`
    );
  }

  const data = (await response.json()) as { access_token: string };

  return data.access_token;
}

// Получение активных пользователей с пагинацией
async function getActiveUsers(token: string): Promise<ISpringUser[]> {
  const apiDomain = process.env.ISPRING_API_DOMAIN;
  const allUsers: ISpringUser[] = [];
  const pageSize = 1000;

  if (!apiDomain) {
    throw new Error('ISPRING_API_DOMAIN environment variable is not set.');
  }

  const url = `https://${apiDomain}/api/v2/user/list`;
  let pageNumber = 1;

  while (true) {
    console.log(`\n--- Fetching user page ${pageNumber} ---`);

    const requestBody = JSON.stringify({
      page: pageNumber,
      pageSize: pageSize,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `ERROR: iSpring API v2 failed on page ${pageNumber} (${response.status}):`,
        errorText
      );
      throw new Error(
        `Failed to get users. Status: ${response.status}. Message: ${errorText}`
      );
    }

    // ИСПРАВЛЕНИЕ ОШИБКИ 1: Объявляем переменную data здесь.
    let data: ISpringUserListResponse;
    try {
      data = (await response.json()) as ISpringUserListResponse;
    } catch (e) {
      // ИСПРАВЛЕНИЕ ОШИБКИ 2: Используем переменную e в console.error.
      const rawText = await response.text();
      console.error(
        'ERROR: Failed to parse successful response JSON. Raw text:',
        rawText,
        'Parsing error details:',
        e
      );
      throw new Error('Invalid JSON response received from API.');
    }

    // ИСПРАВЛЕНИЕ ОШИБКИ 3: Преобразуем пользователей, чтобы удовлетворить ваш ISpringUser
    const rawPageUsers: ISpringUser[] = data.userProfiles || [];
    const pageUsers = rawPageUsers.map(transformUser); // <-- Применяем преобразование

    allUsers.push(...pageUsers);

    console.log(
      `Fetched ${pageUsers.length} users on page ${pageNumber}. Total users fetched: ${allUsers.length}.`
    );

    const totalUsers = data.totalUsersNumber;
    const expectedPages = Math.ceil(totalUsers / pageSize);

    if (pageNumber >= expectedPages || pageUsers.length === 0) {
      console.log(
        `SUCCESS: Reached end of user list. Total users found: ${totalUsers}.`
      );
      break;
    }

    pageNumber++;
  }

  return allUsers;
}

// Начисление баллов пользователю
// Начисление баллов пользователю
async function addReward(
  token: string,
  userId: string,
  amount: number,
  comment: string
): Promise<void> {
  const domain = 'api-learn.ispringlearn.ru';

  if (!domain) {
    throw new Error('ISPRING_API_DOMAIN environment variable is not set.');
  }

  const requestBodyXml = `<?xml version="1.0" encoding="UTF-8"?>
<awardGamificationPoints>
    <userId>${userId}</userId>
    <amount>${amount}</amount>
    <reason>${comment}</reason>
</awardGamificationPoints>`;

  const url = `https://${domain}/gamification/points/award`;

  console.log(
    `Attempting to award ${amount} points to user ${userId} via XML POST.`
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
      'User-Agent': 'curl/8.0.1',
    },
    body: requestBodyXml,
  });

  const responseText = await response.text(); // Всегда читаем body
  console.log(
    `Response status: ${response.status}, body: ${responseText.substring(
      0,
      200
    )}...`
  );

  if (!response.ok) {
    console.error('Failed request details:', {
      url,
      body: requestBodyXml,
      status: response.status,
      responseText,
    });
    throw new Error(
      `Failed to add reward (${response.status}): ${responseText.substring(
        0,
        100
      )}...`
    );
  }

  console.log(
    `Successfully awarded ${amount} points to user ${userId}. Response: ${responseText}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed request details:', {
      url: url,
      body: requestBodyXml,
      status: response.status,
    });
    throw new Error(
      `Failed to add reward (${response.status}): ${errorText.substring(
        0,
        100
      )}...`
    );
  }

  console.log(`Successfully awarded ${amount} points to user ${userId}.`);
}

// -------------------------------------------------------------------------
// --- Vercel/Next.js Handler ---
// -------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rows } = req.body as { rows: ExcelRow[] };

    console.log('rows', rows);

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 1. Получаем токен
    const token = await getAccessToken();

    // 2. Получаем активных пользователей
    const activeUsers = await getActiveUsers(token);

    // 3. Создаем карту email -> userId
    const emailToUser = new Map<string, ISpringUser>();
    activeUsers.forEach((user) => {
      // Здесь используется user.email, который мы добавили через transformUser
      emailToUser.set(user.email.toLowerCase(), user);
    });

    // 4. Обрабатываем каждую строку из Excel
    const results: ProcessResult[] = [];

    for (const row of rows) {
      const email = row.email.toLowerCase().trim();
      const user = emailToUser.get(email);

      if (!user) {
        results.push({
          success: false,
          fullName: row.fullName,
          email: row.email,
          points: row.points,
          reason: row.reason,
          error: 'Пользователь не найден или неактивен',
        });
        continue;
      }

      try {
        await addReward(token, user.userId, row.points, row.reason);
        results.push({
          success: true,
          fullName: row.fullName,
          email: row.email,
          points: row.points,
          reason: row.reason,
        });
      } catch (error) {
        results.push({
          success: false,
          fullName: row.fullName,
          email: row.email,
          points: row.points,
          reason: row.reason,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error processing rewards:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
