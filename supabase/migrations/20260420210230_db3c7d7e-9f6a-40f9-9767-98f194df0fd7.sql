-- =========================================================
-- SEED: тестовые пользователи + связки существующих данных
-- =========================================================

DO $$
DECLARE
  -- фиксированные UUID для воспроизводимости
  host1 uuid := '11111111-1111-1111-1111-111111111111';
  host2 uuid := '22222222-2222-2222-2222-222222222222';
  host3 uuid := '33333333-3333-3333-3333-333333333333';
  cli1  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  cli2  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  cli3  uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  cli4  uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  -- bcrypt hash for password "Test1234!"
  pwd   text := crypt('Test1234!', gen_salt('bf'));
BEGIN
  -- ----- helper inline: создать auth.users если нет -----
  PERFORM 1;

  -- HOST 1
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES (host1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'host1@test.local', pwd, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name','Анна Петрова','phone','+7 (916) 100-00-01','role','host'),
    now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- HOST 2
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES (host2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'host2@test.local', pwd, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name','Дмитрий Соколов','phone','+7 (916) 100-00-02','role','host'),
    now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- HOST 3
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES (host3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'host3@test.local', pwd, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name','Елена Морозова','phone','+7 (916) 100-00-03','role','host'),
    now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- CLIENTS
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (cli1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','client1@test.local',pwd,now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name','Иван Иванов','phone','+7 (916) 200-00-01','role','client'),
      now(), now(),'','','',''),
    (cli2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','client2@test.local',pwd,now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name','Мария Кузнецова','phone','+7 (916) 200-00-02','role','client'),
      now(), now(),'','','',''),
    (cli3,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','client3@test.local',pwd,now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name','Сергей Орлов','phone','+7 (916) 200-00-03','role','client'),
      now(), now(),'','','',''),
    (cli4,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','client4@test.local',pwd,now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name','Ольга Смирнова','phone','+7 (916) 200-00-04','role','client'),
      now(), now(),'','','','')
  ON CONFLICT (id) DO NOTHING;

  -- handle_new_user trigger should have created profiles + roles automatically.
  -- Гарантия: дополним данные профилей (город) и роли — на случай отключённого триггера.
  INSERT INTO public.profiles (user_id, name, email, phone, city)
  VALUES
    (host1,'Анна Петрова','host1@test.local','+7 (916) 100-00-01','Мытищи'),
    (host2,'Дмитрий Соколов','host2@test.local','+7 (916) 100-00-02','Москва'),
    (host3,'Елена Морозова','host3@test.local','+7 (916) 100-00-03','Мытищи'),
    (cli1,'Иван Иванов','client1@test.local','+7 (916) 200-00-01','Москва'),
    (cli2,'Мария Кузнецова','client2@test.local','+7 (916) 200-00-02','Мытищи'),
    (cli3,'Сергей Орлов','client3@test.local','+7 (916) 200-00-03','Москва'),
    (cli4,'Ольга Смирнова','client4@test.local','+7 (916) 200-00-04','Мытищи')
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, city = EXCLUDED.city;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (host1,'host'),(host2,'host'),(host3,'host'),
    (cli1,'client'),(cli2,'client'),(cli3,'client'),(cli4,'client')
  ON CONFLICT DO NOTHING;
END $$;

-- ----- Привязка существующих лотов без хоста к тестовым хостам (round-robin) -----
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn
  FROM public.host_objects
  WHERE host_user_id IS NULL
), mapped AS (
  SELECT id, CASE (rn % 3)
      WHEN 0 THEN '11111111-1111-1111-1111-111111111111'::uuid
      WHEN 1 THEN '22222222-2222-2222-2222-222222222222'::uuid
      ELSE '33333333-3333-3333-3333-333333333333'::uuid END AS h
  FROM ordered
)
UPDATE public.host_objects o
SET host_user_id = m.h
FROM mapped m WHERE o.id = m.id;

