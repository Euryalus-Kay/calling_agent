-- Enable Realtime on tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcript_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
