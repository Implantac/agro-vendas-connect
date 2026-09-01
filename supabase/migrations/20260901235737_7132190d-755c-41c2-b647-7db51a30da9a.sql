insert into public.listings (
  seller_id, category_id, title, slug, description, brand, model,
  manufacture_year, condition, hours_used, price, price_on_request,
  city, state, technical_data_json, status, published_at
)
select
  (array['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333']::uuid[])[1 + ((c.rn * 4 + s.j) % 3)],
  c.id,
  (array['John Deere','Case IH','New Holland','Massey Ferguson','Valtra','Jacto'])[1 + ((c.rn + s.j) % 6)] || ' ' || initcap(replace(c.slug, '-', ' ')) || ' ' || (900 + c.rn * 4 + s.j),
  'demo-' || c.slug || '-' || (c.rn * 4 + s.j),
  'Máquina revisada, documentação em dia e pronta para operação. Anúncio de demonstração DDP AGRO.',
  (array['John Deere','Case IH','New Holland','Massey Ferguson','Valtra','Jacto'])[1 + ((c.rn + s.j) % 6)],
  'Modelo ' || (900 + c.rn * 4 + s.j),
  2016 + ((c.rn * 4 + s.j) % 9),
  (array['new','semi_new','used']::listing_condition[])[1 + ((c.rn + s.j) % 3)],
  case when ((c.rn + s.j) % 3) = 0 then 0 else 800 + ((c.rn * 7 + s.j * 5) % 40) * 120 end,
  180000 + ((c.rn * 4 + s.j) * 95000) % 2220000,
  false,
  (array['Rio Verde','Sorriso','Cascavel','Passo Fundo','Uberlândia','Ribeirão Preto'])[1 + ((c.rn + s.j * 2) % 6)],
  (array['GO','MT','PR','RS','MG','SP'])[1 + ((c.rn + s.j * 2) % 6)],
  '{}'::jsonb,
  'approved'::listing_status,
  now()
from (
  select id, slug, (row_number() over (order by sort_order)) - 1 as rn
  from public.categories
  where slug in ('tratores','colheitadeiras','plantadeiras-semeadeiras','pulverizadores','preparo-de-solo','transporte-agricola')
) c
cross join (select generate_series(0, 3) as j) s
on conflict (slug) do nothing;