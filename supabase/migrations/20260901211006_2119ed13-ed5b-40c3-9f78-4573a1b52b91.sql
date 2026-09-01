
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.member_role AS ENUM ('buyer','seller','admin');
CREATE TYPE public.member_status AS ENUM ('pending','approved','rejected','suspended');
CREATE TYPE public.person_type AS ENUM ('pf','pj');
CREATE TYPE public.listing_status AS ENUM ('draft','in_review','approved','rejected','paused','sold','archived');
CREATE TYPE public.listing_condition AS ENUM ('new','semi_new','used');
CREATE TYPE public.proposal_status AS ENUM ('open','countered','accepted','rejected','expired','cancelled');
CREATE TYPE public.order_status AS ENUM ('created','awaiting_payment','paid','in_delivery','completed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','processing','paid','failed','refunded','cancelled');
CREATE TYPE public.doc_status AS ENUM ('pending','approved','rejected');

-- UTIL
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role public.member_role NOT NULL DEFAULT 'buyer',
  status public.member_status NOT NULL DEFAULT 'pending',
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  cpf_cnpj_hash text,
  person_type public.person_type NOT NULL DEFAULT 'pf',
  city text,
  state text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_approved() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved');
$$;

CREATE OR REPLACE FUNCTION public.my_member_role() RETURNS public.member_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "user_roles_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, person_type, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.member_role,'buyer'),
    COALESCE((NEW.raw_user_meta_data->>'person_type')::public.person_type,'pf'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SELLER PROFILES
CREATE TABLE public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name text NOT NULL DEFAULT '',
  trade_name text NOT NULL DEFAULT '',
  company_description text,
  website text,
  logo_url text,
  verification_status public.doc_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_profiles TO authenticated;
GRANT SELECT ON public.seller_profiles TO anon;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller_profiles_public_read" ON public.seller_profiles FOR SELECT USING (true);
CREATE POLICY "seller_profiles_own_write" ON public.seller_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "seller_profiles_own_update" ON public.seller_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_seller_profiles_updated BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MEMBER DOCUMENTS
CREATE TABLE public.member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  status public.doc_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_documents TO authenticated;
GRANT ALL ON public.member_documents TO service_role;
ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_documents_own" ON public.member_documents FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (active OR public.is_admin());
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

CREATE TABLE public.category_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  label text NOT NULL,
  slug text NOT NULL,
  input_type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT false,
  options_json jsonb,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.category_attributes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_attributes TO authenticated;
GRANT ALL ON public.category_attributes TO service_role;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_attributes_read" ON public.category_attributes FOR SELECT USING (true);
CREATE POLICY "category_attributes_admin_write" ON public.category_attributes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- LISTINGS
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  brand text,
  model text,
  manufacture_year int,
  condition public.listing_condition NOT NULL DEFAULT 'used',
  hours_used int,
  price numeric(14,2),
  price_on_request boolean NOT NULL DEFAULT false,
  city text,
  state text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  technical_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.listing_status NOT NULL DEFAULT 'draft',
  moderation_notes text,
  views_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read" ON public.listings FOR SELECT USING (status = 'approved' OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "listings_seller_insert" ON public.listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid() AND public.is_approved() AND public.my_member_role() = 'seller');
CREATE POLICY "listings_seller_update" ON public.listings FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR public.is_admin()) WITH CHECK (seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "listings_seller_delete" ON public.listings FOR DELETE TO authenticated USING (seller_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_category ON public.listings(category_id);

CREATE TABLE public.listing_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_media TO authenticated;
GRANT ALL ON public.listing_media TO service_role;
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_media_read" ON public.listing_media FOR SELECT USING (true);
CREATE POLICY "listing_media_seller_write" ON public.listing_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.seller_id = auth.uid() OR public.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.seller_id = auth.uid() OR public.is_admin())));

-- FAVORITES
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_approved());

-- PROPOSALS
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  message text,
  status public.proposal_status NOT NULL DEFAULT 'open',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_parties_read" ON public.proposals FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "proposals_buyer_insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND public.is_approved());
CREATE POLICY "proposals_parties_update" ON public.proposals FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin()) WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  previous_status public.proposal_status,
  new_status public.proposal_status,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.proposal_events TO authenticated;
