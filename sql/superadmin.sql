-- Суперадмин: видит и панель администратора, и панель руководителя (переключатель в шапке).
-- Как руководитель он видит только отделы, где сам числится руководителем в iSpring
-- и которые есть в available_departments. Запустить один раз в Supabase → SQL Editor.

alter table admins add column if not exists is_super boolean not null default false;

update admins set is_super = true
where user_id = '32de2df3-d19b-4425-865b-c18a164b0d9a';
