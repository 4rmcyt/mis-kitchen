UPDATE public.profiles
SET station = 'Common'
WHERE station NOT IN ('Common', 'Garmo', 'Rolls', 'Pans', 'Grill', 'Tandoor', 'Cold', 'Hot')
   OR station IS NULL;
