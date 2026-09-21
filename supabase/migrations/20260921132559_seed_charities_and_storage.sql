insert into charities (slug, name, tagline, description, category, is_featured) values
('mind-the-gap','Mind The Gap','Mental health support for men over 40',
 'One in eight men lives with a mental health problem and most never speak to anyone about it. Mind The Gap funds free counselling, peer groups and a 24-hour text line for men who would rather do anything than ask for help.',
 'Mental health', true),
('second-swing','Second Swing','Sport and mentoring for care leavers',
 'Young people leaving the care system often lose every adult relationship they had overnight. Second Swing pairs them with mentors and covers the cost of coaching, kit and club membership for two full years.',
 'Youth', false),
('greenfields-trust','Greenfields Trust','Protecting open green space',
 'Greenfields Trust buys threatened green space and holds it in trust forever. Since 2009 it has secured 340 hectares, all of it free to walk, and plants 40,000 native trees a year.',
 'Environment', false),
('the-long-walk','The Long Walk','Rehabilitation for injured veterans',
 'Life-changing injury ends a military career in an afternoon. The Long Walk funds prosthetics the health service will not, adaptive sport, and the retraining that turns a medical discharge into a second career.',
 'Veterans', false),
('bright-start','Bright Start','Breakfast clubs in primary schools',
 'A child who arrives at school hungry is already behind by nine in the morning. Bright Start runs free breakfast clubs in 120 primary schools, serving 18,000 meals every week with no questions asked.',
 'Children', false),
('open-heart','Open Heart','Cardiac screening for young athletes',
 'Twelve young people a week die from undiagnosed heart conditions. Open Heart runs free screening clinics for 14-35 year olds and has detected conditions in more than 2,000 of them so far.',
 'Health', false),
('safe-harbour','Safe Harbour','Emergency housing for families',
 'Safe Harbour keeps families together during the worst weeks of their lives, providing emergency accommodation and casework that gets them back into a permanent home in an average of 94 days.',
 'Housing', false),
('the-quiet-hour','The Quiet Hour','Companionship for isolated older people',
 'Nearly a million older people go more than a month without speaking to anyone. The Quiet Hour matches volunteers with people living alone for a weekly visit that lasts as long as it is wanted.',
 'Ageing', false);

insert into charity_events (charity_id, title, description, location, event_date)
select id, 'Spring Charity Golf Day', 'An eighteen-hole shotgun start, lunch and an auction. Teams of four, all proceeds direct to the cause.', 'Wentworth Club, Surrey', current_date + 45
from charities where slug = 'mind-the-gap';

insert into charity_events (charity_id, title, description, location, event_date)
select id, 'Midnight Walk', 'A ten-mile night walk through the city. Bring a head torch and someone you would like to talk to.', 'Manchester', current_date + 70
from charities where slug = 'second-swing';

insert into charity_events (charity_id, title, description, location, event_date)
select id, 'Summer Tree Planting Weekend', 'Two days, four thousand saplings, and a barbecue at the end of it.', 'Peak District', current_date + 96
from charities where slug = 'greenfields-trust';

-- Private bucket for winner proof screenshots. Access is brokered by signed
-- URLs from the server, so no public read policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('winner-proof', 'winner-proof', false, 5242880,
        array['image/png','image/jpeg','image/webp']);

-- A winner uploads into a folder named after their own user id.
create policy "winner uploads own proof" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'winner-proof' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "winner reads own proof" on storage.objects
  for select to authenticated
  using (bucket_id = 'winner-proof' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