-- ----- Привязка заявок без клиента к тестовым клиентам -----
WITH ordered AS (
  SELECT br.id, row_number() OVER (ORDER BY br.created_at) - 1 AS rn,
         o.host_user_id
  FROM public.booking_requests br
  LEFT JOIN public.host_objects o ON o.id = br.object_id
  WHERE br.client_user_id IS NULL
), mapped AS (
  SELECT id, host_user_id,
    (ARRAY[
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
    ])[(rn % 4) + 1] AS c
  FROM ordered
)
UPDATE public.booking_requests br
SET client_user_id = m.c,
    host_user_id  = COALESCE(br.host_user_id, m.host_user_id)
FROM mapped m WHERE br.id = m.id;

-- ----- Завершённые размещения + взаимные отзывы -----
DO $$
DECLARE
  rec record;
  pid uuid;
  i int := 0;
  clients uuid[] := ARRAY[
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
  ];
  comments_h text[] := ARRAY[
    'Отличное место, всё чисто и сухо. Рекомендую!',
    'Хороший хост, быстро отвечает. Шины пролежали зиму без проблем.',
    'Удобный подъезд, хозяин на связи. Цена адекватная.',
    'Всё понравилось, обязательно обращусь снова.',
    'Спасибо! Велосипед в целости, место сухое.',
    'Просто супер. Помогли с разгрузкой.',
    'Доступ удобный, претензий нет.',
    'Качественное хранение, доверяю.'
  ];
  comments_c text[] := ARRAY[
    'Аккуратный клиент, забрал вещи вовремя.',
    'Спокойный, без вопросов. Рекомендую как арендатора.',
    'Заранее предупредил о приезде, очень удобно.',
    'Всё прошло гладко.',
    'Адекватный человек, приятно иметь дело.',
    'Без нареканий.'
  ];
  ratings_h smallint[] := ARRAY[5,5,4,5,5,4,5,5]::smallint[];
  ratings_c smallint[] := ARRAY[5,4,5,5,5,5]::smallint[];
BEGIN
  -- Берём первые 6 опубликованных лотов с реальным host_user_id и создаём по placement
  FOR rec IN
    SELECT id, host_user_id
    FROM public.host_objects
    WHERE object_status = 'published' AND host_user_id IS NOT NULL
    ORDER BY created_at
    LIMIT 6
  LOOP
    -- 1. создаём заявку (для FK в placement)
    INSERT INTO public.booking_requests
      (host_user_id, client_user_id, object_id, client_name, client_phone, client_email,
       request_status, start_date, end_date, comment)
    VALUES
      (rec.host_user_id, clients[(i % 4) + 1], rec.id,
       'Тестовый клиент', '+7 (916) 200-00-0' || ((i % 4) + 1)::text,
       'client' || ((i % 4) + 1)::text || '@test.local',
       'completed',
       (now() - interval '180 days')::date,
       (now() - interval '30 days')::date,
       'Тестовая завершённая аренда')
    RETURNING id INTO pid;

    -- 2. placement completed
    INSERT INTO public.placements
      (booking_request_id, host_user_id, client_user_id, object_id,
       placement_status, started_at, ended_at)
    VALUES
      (pid, rec.host_user_id, clients[(i % 4) + 1], rec.id,
       'completed', now() - interval '180 days', now() - interval '30 days')
    RETURNING id INTO pid;

    -- 3. отзыв клиент → хост
    INSERT INTO public.reviews
      (placement_id, rater_user_id, ratee_user_id, rater_role, rating, comment, created_at)
    VALUES
      (pid, clients[(i % 4) + 1], rec.host_user_id, 'client',
       ratings_h[(i % array_length(ratings_h,1)) + 1],
       comments_h[(i % array_length(comments_h,1)) + 1],
       now() - interval '25 days' - (i || ' days')::interval);

    -- 4. отзыв хост → клиент
    INSERT INTO public.reviews
      (placement_id, rater_user_id, ratee_user_id, rater_role, rating, comment, created_at)
    VALUES
      (pid, rec.host_user_id, clients[(i % 4) + 1], 'host',
       ratings_c[(i % array_length(ratings_c,1)) + 1],
       comments_c[(i % array_length(comments_c,1)) + 1],
       now() - interval '20 days' - (i || ' days')::interval);

    i := i + 1;
  END LOOP;
END $$;