GRANT ALL ON public.proposal_events TO service_role;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal_events_parties" ON public.proposal_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (p.buyer_id = auth.uid() OR p.seller_id = auth.uid() OR public.is_admin())));
CREATE POLICY "proposal_events_insert" ON public.proposal_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (p.buyer_id = auth.uid() OR p.seller_id = auth.uid())));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  commission_amount numeric(14,2) NOT NULL DEFAULT 0,
  seller_net_amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'created',
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_parties_read" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders_parties_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK ((buyer_id = auth.uid() OR seller_id = auth.uid()) AND public.is_approved());
CREATE POLICY "orders_parties_update" ON public.orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin()) WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_events_parties" ON public.order_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid() OR public.is_admin())));
CREATE POLICY "order_events_insert" ON public.order_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())));

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'asaas',
  provider_transaction_id text,
  method text,
  amount numeric(14,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  payment_url text,
  raw_response_sanitized jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_parties_read" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid() OR public.is_admin())));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONVERSATIONS / MESSAGES
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_parties_read" ON public.conversations FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
CREATE POLICY "conversations_parties_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK ((buyer_id = auth.uid() OR seller_id = auth.uid()) AND public.is_approved());
CREATE POLICY "conversations_parties_update" ON public.conversations FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid()) WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_parties_read" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR public.is_admin())));
CREATE POLICY "messages_parties_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_approved() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- LEGAL
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  title text NOT NULL,
  version text NOT NULL,
  content_md text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT INSERT, UPDATE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_documents_read" ON public.legal_documents FOR SELECT USING (published OR public.is_admin());
CREATE POLICY "legal_documents_admin_write" ON public.legal_documents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (user_id, document_id)
);
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_acceptances_own" ON public.legal_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "legal_acceptances_insert" ON public.legal_acceptances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  request_type text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.privacy_requests TO authenticated;
GRANT INSERT ON public.privacy_requests TO anon;
GRANT ALL ON public.privacy_requests TO service_role;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "privacy_requests_insert" ON public.privacy_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "privacy_requests_read" ON public.privacy_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "privacy_requests_admin_update" ON public.privacy_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_read" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_admin());
CREATE POLICY "reports_admin_update" ON public.reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_admin_write" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SEED
INSERT INTO public.app_settings(key,value) VALUES
 ('payments_enabled','{"enabled":false,"provider":"asaas"}'::jsonb),
 ('commission_percent','{"value":4}'::jsonb);

INSERT INTO public.categories(name,slug,description,icon,sort_order) VALUES
 ('Tratores','tratores','Tratores agrícolas de todas as potências','tractor',1),
 ('Colheitadeiras','colheitadeiras','Colheitadeiras de grãos e forragem','harvester',2),
 ('Plantadeiras e Semeadeiras','plantadeiras-semeadeiras','Plantio e semeadura de precisão','seed',3),
 ('Pulverizadores','pulverizadores','Autopropelidos e de arrasto','spray',4),
 ('Preparo de Solo','preparo-de-solo','Arados, grades e subsoladores','soil',5),
 ('Transporte Agrícola','transporte-agricola','Carretas, reboques e graneleiros','trailer',6),
 ('Pecuária','pecuaria','Equipamentos para manejo animal','livestock',7),
 ('Agricultura de Precisão','agricultura-de-precisao','Pilotos automáticos, sensores e telemetria','precision',8);

INSERT INTO public.legal_documents(doc_type,title,version,content_md) VALUES
 ('terms','Termos de Uso','1.0','## Termos de Uso do DDP AGRO\n\nO DDP AGRO é uma plataforma fechada de intermediação entre compradores e vendedores de implementos agrícolas. O acesso depende de aprovação prévia de cadastro.\n\n### 1. Elegibilidade\nSomente membros aprovados podem publicar anúncios, enviar propostas, iniciar conversas e concluir pedidos.\n\n### 2. Responsabilidade\nO DDP AGRO não é proprietário dos bens anunciados e não garante o estado, a procedência ou a entrega dos equipamentos. A responsabilidade pela negociação é das partes.\n\n### 3. Conduta\nÉ vedado publicar informações falsas, anunciar bens de origem irregular ou contornar os canais oficiais da plataforma.'),
 ('privacy','Política de Privacidade','1.0','## Política de Privacidade\n\nTratamos dados pessoais conforme a Lei nº 13.709/2018 (LGPD).\n\n### Dados coletados\nDados cadastrais, documentos de habilitação de membro, registros de uso e comunicação interna.\n\n### Finalidade\nAprovação de membros, prevenção a fraudes, operação da plataforma e cumprimento de obrigações legais.\n\n### Direitos do titular\nO titular pode solicitar acesso, correção, portabilidade e eliminação de dados pela Central de Privacidade.'),
 ('cookies','Política de Cookies','1.0','## Política de Cookies\n\nUtilizamos cookies essenciais para autenticação e segurança, e cookies opcionais de análise mediante consentimento.'),
 ('safe_trade','Política de Negociação Segura','1.0','## Negociação Segura\n\nMantenha toda a negociação registrada na plataforma. Desconfie de pedidos de pagamento fora dos canais oficiais e sempre vistorie o equipamento antes da conclusão.'),
 ('moderation','Política de Publicação e Moderação','1.0','## Publicação e Moderação\n\nTodo anúncio passa por análise antes de ficar visível no catálogo. Anúncios com dados incompletos, imagens de terceiros ou preços enganosos são rejeitados.'),
 ('seller_declaration','Declaração do Vendedor','1.0','## Declaração do Vendedor\n\nO vendedor declara ser legítimo possuidor do bem anunciado, que o equipamento está livre de restrições e que as informações técnicas são verdadeiras.'),
 ('liability','Aviso de Limitação de Responsabilidade','1.0','## Limitação de Responsabilidade\n\nO DDP AGRO atua como ambiente de intermediação. Não responde por vícios ocultos, inadimplemento, transporte ou danos decorrentes da negociação entre membros.');

