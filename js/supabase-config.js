// ===== Supabase Configuration =====
// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://fteehqkbvtvpdykkfuaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZWVocWtidnR2cGR5a2tmdWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTMwNTIsImV4cCI6MjA4NzA4OTA1Mn0.vm3JeRvvT-Qizt1hvaSS5QHIb6cqGapQc87dfkSVcwU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
