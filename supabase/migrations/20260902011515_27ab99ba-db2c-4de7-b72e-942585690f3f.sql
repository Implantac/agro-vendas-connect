
DO $$
DECLARE
  v_seller uuid;
BEGIN
  SELECT id INTO v_seller FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF v_seller IS NULL THEN RAISE NOTICE 'sem perfil'; RETURN; END IF;

  INSERT INTO public.seller_profiles (user_id, legal_name, trade_name, company_description, verification_status)
  SELECT v_seller, 'DDP AGRO Comercio de Maquinas LTDA', 'DDP AGRO Store',
         'Revenda oficial de maquinas e implementos agricolas com garantia e revisao completa.', 'approved'
  WHERE NOT EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = v_seller);

  WITH data(title, cat, brand, model, ano, cond, horas, preco, cidade, uf, img) AS (
    VALUES
    ('Trator John Deere 6110J 4x4','tratores','John Deere','6110J',2019,'used',3200,385000,'Rio Verde','GO','https://images.unsplash.com/photo-1605338198618-6e0e0e0e0e0e?w=1200'),
    ('Trator Massey Ferguson 7415 Dyna-6','tratores','Massey Ferguson','7415',2021,'semi_new',1500,520000,'Uberlandia','MG','https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200'),
    ('Trator New Holland T7.245','tratores','New Holland','T7.245',2020,'used',2600,610000,'Cascavel','PR','https://images.unsplash.com/photo-1591086971318-d4a2d5b7f5d1?w=1200'),
    ('Trator Valtra BH180 4x4','tratores','Valtra','BH180',2017,'used',5400,265000,'Sorriso','MT','https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200'),
    ('Trator Case IH Puma 215','tratores','Case IH','Puma 215',2022,'semi_new',900,745000,'Luis Eduardo Magalhaes','BA','https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=1200'),
    ('Trator John Deere 5090E','tratores','John Deere','5090E',2023,'new',0,398000,'Londrina','PR','https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200'),
    ('Colheitadeira John Deere S770','colheitadeiras','John Deere','S770',2020,'used',2100,1850000,'Primavera do Leste','MT','https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200'),
    ('Colheitadeira Case IH Axial-Flow 8250','colheitadeiras','Case IH','Axial-Flow 8250',2021,'semi_new',1200,2150000,'Rio Verde','GO','https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200'),
    ('Colheitadeira New Holland CR 8.90','colheitadeiras','New Holland','CR 8.90',2018,'used',4300,1450000,'Passo Fundo','RS','https://images.unsplash.com/photo-1591086971318-d4a2d5b7f5d1?w=1200'),
    ('Colheitadeira Massey Ferguson MF 9895','colheitadeiras','Massey Ferguson','MF 9895',2019,'used',3100,1290000,'Balsas','MA','https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200'),
    ('Plantadeira John Deere DB 1211','plantadeiras-semeadeiras','John Deere','DB 1211',2020,'used',NULL,890000,'Sorriso','MT','https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=1200'),
    ('Plantadeira Stara Estrela 32','plantadeiras-semeadeiras','Stara','Estrela 32',2021,'semi_new',NULL,760000,'Nao-Me-Toque','RS','https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200'),
    ('Semeadeira Jumil JM 8090 PD','plantadeiras-semeadeiras','Jumil','JM 8090',2018,'used',NULL,320000,'Ribeirao Preto','SP','https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200'),
    ('Plantadeira Massey Ferguson MF 512','plantadeiras-semeadeiras','Massey Ferguson','MF 512',2022,'semi_new',NULL,610000,'Chapadao do Sul','MS','https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200'),
    ('Pulverizador Jacto Uniport 3030','pulverizadores','Jacto','Uniport 3030',2020,'used',2800,690000,'Pompeia','SP','https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200'),
    ('Pulverizador John Deere 4730','pulverizadores','John Deere','4730',2019,'used',3500,720000,'Rio Verde','GO','https://images.unsplash.com/photo-1605338198618-6e0e0e0e0e0e?w=1200'),
    ('Pulverizador Stara Imperador 3.0','pulverizadores','Stara','Imperador 3.0',2022,'semi_new',1100,980000,'Nao-Me-Toque','RS','https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200'),
    ('Pulverizador Montana Parruda 2700','pulverizadores','Montana','Parruda 2700',2017,'used',4900,340000,'Cascavel','PR','https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=1200'),
    ('Grade Aradora Baldan GAICR 20 discos','preparo-de-solo','Baldan','GAICR 20',2019,'used',NULL,78000,'Matao','SP','https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200'),
    ('Subsolador Piccin 7 hastes','preparo-de-solo','Piccin','SP-7',2021,'semi_new',NULL,64000,'Sertaozinho','SP','https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200'),
    ('Escarificador Ikeda IE 9','preparo-de-solo','Ikeda','IE 9',2018,'used',NULL,52000,'Uberaba','MG','https://images.unsplash.com/photo-1591086971318-d4a2d5b7f5d1?w=1200'),
    ('Arado de Discos Tatu AF 4','preparo-de-solo','Tatu Marchesan','AF 4',2016,'used',NULL,29000,'Barretos','SP','https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200'),
    ('Carreta Graneleira Stara 23000','transporte-agricola','Stara','Graneleira 23000',2020,'used',NULL,185000,'Passo Fundo','RS','https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200'),
    ('Carreta Basculante Guerra 3 eixos','transporte-agricola','Guerra','Bascul 3E',2019,'used',NULL,148000,'Caxias do Sul','RS','https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200'),
    ('Reboque Agricola Fankhauser 12t','transporte-agricola','Fankhauser','RA 12',2021,'semi_new',NULL,96000,'Chapeco','SC','https://images.unsplash.com/photo-1605338198618-6e0e0e0e0e0e?w=1200'),
    ('Tanque de Expansao Etscheid 3000L','pecuaria','Etscheid','TE 3000',2020,'used',NULL,72000,'Castro','PR','https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200'),
    ('Ordenhadeira Canaria 8 conjuntos','pecuaria','Canaria','OC-8',2019,'used',NULL,58000,'Patos de Minas','MG','https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=1200'),
    ('Vagao Misturador Casale 12m3','pecuaria','Casale','VM 12',2022,'semi_new',NULL,165000,'Toledo','PR','https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200'),
    ('Piloto Automatico Trimble GFX-750','agricultura-de-precisao','Trimble','GFX-750',2023,'new',NULL,68000,'Sorriso','MT','https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200'),
    ('Monitor de Plantio Precision Planting 20/20','agricultura-de-precisao','Precision Planting','20/20',2021,'semi_new',NULL,54000,'Rio Verde','GO','https://images.unsplash.com/photo-1591086971318-d4a2d5b7f5d1?w=1200')
  ), ins AS (
    INSERT INTO public.listings
      (seller_id, category_id, title, slug, description, brand, model, manufacture_year, condition,
       hours_used, price, price_on_request, city, state, technical_data_json, status, published_at)
    SELECT v_seller, c.id, d.title,
      lower(regexp_replace(regexp_replace(d.title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || substr(md5(d.title), 1, 6),
      'Maquina revisada, documentacao em dia e pronta para operar. ' || d.title ||
      ' disponivel na DDP AGRO com garantia de revenda e suporte tecnico.',
      d.brand, d.model, d.ano, d.cond::listing_condition, d.horas, d.preco, false, d.cidade, d.uf,
      jsonb_build_object('marca', d.brand, 'modelo', d.model, 'ano', d.ano::text),
      'approved'::listing_status, now()
    FROM data d JOIN public.categories c ON c.slug = d.cat
    RETURNING id, title
  )
  INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
  SELECT i.id, 'image', d.img, true, 0 FROM ins i JOIN data d ON d.title = i.title;
END $$;