-- DEMO SELLERS + LISTINGS
INSERT INTO public.profiles (id, role, status, full_name, email, person_type, city, state) VALUES
 ('11111111-1111-4111-8111-111111111111','seller','approved','Máquinas Vale Verde','contato@valeverde.exemplo','pj','Rio Verde','GO'),
 ('22222222-2222-4222-8222-222222222222','seller','approved','AgroSul Implementos','contato@agrosul.exemplo','pj','Passo Fundo','RS'),
 ('33333333-3333-4333-8333-333333333333','seller','approved','Campo Forte Seminovos','contato@campoforte.exemplo','pj','Sorriso','MT');

INSERT INTO public.seller_profiles (user_id, legal_name, trade_name, company_description, verification_status) VALUES
 ('11111111-1111-4111-8111-111111111111','Vale Verde Máquinas Agrícolas Ltda','Máquinas Vale Verde','Revenda de tratores e implementos no sudoeste goiano desde 2004.','approved'),
 ('22222222-2222-4222-8222-222222222222','AgroSul Comércio de Implementos Ltda','AgroSul Implementos','Especialista em plantadeiras e preparo de solo no planalto gaúcho.','approved'),
 ('33333333-3333-4333-8333-333333333333','Campo Forte Comércio de Máquinas Ltda','Campo Forte Seminovos','Seminovos revisados com laudo técnico em Mato Grosso.','approved');

INSERT INTO public.listings (seller_id, category_id, title, slug, description, brand, model, manufacture_year, condition, hours_used, price, city, state, status, published_at, technical_data_json)
SELECT s.seller, c.id, s.title, s.slug, s.description, s.brand, s.model, s.year, s.cond::public.listing_condition, s.hours, s.price, s.city, s.state, 'approved', now(), s.tech::jsonb
FROM (VALUES
 ('11111111-1111-4111-8111-111111111111'::uuid,'tratores','Trator 4x4 205 cv com piloto automático','trator-4x4-205-cv-piloto-automatico','Trator cabinado 4x4 com 205 cv, transmissão powershift, piloto automático instalado e pneus em bom estado. Revisões em dia e laudo técnico disponível.','Linha Premium','T205 PS',2021,'semi_new',3200,689000.00,'Rio Verde','GO','{"potencia":"205 cv","transmissao":"Powershift","tracao":"4x4"}'),
 ('22222222-2222-4222-8222-222222222222'::uuid,'plantadeiras-semeadeiras','Plantadeira 17 linhas com adubação','plantadeira-17-linhas-adubacao','Plantadeira de 17 linhas espaçamento 45 cm, sistema pneumático de distribuição, dosador eletrônico e monitor de plantio.','Linha Campo','PL17-45',2020,'used',NULL,415000.00,'Passo Fundo','RS','{"linhas":"17","espacamento":"45 cm","dosador":"eletronico"}'),
 ('33333333-3333-4333-8333-333333333333'::uuid,'colheitadeiras','Colheitadeira de grãos com plataforma 30 pés','colheitadeira-graos-plataforma-30-pes','Colheitadeira axial com plataforma de 30 pés, sistema de mapeamento de produtividade e cabine revisada.','Linha Safra','CS30X',2019,'used',4800,1250000.00,'Sorriso','MT','{"plataforma":"30 pes","sistema":"axial"}'),
 ('11111111-1111-4111-8111-111111111111'::uuid,'pulverizadores','Pulverizador autopropelido 3.000 litros','pulverizador-autopropelido-3000-litros','Autopropelido com tanque de 3.000 litros, barras de 30 metros, corte automático de seções e GPS integrado.','Linha Premium','PA3000',2022,'semi_new',1400,980000.00,'Rio Verde','GO','{"tanque":"3000 L","barras":"30 m"}'),
 ('22222222-2222-4222-8222-222222222222'::uuid,'preparo-de-solo','Grade aradora 20 discos reforçada','grade-aradora-20-discos-reforcada','Grade aradora com 20 discos de 28 polegadas, chassi reforçado e mancais revisados.','Linha Campo','GA20',2018,'used',NULL,86500.00,'Passo Fundo','RS','{"discos":"20","diametro":"28 pol"}'),
 ('33333333-3333-4333-8333-333333333333'::uuid,'transporte-agricola','Carreta graneleira 30 toneladas','carreta-graneleira-30-toneladas','Carreta graneleira basculante com capacidade para 30 toneladas, pneus novos e lona automática.','Linha Safra','CG30',2021,'semi_new',NULL,158000.00,'Sorriso','MT','{"capacidade":"30 t","basculante":"sim"}')
) AS s(seller,cat_slug,title,slug,description,brand,model,year,cond,hours,price,city,state,tech)
JOIN public.categories c ON c.slug = s.cat_slug;
