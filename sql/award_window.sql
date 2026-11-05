-- Срок начисления: каждый месяц с award_start_day по award_end_day число (по Москве).
-- Вне срока руководитель начислить не может; начислил — следующий раз в следующем месяце.
-- Правится админами на вкладке «Показатели». До 28-го, чтобы срок существовал и в феврале.
-- Запустить один раз в Supabase → SQL Editor.

alter table award_settings
  add column if not exists award_start_day int not null default 1,
  add column if not exists award_end_day   int not null default 10;

alter table award_settings
  add constraint award_settings_window check (
    award_start_day between 1 and 28
    and award_end_day between 1 and 28
    and award_start_day <= award_end_day
  );
