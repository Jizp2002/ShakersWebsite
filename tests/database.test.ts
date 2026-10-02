import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
let db: PGlite;
const id = (n: number) => '11111111-1111-4111-8111-' + String(n).padStart(12, '0');
const admin = id(1),
  leader = id(2),
  member = id(3),
  other = id(4),
  minor = id(5),
  suspended = id(6);
const event = id(11),
  privateEvent = id(12),
  poll = id(21),
  team = id(31);
async function asUser<T = Record<string, unknown>>(
  user: string | null,
  sql: string,
  params: unknown[] = [],
) {
  return db.transaction(async (tx) => {
    await tx.exec('SET LOCAL ROLE ' + (user ? 'authenticated' : 'anon'));
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
    return (await tx.query<T>(sql, params)).rows;
  });
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select,insert,delete on storage.objects to anon,authenticated;",
  );
  await db.exec(await readFile('supabase/migrations/202609220001_community.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202609220002_storage.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202609220003_notifications.sql', 'utf8'));
  await db.exec(
    await readFile('supabase/migrations/20261001183459_profile_photos_gallery.sql', 'utf8'),
  );
  await db.exec(
    await readFile('supabase/migrations/20261002003551_membership_role_requests.sql', 'utf8'),
  );
  for (const [i, name, role, status, age] of [
    [1, 'Coordinador', 'admin', 'approved', '18+'],
    [2, 'Líder', 'leader', 'approved', '18+'],
    [3, 'Miembro Uno', 'member', 'approved', '18+'],
    [4, 'Miembro Dos', 'member', 'approved', '18+'],
    [5, 'Adolescente', 'member', 'pending', '13-17'],
    [6, 'Suspendido', 'member', 'suspended', '18+'],
  ]) {
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      id(Number(i)),
      JSON.stringify({ full_name: name }),
    ]);
    await db.query('update public.profiles set age_group=$1 where id=$2', [age, id(Number(i))]);
    await db.query('insert into public.memberships(id,role,status) values($1,$2,$3)', [
      id(Number(i)),
      role,
      status,
    ]);
  }
  await db.query(
    "insert into public.events(id,title,description,starts_at,ends_at,location,category,capacity,visibility,status,owner_id) values($1,'Encuentro público','Descripción de prueba',now()+interval '2 days',now()+interval '2 days 2 hours','Auditorio','Encuentro',1,'public','published',$3),($2,'Encuentro privado','Descripción privada',now()+interval '3 days',now()+interval '3 days 2 hours','Sala','Estudio',20,'private','published',$3)",
    [event, privateEvent, leader],
  );
  await db.query(
    "insert into public.polls(id,question,options,closes_at,status,owner_id) values($1,'¿Qué prefieres para el encuentro?',array['Música','Servicio'],now()+interval '2 days','published',$2)",
    [poll, admin],
  );
  await db.query('insert into public.teams(id,name,description,leader_id) values($1,$2,$3,$4)', [
    team,
    'Equipo de prueba',
    'Descripción',
    leader,
  ]);
  await db.query('insert into public.team_members(team_id,user_id) values($1,$2)', [team, member]);
});
afterAll(async () => {
  await db?.close();
});
describe('Database permissions and domain operations', () => {
  it('exposes only public content to visitors', async () => {
    expect(await asUser(null, 'select id from public.events')).toHaveLength(1);
    for (const t of [
      'profiles',
      'memberships',
      'registrations',
      'attendance',
      'teams',
      'prayers',
      'prayer_authors',
      'votes',
      'polls',
      'audit_log',
    ])
      expect(await asUser(null, 'select * from public.' + t)).toHaveLength(0);
  });
  it('blocks pending and suspended access to private content and actions', async () => {
    for (const user of [minor, suspended]) {
      expect(
        await asUser(user, "select id from public.events where visibility='private'"),
      ).toHaveLength(0);
      await expect(
        asUser(user, 'select public.set_registration($1,true)', [event]),
      ).rejects.toThrow(/aprobado/);
    }
  });
  it('rejects direct role escalation and unauthorized definer calls', async () => {
    await expect(
      asUser(member, "update public.memberships set role='admin' where id=$1", [member]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(member, "select public.review_member($1,'approved','admin',false)", [member]),
    ).rejects.toThrow(/permiso/);
    await expect(asUser(member, "select public.log_action('forged')")).rejects.toThrow(
      /permission denied/,
    );
  });
  it('requires guardian confirmation for minors and adult leaders', async () => {
    await expect(
      asUser(leader, "select public.review_member($1,'approved','member',false)", [minor]),
    ).rejects.toThrow(/responsable/);
    await expect(
      asUser(admin, "select public.review_member($1,'approved','leader',true)", [minor]),
    ).rejects.toThrow(/adulto/);
    await asUser(leader, "select public.review_member($1,'approved','member',true)", [minor]);
    expect(
      (await asUser(minor, 'select status from public.memberships where id=$1', [minor]))[0].status,
    ).toBe('approved');
  });
  it('makes registrations idempotent and rejects overbooking', async () => {
    await asUser(member, 'select public.set_registration($1,true)', [event]);
    await asUser(member, 'select public.set_registration($1,true)', [event]);
    expect(
      (await asUser(null, 'select public.event_registration_count($1) as n', [event]))[0].n,
    ).toBe(1);
    await expect(asUser(other, 'select public.set_registration($1,true)', [event])).rejects.toThrow(
      /completo/,
    );
    await expect(
      asUser(member, 'insert into public.registrations(event_id,user_id) values($1,$2)', [
        privateEvent,
        member,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(leader, "update public.events set status='draft' where id=$1", [event]),
    ).rejects.toThrow(/borrador/);
  });
  it('limits attendance to responsible leaders and avoids duplicates', async () => {
    await expect(
      asUser(member, 'select public.set_attendance($1,$2,true)', [event, member]),
    ).rejects.toThrow(/permiso/);
    await asUser(leader, 'select public.set_attendance($1,$2,true)', [event, member]);
    await asUser(leader, 'select public.set_attendance($1,$2,true)', [event, member]);
    expect(await asUser(member, 'select * from public.attendance')).toHaveLength(1);
    expect(await asUser(other, 'select * from public.attendance')).toHaveLength(0);
    await asUser(member, 'select public.set_registration($1,false)', [event]);
    await asUser(other, 'select public.set_registration($1,true)', [event]);
    expect(await asUser(member, 'select * from public.attendance')).toHaveLength(0);
  });
  it('keeps one seat when independent transactions request the last spot', async () => {
    await asUser(other, 'select public.set_registration($1,false)', [event]);
    const results = await Promise.allSettled([
      asUser(member, 'select public.set_registration($1,true)', [event]),
      asUser(other, 'select public.set_registration($1,true)', [event]),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.registrations where event_id=$1',
          [event],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('hides private prayers from leaders and other members', async () => {
    await asUser(
      member,
      "select public.submit_prayer('Petición privada de prueba','private',false)",
    );
    const prayers = await asUser<{ id: string }>(member, 'select id from public.prayers');
    expect(prayers).toHaveLength(1);
    expect(await asUser(leader, 'select * from public.prayers')).toHaveLength(0);
    expect(await asUser(other, 'select * from public.prayers')).toHaveLength(0);
    expect(await asUser(admin, 'select * from public.prayers')).toHaveLength(1);
    await expect(
      asUser(leader, "select public.review_prayer($1,'approved')", [prayers[0].id]),
    ).rejects.toThrow(/permiso/);
  });
  it('publishes moderated anonymous prayers without author identifiers', async () => {
    await asUser(
      member,
      "select public.submit_prayer('Petición anónima para compartir','community',true)",
    );
    const [prayer] = await asUser<{ id: string }>(
      member,
      "select id from public.prayers where visibility='community'",
    );
    expect(await asUser(other, 'select * from public.prayers')).toHaveLength(0);
    await asUser(leader, "select public.review_prayer($1,'approved')", [prayer.id]);
    const shared = await asUser<{ user_id: string | null; author_label: string }>(
      other,
      'select * from public.prayers',
    );
    expect(shared).toHaveLength(1);
    expect(shared[0].user_id).toBeNull();
    expect(shared[0].author_label).toBe('Alguien de la comunidad');
    expect(await asUser(other, 'select * from public.prayer_authors')).toHaveLength(0);
    await asUser(other, 'select public.react_to_prayer($1)', [prayer.id]);
    await asUser(other, 'select public.react_to_prayer($1)', [prayer.id]);
    expect(await asUser(other, 'select * from public.prayer_reactions')).toHaveLength(0);
    await asUser(other, "select public.report_prayer($1,'Necesita revisión del equipo')", [
      prayer.id,
    ]);
    await asUser(other, "select public.report_prayer($1,'Nueva información para revisar')", [
      prayer.id,
    ]);
    expect(await asUser(leader, 'select * from public.prayer_reports')).toHaveLength(1);
  });
  it('allows one mutable vote per member and exposes aggregate results only', async () => {
    await asUser(member, 'select public.cast_vote($1,0)', [poll]);
    await asUser(member, 'select public.cast_vote($1,1)', [poll]);
    expect(await asUser(member, 'select * from public.votes')).toHaveLength(1);
    expect(await asUser(other, 'select * from public.votes')).toHaveLength(0);
    expect(
      (await asUser(other, 'select public.poll_results($1) as counts', [poll]))[0].counts,
    ).toEqual([0, 1]);
    await expect(asUser(member, 'select public.cast_vote($1,8)', [poll])).rejects.toThrow(
      /inválida/,
    );
    await expect(
      asUser(admin, "update public.polls set options=array['Nueva','Otra'] where id=$1", [poll]),
    ).rejects.toThrow(/votos/);
  });
  it('enforces one active poll and prevents votes after closure', async () => {
    await expect(
      asUser(
        admin,
        "insert into public.polls(question,options,closes_at,status,owner_id) values('Otra encuesta',array['Sí','No'],now()+interval '1 day','published',$1)",
        [admin],
      ),
    ).rejects.toThrow(/activa/);
    await asUser(admin, "update public.polls set closes_at=now()-interval '1 second' where id=$1", [
      poll,
    ]);
    await expect(asUser(member, 'select public.cast_vote($1,0)', [poll])).rejects.toThrow(
      /cerrada/,
    );
  });
  it('isolates assignments and limits edits to the responsible leader', async () => {
    const [a] = await asUser<{ id: string }>(
      leader,
      "insert into public.assignments(team_id,event_id,user_id,task) values($1,$2,$3,'Recibir a nuevos visitantes') returning id",
      [team, privateEvent, member],
    );
    expect(await asUser(other, 'select * from public.assignments')).toHaveLength(0);
    await expect(
      asUser(other, "select public.respond_assignment($1,'confirmed')", [a.id]),
    ).rejects.toThrow(/disponible/);
    await asUser(member, "select public.respond_assignment($1,'confirmed')", [a.id]);
    expect(
      (await asUser(member, 'select status from public.assignments where id=$1', [a.id]))[0].status,
    ).toBe('confirmed');
    const blocked = await asUser(
      member,
      "update public.assignments set task='otra' where id=$1 returning id",
      [a.id],
    );
    expect(blocked).toHaveLength(0);
  });
  it('notifies enrolled members of event changes without exposing another inbox', async () => {
    await asUser(leader, "update public.events set location='Nueva sala' where id=$1", [event]);
    const [registration] = (
      await db.query<{ user_id: string }>(
        'select user_id from public.registrations where event_id=$1',
        [event],
      )
    ).rows;
    const notices = await asUser<{ id: string }>(
      registration.user_id,
      'select id from public.notifications where event_id=$1',
      [event],
    );
    expect(notices.length).toBeGreaterThan(0);
    expect(await asUser(null, 'select * from public.notifications')).toHaveLength(0);
    const outsider = registration.user_id === member ? other : member;
    expect(
      await asUser(outsider, 'select * from public.notifications where event_id=$1', [event]),
    ).toHaveLength(0);
    await asUser(registration.user_id, 'select public.mark_notification($1)', [notices[0].id]);
    expect(
      (
        await asUser(registration.user_id, 'select read_at from public.notifications where id=$1', [
          notices[0].id,
        ])
      )[0].read_at,
    ).not.toBeNull();
  });
  it('protects private documents and disallows uploads by members', async () => {
    const path = admin + '/' + id(90) + '.pdf';
    await db.query("insert into storage.objects(bucket_id,name) values('documents',$1)", [path]);
    await asUser(
      admin,
      "insert into public.resources(title,description,category,kind,url,status,visibility,owner_id) values('Guía privada','Documento de estudio','Estudio','pdf',$1,'published','private',$2)",
      ['storage://documents/' + path, admin],
    );
    expect(
      await asUser(null, "select * from storage.objects where bucket_id='documents'"),
    ).toHaveLength(0);
    expect(
      await asUser(member, "select * from storage.objects where bucket_id='documents'"),
    ).toHaveLength(1);
    expect(
      await asUser(suspended, "select * from storage.objects where bucket_id='documents'"),
    ).toHaveLength(0);
    await expect(
      asUser(member, "insert into storage.objects(bucket_id,name) values('media',$1)", [
        member + '/fake.webp',
      ]),
    ).rejects.toThrow(/row-level/);
  });
});

describe('Profile photos and event galleries', () => {
  it('keeps avatars private and prevents another member from assigning or deleting them', async () => {
    const path = member + '/portrait.webp';
    const url = 'storage://avatars/' + path;
    await asUser(member, "insert into storage.objects(bucket_id,name) values('avatars',$1)", [
      path,
    ]);
    await asUser(member, 'select public.save_profile($1,$2,$3)', ['Miembro Uno', 'Música', url]);
    expect(
      await asUser(null, "select * from storage.objects where bucket_id='avatars'"),
    ).toHaveLength(0);
    expect(
      await asUser(other, "select * from storage.objects where bucket_id='avatars'"),
    ).toHaveLength(0);
    expect(
      await asUser(admin, "select * from storage.objects where bucket_id='avatars'"),
    ).toHaveLength(1);
    await expect(
      asUser(other, 'select public.save_profile($1,$2,$3)', ['Otro', '', url]),
    ).rejects.toThrow(/propio perfil/);
    await asUser(other, "delete from storage.objects where bucket_id='avatars'");
    expect(
      await asUser(member, "select * from storage.objects where bucket_id='avatars'"),
    ).toHaveLength(1);
    await expect(
      asUser(suspended, 'select public.save_profile($1,$2,null)', ['Suspendido', '']),
    ).rejects.toThrow(/aprobado/);
    await expect(
      asUser(member, 'select public.save_profile($1,$2,$3)', [
        'Miembro Uno',
        '',
        'https://example.com/a.webp',
      ]),
    ).rejects.toThrow(/propio perfil/);
    await asUser(member, 'select public.save_profile($1,$2,null)', ['Miembro Uno', 'Música']);
    expect(
      (await asUser(member, 'select avatar_url from public.profiles where id=$1', [member]))[0]
        .avatar_url,
    ).toBeNull();
    await asUser(member, "delete from storage.objects where bucket_id='avatars'");
  });
  it('requires consent and event ownership, and hides private and unpublished gallery files', async () => {
    const path = leader + '/gallery.webp';
    const url = 'storage://gallery/' + path;
    const photo = id(91);
    await asUser(leader, "insert into storage.objects(bucket_id,name) values('gallery',$1)", [
      path,
    ]);
    const insert =
      "insert into public.gallery_photos(id,event_id,owner_id,image_url,caption,consent,published) values($1,$2,$3,$4,'Momento de prueba',false,true)";
    await expect(asUser(leader, insert, [photo, event, leader, url])).rejects.toThrow(
      /check constraint/,
    );
    await expect(
      asUser(member, insert.replace('false,true', 'true,true'), [
        photo,
        event,
        member,
        'storage://gallery/' + member + '/x.webp',
      ]),
    ).rejects.toThrow(/row-level security/);
    await asUser(leader, insert.replace('false,true', 'true,true'), [
      photo,
      privateEvent,
      leader,
      url,
    ]);
    expect(await asUser(null, 'select * from public.gallery_photos')).toHaveLength(0);
    expect(
      await asUser(null, "select * from storage.objects where bucket_id='gallery'"),
    ).toHaveLength(0);
    expect(await asUser(other, 'select * from public.gallery_photos')).toHaveLength(1);
    await asUser(leader, 'update public.gallery_photos set event_id=$1 where id=$2', [
      event,
      photo,
    ]);
    expect(await asUser(null, 'select * from public.gallery_photos')).toHaveLength(1);
    expect(
      await asUser(null, "select * from storage.objects where bucket_id='gallery'"),
    ).toHaveLength(1);
    await asUser(leader, 'update public.gallery_photos set published=false where id=$1', [photo]);
    expect(
      await asUser(null, "select * from storage.objects where bucket_id='gallery'"),
    ).toHaveLength(0);
    expect(await asUser(other, 'select * from public.gallery_photos')).toHaveLength(0);
    await asUser(leader, 'delete from public.gallery_photos where id=$1', [photo]);
    await asUser(leader, "delete from storage.objects where bucket_id='gallery'");
  });
});

describe('Requested roles and coordinator access', () => {
  it('stores a leader request without granting leadership and requires coordinator review', async () => {
    const newcomer = id(900);
    await db.query('insert into auth.users(id) values($1)', [newcomer]);
    await asUser(newcomer, "select public.submit_membership('Nueva persona','18+','','leader')");
    const rows = await asUser(
      newcomer,
      'select role,requested_role,status from public.memberships where id=$1',
      [newcomer],
    );
    expect(rows[0]).toMatchObject({ role: 'member', requested_role: 'leader', status: 'pending' });
    await expect(
      asUser(leader, "select public.review_member($1,'approved','member',false)", [newcomer]),
    ).rejects.toThrow(/coordinación/);
    await asUser(admin, "select public.review_member($1,'approved','leader',false)", [newcomer]);
    expect(
      (await asUser(newcomer, 'select role from public.memberships where id=$1', [newcomer]))[0]
        .role,
    ).toBe('leader');
  });
  it('rejects admin registration, minor leadership and assigning additional coordinators', async () => {
    const newcomer = id(901);
    await db.query('insert into auth.users(id) values($1)', [newcomer]);
    await expect(
      asUser(newcomer, "select public.submit_membership('Nueva persona','18+','','admin')"),
    ).rejects.toThrow(/joven o líder/);
    await expect(
      asUser(newcomer, "select public.submit_membership('Nueva persona','13-17','','leader')"),
    ).rejects.toThrow(/adulto/);
    await expect(
      asUser(admin, "select public.review_member($1,'approved','admin',false)", [member]),
    ).rejects.toThrow(/reservado/);
    await expect(
      asUser(null, "select public.submit_membership('Intruso','18+','','leader')"),
    ).rejects.toThrow(/permission denied/);
  });
});
