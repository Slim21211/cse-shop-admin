-- Настройки начисления баллов руководителями — единственный источник истины
-- для api/manager/award.ts, api/manager/departments.ts и интерфейса руководителя.
-- Правятся админами на вкладке «Показатели» (api/award-settings.ts).
--
-- В баллах задаётся только max_per_employee. Веса показателей и бюджет — в % от него,
-- а баллы считает сама база (generated-колонки, округление вниз). Ограничения ниже
-- не дают сохранить веса, при которых сотрудник может получить больше максимума,
-- а отдел — больше, чем max_per_employee × штат.
--
-- Уровни проактивности А–Д в именах колонок: a, b, v, g, d.
-- Запустить один раз в Supabase → SQL Editor.

create table if not exists award_settings (
  -- одна строка на всю систему
  id boolean primary key default true check (id),

  max_per_employee int not null check (max_per_employee > 0),
  budget_pct  int not null check (budget_pct  between 0 and 100),

  rez_pct     int not null check (rez_pct     between 0 and 100),
  pro_a_pct   int not null check (pro_a_pct   between 0 and 100),
  pro_b_pct   int not null check (pro_b_pct   between 0 and 100),
  pro_v_pct   int not null check (pro_v_pct   between 0 and 100),
  pro_g_pct   int not null check (pro_g_pct   between 0 and 100),
  pro_d_pct   int not null check (pro_d_pct   between 0 and 100),
  unknown_pct int not null check (unknown_pct between 0 and 100),
  free_pct    int not null check (free_pct    between 0 and 100),

  -- сотрудник, отмеченный по всем показателям, не получает больше максимума
  constraint award_settings_total_le_100 check (
    rez_pct + greatest(pro_a_pct, pro_b_pct, pro_v_pct, pro_g_pct, pro_d_pct)
      + unknown_pct + free_pct <= 100
  ),

  -- баллы: целочисленное деление = округление вниз, поэтому сумма не превысит максимум
  budget_per_head int generated always as (max_per_employee * budget_pct  / 100) stored,
  rez_points      int generated always as (max_per_employee * rez_pct     / 100) stored,
  pro_a_points    int generated always as (max_per_employee * pro_a_pct   / 100) stored,
  pro_b_points    int generated always as (max_per_employee * pro_b_pct   / 100) stored,
  pro_v_points    int generated always as (max_per_employee * pro_v_pct   / 100) stored,
  pro_g_points    int generated always as (max_per_employee * pro_g_pct   / 100) stored,
  pro_d_points    int generated always as (max_per_employee * pro_d_pct   / 100) stored,
  unknown_points  int generated always as (max_per_employee * unknown_pct / 100) stored,
  free_points     int generated always as (max_per_employee * free_pct    / 100) stored,

  -- подсказки руководителю: как оценивать показатель
  rez_desc     text not null default '',
  pro_desc     text not null default '',
  pro_a_desc   text not null default '',
  pro_b_desc   text not null default '',
  pro_v_desc   text not null default '',
  pro_g_desc   text not null default '',
  pro_d_desc   text not null default '',
  unknown_desc text not null default '',
  free_desc    text not null default '',

  updated_at timestamptz not null default now(),
  updated_by text -- users.id админа
);

-- доступ только с сервера (service role), как у остальных таблиц
alter table award_settings enable row level security;

insert into award_settings (
  max_per_employee, budget_pct,
  rez_pct, pro_a_pct, pro_b_pct, pro_v_pct, pro_g_pct, pro_d_pct, unknown_pct, free_pct,
  rez_desc, pro_desc, pro_a_desc, pro_b_desc, pro_v_desc, pro_g_desc, pro_d_desc,
  unknown_desc, free_desc
) values (
  1000, 70,
  60, 0, 5, 10, 15, 20, 10, 10,
  'Критерий результативности руководитель выбирает сам. Примеры: выполнение всех показателей KPI или одного из них, закрытие задач по бэклогу в срок, 8 встреч с клиентами в месяц, своевременное закрытие счетов клиента, своевременное создание претензий в карго.',
  'Выберите уровень проактивности сотрудника за месяц — баллы начислятся автоматически.',
  'Отсутствие проактивности: стабильный сотрудник, работает ни больше, ни меньше.',
  'Создал по своей инициативе инструкцию, которая востребована в компании или коллективе (не выполнение задачи, поставленной руководителем).',
  'Инициативная взаимопомощь коллегам — без прямой просьбы «подменить».',
  'Оптимизация процесса: благодаря сотруднику процесс стал выгоднее или быстрее.',
  'Удержание клиента или прибыль для компании.',
  'Индивидуальная благодарность сотруднику за месяц. Сохраните номер благодарности или вложение — они нужны для проверки.',
  'Дополнительные баллы на усмотрение руководителя. В комментарии обязательно опишите причину: например, помог АХО и отделу обучения украсить офис к Новому году или нашёл площадку для мероприятия.'
) on conflict (id) do nothing;
