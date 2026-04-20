-- Sigurna enkripcija eJN credentials preko pgcrypto.
--
-- Do ove migracije, `lib/ejn-credentials.ts` je koristio base64 fallback
-- (funkcionalan ali nije siguran). Sada se lozinke čuvaju simetrično
-- enkriptovane PGP-om sa secret ključem koji dolazi iz `EJN_CREDS_KEY`
-- env vara. Secret NIKAD ne napušta server runtime — funkcije ga primaju
-- kao argument pri svakom pozivu.
--
-- Zašto SECURITY DEFINER?  Da pgcrypto bude dostupan i iz Supabase JS
-- klijenta preko RPC poziva, bez grantovanja širih permisija.

-- Osigurati da je pgcrypto ekstenzija instalirana
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────
-- ENCRYPT: prima plaintext + secret, vraća base64 encoded bytea kao text
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.encrypt_ejn_credentials(
  plain_username text,
  plain_password text,
  secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  u text;
  p text;
begin
  if length(coalesce(secret, '')) < 8 then
    raise exception 'secret key too short';
  end if;
  u := encode(pgp_sym_encrypt(plain_username, secret), 'base64');
  p := encode(pgp_sym_encrypt(plain_password, secret), 'base64');
  return jsonb_build_object('username_encrypted', u, 'password_encrypted', p);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- DECRYPT: prima base64 enkoded šifrate + secret, vraća plaintext JSON
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.decrypt_ejn_credentials(
  enc_username text,
  enc_password text,
  secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  u text;
  p text;
begin
  u := pgp_sym_decrypt(decode(enc_username, 'base64')::bytea, secret);
  p := pgp_sym_decrypt(decode(enc_password, 'base64')::bytea, secret);
  return jsonb_build_object('username', u, 'password', p);
end;
$$;

-- Dozvoljavamo poziv samo autentificiranim (lib fajl stavlja u admin client
-- svakako, ali ovo je dodatni safety net za development). Anon NE smije zvati.
revoke all on function public.encrypt_ejn_credentials(text, text, text) from public;
revoke all on function public.decrypt_ejn_credentials(text, text, text) from public;
grant execute on function public.encrypt_ejn_credentials(text, text, text) to authenticated, service_role;
grant execute on function public.decrypt_ejn_credentials(text, text, text) to authenticated, service_role;
