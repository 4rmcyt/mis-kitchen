UPDATE public.profiles SET station = 'Garmo' WHERE station = 'Cold';
UPDATE public.profiles SET station = 'Pans'  WHERE station = 'Hot';

UPDATE public.templates SET station = 'Garmo' WHERE station = 'Cold';
UPDATE public.templates SET station = 'Pans'  WHERE station = 'Hot';

UPDATE public.recipes SET station = 'Garmo' WHERE station = 'Cold';
UPDATE public.recipes SET station = 'Pans'  WHERE station = 'Hot';

UPDATE public.tasks SET station = 'Garmo' WHERE station = 'Cold';
UPDATE public.tasks SET station = 'Pans'  WHERE station = 'Hot';
