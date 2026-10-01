-- Familieplanner: opslag in Supabase.
--
-- Eenmalig uitvoeren: Supabase → SQL Editor → New query → plakken → Run.
-- Opnieuw uitvoeren kan geen kwaad: alles is "if not exists" of "or replace".
--
-- Ontwerp: elke soort gegevens (agenda, contacten, boodschappen, ...) is één
-- rij met een jsonb-document. Voor de gegevens van één gezin is dat ruim
-- genoeg, en het houdt de app simpel. De kolom "version" zorgt dat twee
-- telefoons die tegelijk iets opslaan elkaars wijziging niet overschrijven:
-- wie als tweede komt, krijgt een conflict en probeert het opnieuw op de
-- verse gegevens.

create table if not exists public.kv (
  collection text primary key,
  data       jsonb       not null,
  version    bigint      not null default 1,
  updated_at timestamptz not null default now()
);

-- Row Level Security aan, bewust zonder policies: de publieke (anon)
-- sleutel van Supabase kan hier dus niets lezen of schrijven. Alleen de app
-- zelf, met de geheime sleutel op de server, komt erbij.
alter table public.kv enable row level security;

-- Dubbele beveiliging: ook de tabelrechten voor de publieke rollen intrekken.
revoke all on public.kv from anon, authenticated;

-- En de geheime rol expliciet rechten geven, in plaats van te vertrouwen op
-- wat Supabase standaard instelt. Row Level Security slaat service_role over.
grant select, insert, update, delete on public.kv to service_role;

-- Schrijft een document, maar alleen als niemand er tussendoor aan zat.
--   p_expected = null  → de rij mag nog niet bestaan (eerste keer)
--   p_expected = n     → de rij moet nog op versie n staan
-- Geeft de nieuwe versie terug, of null bij een conflict. Het controleren en
-- schrijven gebeurt in één opdracht, dus er kan niets tussendoor komen.
create or replace function public.kv_write(
  p_collection text,
  p_data       jsonb,
  p_expected   bigint
) returns bigint
language plpgsql
set search_path = public
as $$
declare
  nieuwe_versie bigint;
begin
  if p_expected is null then
    insert into public.kv (collection, data)
    values (p_collection, p_data)
    on conflict (collection) do nothing
    returning version into nieuwe_versie;
  else
    update public.kv
       set data = p_data,
           version = version + 1,
           updated_at = now()
     where collection = p_collection
       and version = p_expected
    returning version into nieuwe_versie;
  end if;

  return nieuwe_versie;
end;
$$;

-- De functie mag alleen via de geheime sleutel worden aangeroepen.
revoke all on function public.kv_write(text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.kv_write(text, jsonb, bigint) to service_role;
