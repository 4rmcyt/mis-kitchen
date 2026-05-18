UPDATE public.profiles
SET station = 'Common'
WHERE station NOT IN ('Common', 'Cold', 'Rolls', 'Hot', 'Grill', 'Tandoor')
   OR station IS NULL;
