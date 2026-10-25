-- Public links use opaque per-browser credentials. Only token hashes are stored.
CREATE TABLE public.dukaan_browser_sessions (
 token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
 owner text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.dukaan_public_usage (
 usage_key text NOT NULL,
 bucket bigint NOT NULL,
 calls integer NOT NULL DEFAULT 0,
 PRIMARY KEY(usage_key,bucket)
);
ALTER TABLE public.dukaan_browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dukaan_public_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dukaan_browser_sessions,public.dukaan_public_usage FROM anon,authenticated;
GRANT ALL ON public.dukaan_browser_sessions,public.dukaan_public_usage TO service_role;
CREATE FUNCTION public.dukaan_public_limit(p_key text,p_limit integer,p_window integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_bucket bigint; v_calls integer;
BEGIN
 IF p_limit<1 OR p_window<60 OR length(p_key)>200 THEN RETURN false; END IF;
 v_bucket:=floor(extract(epoch from now())/p_window)::bigint*p_window;
 INSERT INTO public.dukaan_public_usage(usage_key,bucket,calls) VALUES(p_key,v_bucket,1)
 ON CONFLICT(usage_key,bucket) DO UPDATE SET calls=public.dukaan_public_usage.calls+1
 RETURNING calls INTO v_calls;
 RETURN v_calls<=p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.dukaan_public_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dukaan_public_limit(text,integer,integer) TO service_role;
