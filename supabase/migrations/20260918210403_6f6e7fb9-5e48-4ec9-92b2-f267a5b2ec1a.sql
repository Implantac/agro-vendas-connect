
DO $$
DECLARE
  v_seller uuid := '5c3d75a7-f724-44d2-805a-7059a1875b30';
  r record;
  v_machine uuid;
  v_listing uuid;
BEGIN
FOR r IN
  SELECT * FROM (VALUES
   ('tratores','Trator John Deere 6140J 4x4 cabinado — revisado','trator-john-deere-6140j-4x4-demo','John Deere','6140J',2018,'used',4200,389000,'Rio Verde','GO',
    'Trator John Deere 6140J 4x4 com cabine climatizada, 140 cv, 4.200 horas de uso reais registradas. Revisão completa feita na concessionária: óleo de motor, filtros, sistema hidráulico e freios. Pneus dianteiros e traseiros em bom estado, sem remendos. Lataria original, sem retoques de pintura. Máquina de frota própria, sempre guardada em galpão e com manutenção preventiva documentada. Acompanha manual do proprietário e notas das últimas revisões. Disponível para inspeção presencial em Rio Verde (GO) com hora marcada.',
    '{"potencia":"140","tracao":"4x4","cabine":"Com ar-condicionado","transmissao":"Powershift","pneus":"Bons","conservacao":"Ótimo","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/a136b774-404d-41e4-94a8-33587ab0ae07/tratores.jpg'),
   ('colheitadeiras','Colheitadeira John Deere S670 com plataforma 25 pés','colheitadeira-john-deere-s670-demo','John Deere','S670',2016,'used',5300,1290000,'Sorriso','MT',
    'Colheitadeira John Deere S670 com plataforma draper de 25 pés, tanque graneleiro de 10.500 litros e sistema de trilha axial. 5.300 horas de motor e 3.900 de rotor. Utilizada em lavoura de soja e milho, com manutenção anual feita por equipe autorizada. Cilindro, côncavos e peneiras revisados na última safra; esteira do elevador e correias trocadas. Cabine com ar-condicionado funcionando, monitor de produtividade operando normalmente. Segue com plataforma, carreta de transporte da plataforma e jogo de facas reserva.',
    '{"potencia":"355","plataforma":"25","capacidade_tanque":"10500","sistema_trilha":"Axial","cabine":"Com ar-condicionado","conservacao":"Bom","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/240dafe7-ba51-4ff8-bc75-95e7da7b885e/colheitadeiras.jpg'),
   ('plantadeiras-semeadeiras','Plantadeira John Deere 2117 — 17 linhas a 45 cm','plantadeira-john-deere-2117-17-linhas-demo','John Deere','2117',2019,'semi_new',NULL,485000,'Cascavel','PR',
    'Plantadeira pneumática John Deere 2117 com 17 linhas espaçadas a 45 cm e distribuição de fertilizante. Utilizada em aproximadamente 4.500 hectares desde nova. Discos de corte, sulcadores e rodas compactadoras revisados e com peças novas onde havia desgaste. Sistema pneumático testado linha a linha, sem falhas de deposição. Reservatórios de semente e adubo íntegros, sem furos ou oxidação. Máquina de um único dono, guardada sob cobertura fora da safra. Aceita avaliação técnica do comprador antes do fechamento.',
    '{"linhas":"17","espacamento":"45","fertilizante":"Sim","sistema_plantio":"Pneumático","conservacao":"Ótimo","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/5ff01696-6075-4a06-a5c6-f4a7ed60794c/plantadeiras.jpg'),
   ('pulverizadores','Pulverizador autopropelido 3.000 L com barras de 30 m','pulverizador-autopropelido-3000l-demo','John Deere','4730',2017,'used',3800,690000,'Luís Eduardo Magalhães','BA',
    'Pulverizador autopropelido com tanque de 3.000 litros, barras de 30 metros e 230 cv de potência. 3.800 horas trabalhadas. Bicos e porta-bicos substituídos nesta safra, bomba e comando revisados. Sistema de barras sem empenos, com suspensão e nivelamento automático funcionando. Piloto automático instalado e liberado para transferência ao comprador. Cabine pressurizada com filtro de carvão ativado novo. Máquina de fazenda, sem uso em prestação de serviço a terceiros.',
    '{"tipo_pulverizador":"Autopropelido","potencia":"230","capacidade_tanque":"3000","barras":"30","conservacao":"Bom","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/4404a697-6941-48b6-a942-4f89c311a90e/pulverizadores.jpg'),
   ('preparo-de-solo','Grade aradora Tatu Marchesan 16 discos de 28"','grade-aradora-tatu-marchesan-16-discos-demo','Tatu Marchesan','GAICR',2015,'used',NULL,48000,'Uberaba','MG',
    'Grade aradora intermediária Tatu Marchesan com 16 discos recortados de 28 polegadas e largura de trabalho de 2,4 metros. Exige trator a partir de 110 cv. Mancais e rolamentos revisados, discos com desgaste normal de uso e sem trincas. Estrutura reta, sem soldas de recuperação no chassi. Pneus de transporte em bom estado e sistema hidráulico de transporte sem vazamentos. Engate por barra de tração. Implemento pronto para entrar na área, sem necessidade de reparos.',
    '{"tipo_implemento":"Grade aradora","largura_trabalho":"2,4","discos_hastes":"16","engate":"Arrasto","potencia_exigida":"110","conservacao":"Bom","proprietarios":"2","documentacao":"Não se aplica"}'::jsonb,
    '/__l5e/assets-v1/1705c940-3381-4136-908f-1671aa2accdf/solo.jpg'),
   ('transporte-agricola','Carreta graneleira JAN Tanker 10.500 — 2 eixos','carreta-graneleira-jan-tanker-10500-demo','JAN','Tanker 10.500',2020,'semi_new',NULL,112000,'Passo Fundo','RS',
    'Carreta graneleira JAN Tanker com capacidade de 10.500 litros, dois eixos e rodado duplo. Usada apenas em transbordo interno da fazenda, entre lavoura e armazém. Caçamba sem amassados ou pontos de corrosão, lona de cobertura íntegra. Sistema de descarga hidráulica testado e funcionando, mangueiras e engates em ordem. Pneus com aproximadamente 80% de vida útil. Estrutura e cambão sem trincas. Documentação da nota fiscal de origem disponível para o comprador.',
    '{"tipo_transporte":"Carreta graneleira","capacidade_carga":"10500","eixos":"2","pneus":"Bons","conservacao":"Ótimo","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/4471b356-415d-4e7c-835d-58e2bc1565da/transporte.jpg'),
   ('pecuaria','Tronco de contenção com brete e curral metálico completo','tronco-contencao-brete-curral-metalico-demo','Sumaq','Tronco Hidráulico',2021,'semi_new',NULL,74000,'Araguaína','TO',
    'Conjunto completo de manejo bovino: tronco de contenção com acionamento hidráulico, brete de acesso, seringa curva e painéis metálicos do curral. Capacidade de manejo em torno de 120 cabeças por dia. Estrutura em tubo de aço com pintura de proteção, sem pontos de ferrugem estrutural. Portões e travas funcionando com folga normal. Cobertura em telha metálica inclusa no conjunto. Equipamento montado há duas safras e desmontável para transporte. Venda por conta de redução de rebanho.',
    '{"tipo_equipamento":"Tronco de contenção","capacidade":"120 cabeças/dia","acionamento":"Hidráulico","conservacao":"Ótimo","proprietarios":"1","documentacao":"Não se aplica"}'::jsonb,
    '/__l5e/assets-v1/647a3f37-eea4-401b-9ae9-15f5dc414e5b/pecuaria.jpg'),
   ('agricultura-de-precisao','Kit piloto automático Trimble NAV-900 com monitor GFX','kit-piloto-automatico-trimble-nav-900-demo','Trimble','NAV-900 + GFX-750',2022,'semi_new',NULL,58000,'Campo Grande','MS',
    'Kit completo de piloto automático Trimble: receptor NAV-900, monitor GFX-750, módulo de controle, suporte articulado e chicotes originais. Correção RTK com precisão de 2,5 cm, compatível também com sinais de correção por satélite. Retirado de trator vendido, em pleno funcionamento, com todas as licenças ativas e transferíveis para o comprador. Tela sem riscos e antena sem trincas. Acompanha cabos, suporte e caixa original. Ideal para quem quer adicionar direção automática a uma máquina já existente.',
    '{"tipo_tecnologia":"Piloto automático","marca_sistema":"Trimble","precisao":"RTK 2,5 cm","assinatura":"Ativa e transferível","conservacao":"Ótimo","proprietarios":"1","documentacao":"Em dia"}'::jsonb,
    '/__l5e/assets-v1/eba1dc51-e5ca-4e77-8e5b-5ba3c57ea993/precisao.jpg')
  ) AS t(cat_slug,title,slug,brand,model,year,cond,hours,price,city,state,descr,specs,img)
LOOP
  IF EXISTS (SELECT 1 FROM public.listings WHERE slug = r.slug) THEN CONTINUE; END IF;

  INSERT INTO public.machines (owner_id, category_id, brand, model, manufacture_year, condition, hours_used, technical_data_json, city, state, availability, verification_status, verified_at)
  SELECT v_seller, c.id, r.brand, r.model, r.year, r.cond::listing_condition, r.hours, r.specs, r.city, r.state, 'available', 'verified'::machine_verification, now()
  FROM public.categories c WHERE c.slug = r.cat_slug
  RETURNING id INTO v_machine;

  INSERT INTO public.listings (seller_id, machine_id, category_id, title, slug, description, brand, model, manufacture_year, condition, hours_used, price, price_on_request, city, state, technical_data_json, status, published_at)
  SELECT v_seller, v_machine, c.id, r.title, r.slug, r.descr, r.brand, r.model, r.year, r.cond::listing_condition, r.hours, r.price, false, r.city, r.state, r.specs, 'approved'::listing_status, now()
  FROM public.categories c WHERE c.slug = r.cat_slug
  RETURNING id INTO v_listing;

  INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
  VALUES (v_listing, 'image', r.img, true, 0);
END LOOP;
END $$;
