# GeoTrack-RSP — Industrial Trainee Tracking & Safety Monitoring System

GeoTrack-RSP is a full-stack safety management and operations dashboard designed for Rourkela Steel Plant (SAIL) to monitor industrial trainees inside the plant premises. It coordinates live location streaming, automated shift attendance logging, geofencing boundary analysis, and instant pointer-hold SOS alarms.

## 🚀 Tech Stack
* **Frontend**: React + Vite + Tailwind CSS v4 + PostCSS
* **Backend & Database**: Supabase (Auth, Realtime, PostgreSQL)
* **Map Services**: Leaflet.js + OpenStreetMap (using CartoDB clean Positron tiles)
* **Data Visualization**: Recharts
* **Icons**: Lucide React
* **Router & Toasts**: React Router v6 & React Hot Toast

---

## 🛠️ Project Setup & Commands

### 1. Install Dependencies
Clone/navigate to the project and run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file at the root of the project:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Spin Up Supabase Database Tables
Run the following SQL in your Supabase SQL Editor to initialize tables, row-level security (RLS) policies, and seed geofence parameters:

```sql
-- Users/Trainees table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('trainee', 'admin')),
  institution text,
  division text,
  contact text,
  employee_id text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- Trainee live locations
create table public.locations (
  id uuid default gen_random_uuid() primary key,
  trainee_id uuid references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz default now()
);

-- Attendance records
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  trainee_id uuid references public.profiles(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status text default 'present' check (status in ('present', 'absent', 'late')),
  created_at timestamptz default now(),
  unique(trainee_id, date)
);

-- Geofence zones
create table public.geofence_zones (
  id uuid default gen_random_uuid() primary key,
  zone_name text not null,
  zone_type text not null check (zone_type in ('permitted', 'restricted', 'plant_boundary')),
  coordinates jsonb not null, -- array of {lat, lng} objects forming polygon
  color text default '#3B82F6',
  created_at timestamptz default now()
);

-- Alerts (SOS + geofence breaches)
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  trainee_id uuid references public.profiles(id) on delete cascade,
  alert_type text not null check (alert_type in ('SOS', 'geofence_breach')),
  latitude double precision,
  longitude double precision,
  zone_id uuid references public.geofence_zones(id),
  message text,
  resolved boolean default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.attendance enable row level security;
alter table public.geofence_zones enable row level security;
alter table public.alerts enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Allow insert on signup" on public.profiles for insert with check (auth.uid() = id);

create policy "Trainees insert own location" on public.locations for insert with check (auth.uid() = trainee_id);
create policy "Trainees update own location" on public.locations for update using (auth.uid() = trainee_id);
create policy "Admins view all locations" on public.locations for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Trainees view own location" on public.locations for select using (auth.uid() = trainee_id);

create policy "Admins manage attendance" on public.attendance for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Trainees view own attendance" on public.attendance for select using (auth.uid() = trainee_id);
create policy "Trainees insert own attendance" on public.attendance for insert with check (auth.uid() = trainee_id);
create policy "Trainees update own attendance" on public.attendance for update using (auth.uid() = trainee_id);

create policy "Everyone can view geofences" on public.geofence_zones for select using (true);
create policy "Admins manage geofences" on public.geofence_zones for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Trainees insert own alerts" on public.alerts for insert with check (auth.uid() = trainee_id);
create policy "Admins manage all alerts" on public.alerts for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Trainees view own alerts" on public.alerts for select using (auth.uid() = trainee_id);

-- Enable Realtime on locations and alerts tables
alter publication supabase_realtime add table public.locations;
alter publication supabase_realtime add table public.alerts;

-- Insert demo geofence zones for RSP
insert into public.geofence_zones (zone_name, zone_type, coordinates, color) values
('RSP Plant Boundary', 'plant_boundary', '[{"lat":22.2551,"lng":84.8823},{"lat":22.2601,"lng":84.8823},{"lat":22.2601,"lng":84.8923},{"lat":22.2551,"lng":84.8923}]', '#10B981'),
('RMHP Zone', 'permitted', '[{"lat":22.2561,"lng":84.8833},{"lat":22.2581,"lng":84.8833},{"lat":22.2581,"lng":84.8873},{"lat":22.2561,"lng":84.8873}]', '#3B82F6'),
('Blast Furnace Restricted Area', 'restricted', '[{"lat":22.2571,"lng":84.8853},{"lat":22.2576,"lng":84.8853},{"lat":22.2576,"lng":84.8863},{"lat":22.2571,"lng":84.8863}]', '#EF4444');
```

### 4. Seed Demo Accounts
Navigate to the Register page on your browser and sign up with:
* **Admin / Supervisor**:
  * Email: `admin@geotrack.com`
  * Password: `Admin@123`
  * Role: `Admin`
* **Trainee / Worker**:
  * Email: `trainee@geotrack.com`
  * Password: `Trainee@123`
  * Role: `Trainee`
  * Division: `RMHP`
  * Institution: `Govt Polytechnic Darlipali`

### 5. Launch local dev environment
```bash
npm run dev
```

### 6. Build production bundles
```bash
npm run build
```

---

## 🛡️ Key Safety & Real-time Implementations

1. **Global Location Broadcasting**: Tracking coordinates runs at the global context level to persist location sharing when navigating away from the dashboard. Writes are debounced to max once every 5 seconds.
2. **Point-in-Polygon Scanner**: Scans user location updates. If entering a restricted polygon or leaving a permitted zone (while within the plant boundary), a geofence breach alert is generated.
3. **Automated Attendance Logs**: Checks in the trainee upon entering the plant boundary zone. Automatically updates the checkout timestamp upon exiting.
4. **Three-Second Hold SOS**: Requires the user to hold the SOS button for 3 seconds to prevent accidental alarms. Animates a progress stroke ring, triggers sound alerts on supervisors' screens, and dispatches current location telemetry.
5. **Real-time Postgres channels**: Admin dashboards auto-refresh markers on map updates and display notifications immediately when security breach alerts are inserted.
