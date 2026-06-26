import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://txmjtcnbmufnimjkqxcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bWp0Y25ibXVmbmltamtxeGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Nzk3MjEsImV4cCI6MjA5ODA1NTcyMX0.FkEWT2mYsm8TsQ0anN6cEgUCdLfa1pGphbIobhIH1L0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const FIXED_EMAIL = 'leitor@biblioteca.app';

export const TEMAS = [
  { key: 'romance', label: 'Romance' },
  { key: 'aventura', label: 'Aventura' },
  { key: 'religiao', label: 'Religião' },
  { key: 'fantasia', label: 'Fantasia' },
  { key: 'ficcao_cientifica', label: 'Ficção científica' },
  { key: 'misterio_suspense', label: 'Mistério e suspense' },
  { key: 'ficcao_historica', label: 'Ficção histórica' },
  { key: 'terror', label: 'Terror' },
];
