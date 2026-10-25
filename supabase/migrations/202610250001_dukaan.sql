CREATE TABLE public.dukaan_shops (
  owner text PRIMARY KEY,
  name text NOT NULL DEFAULT 'My Kirana Store',
  shopkeeper text NOT NULL DEFAULT 'Shopkeeper',
  demo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.dukaan_transactions (
  id uuid PRIMARY KEY,
  owner text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dukaan_transactions_owner_date ON public.dukaan_transactions(owner, created_at DESC);
ALTER TABLE public.dukaan_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dukaan_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dukaan_shops,public.dukaan_transactions FROM anon,authenticated;
GRANT ALL ON public.dukaan_shops,public.dukaan_transactions TO service_role;

CREATE FUNCTION public.dukaan_config() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb)
  FROM vault.decrypted_secrets WHERE name IN ('dukaan_sarvam_api_key','dukaan_backend_token');
$$;
REVOKE ALL ON FUNCTION public.dukaan_config() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dukaan_config() TO service_role;

CREATE FUNCTION public.dukaan_mutate(p_owner text,p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid;
  v_date timestamptz;
  v_transaction jsonb;
  v_old public.dukaan_transactions;
BEGIN
  IF p_owner IS NULL OR length(p_owner)<1 OR length(p_owner)>250 THEN RAISE EXCEPTION 'Invalid workspace'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner,0));
  IF p_action='start' THEN
    INSERT INTO public.dukaan_shops(owner,demo) VALUES(p_owner,false) ON CONFLICT(owner) DO UPDATE SET demo=false;
  ELSIF p_action='settings' THEN
    IF length(trim(p_data->>'name'))=0 OR length(trim(p_data->>'shopkeeper'))=0 THEN RAISE EXCEPTION 'Enter your shop name and your name'; END IF;
    INSERT INTO public.dukaan_shops(owner,name,shopkeeper) VALUES(p_owner,left(trim(p_data->>'name'),100),left(trim(p_data->>'shopkeeper'),80))
      ON CONFLICT(owner) DO UPDATE SET name=excluded.name,shopkeeper=excluded.shopkeeper;
  ELSIF p_action='save' THEN
    IF coalesce((SELECT demo FROM public.dukaan_shops WHERE owner=p_owner),true) THEN RAISE EXCEPTION 'Choose Start my shop before saving real transactions'; END IF;
    v_id := coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
    SELECT * INTO v_old FROM public.dukaan_transactions WHERE id=v_id;
    IF v_old.id IS NOT NULL AND v_old.owner<>p_owner THEN RAISE EXCEPTION 'Transaction unavailable'; END IF;
    v_date := coalesce(v_old.created_at,now());
    v_transaction := p_data || jsonb_build_object('id',v_id,'date',v_date);
    INSERT INTO public.dukaan_transactions(id,owner,data,created_at) VALUES(v_id,p_owner,v_transaction,v_date)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data;
  ELSIF p_action='delete' THEN
    DELETE FROM public.dukaan_transactions WHERE owner=p_owner AND id=(p_data->>'id')::uuid;
  ELSE RAISE EXCEPTION 'Unknown action';
  END IF;
  IF EXISTS (
    SELECT lower(trim(data->>'customer')) FROM public.dukaan_transactions WHERE owner=p_owner AND coalesce(data->>'customer','')<>''
    GROUP BY lower(trim(data->>'customer'))
    HAVING sum(CASE data->>'kind' WHEN 'sale' THEN (data->>'total')::bigint-(data->>'paid')::bigint WHEN 'payment' THEN -(data->>'total')::bigint ELSE 0 END)<0
  ) THEN RAISE EXCEPTION 'This would collect more than the customer owes. Check linked sales and payments.'; END IF;
  RETURN coalesce(v_transaction,jsonb_build_object('ok',true));
END;
$$;
REVOKE ALL ON FUNCTION public.dukaan_mutate(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dukaan_mutate(text,text,jsonb) TO service_role;
