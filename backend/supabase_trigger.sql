-- This script sets up a database trigger in Supabase to automatically sync
-- users registered via Supabase Auth (in the `auth.users` table) into the 
-- public `users` and `medical_profiles` tables.
-- 
-- How to use:
-- 1. Go to your Supabase Dashboard (https://supabase.com).
-- 2. Select your project.
-- 3. Click on "SQL Editor" in the left sidebar.
-- 4. Click "New Query", paste this script, and click "Run".

-- Create the function that will sync users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id, 
    upahaar_id, 
    role, 
    full_name, 
    email, 
    phone, 
    password_hash, 
    face_photo_url
  )
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'upahaar_id', 'UPHR-' || floor(random() * 9000000000 + 1000000000)::text),
    coalesce(new.raw_user_meta_data->>'role', 'CITIZEN'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', new.id::text),
    '',
    new.raw_user_meta_data->>'face_photo_url'
  );
  
  -- If the user role is CITIZEN, also initialize their medical profile
  if coalesce(new.raw_user_meta_data->>'role', 'CITIZEN') = 'CITIZEN' then
    insert into public.medical_profiles (user_id, dob)
    values (new.id::text, new.raw_user_meta_data->>'dob');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
