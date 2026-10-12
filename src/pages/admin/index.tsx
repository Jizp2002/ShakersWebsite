import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileText,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { GalleryManager } from '../../components/gallery';
import { ErrorText, PageHeading, useAction } from '../../components/ui';
import { useMe, useStore } from '../../lib/store';
import type { Membership, PrayerReport } from '../../types';
import { AdminAttendance } from './AdminAttendance';
import { AdminContent } from './AdminContent';
import { AdminEvents } from './AdminEvents';
import { AdminMembers } from './AdminMembers';
import { AdminModeration } from './AdminModeration';
import { AdminOverview } from './AdminOverview';
import { AdminTeams } from './AdminTeams';
import { Editor } from './Editor';
import type { Editable, Values } from './types';

export function Admin() {
  const { data, userId, rpc, save } = useStore();
  const { membership } = useMe();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [tab, setTab] = useState(urlTab || 'Resumen');
  const [edit, setEdit] = useState<{ table: Editable; row?: Values } | null>(null);

  useEffect(() => {
    if (urlTab) setTab(urlTab);
    if (searchParams.get('action') === 'new') {
      const targetTable = (searchParams.get('table') as Editable) || 'events';
      setEdit({ table: targetTable });
    }
  }, [searchParams, urlTab]);

  const [selectedEvent, setSelectedEvent] = useState('');
  const [guardian, setGuardian] = useState<Record<string, boolean>>({});
  const { act, error, pending } = useAction();

  if (!membership || membership.status !== 'approved' || membership.role === 'member')
    return <Navigate to="/app" replace />;

  const admin = membership.role === 'admin';
  const ownedEvents = data.events.filter((e) => admin || e.owner_id === userId);
  const eventId = selectedEvent || ownedEvents[0]?.id || '';
  const profile = (id: string) => data.profiles.find((p) => p.id === id);
  const memberName = (id: string) => profile(id)?.name || 'Miembro';
  const manageTeams = data.teams.filter((t) => admin || t.leader_id === userId);
  const pendingMembers = data.memberships.filter(
    (m) => m.status === 'pending' && (admin || m.requested_role !== 'leader'),
  );
  const approvedMembers = data.memberships.filter((m) => m.status !== 'pending');
  const reviewPrayers = data.prayers.filter(
    (p) => (admin || p.visibility === 'community') && p.status === 'pending',
  );

  const staffTabs = [
    { label: 'Resumen', icon: LayoutDashboard },
    { label: 'Encuentros', icon: CalendarDays },
    { label: 'Asistencia', icon: ClipboardCheck },
    { label: 'Equipos', icon: Users },
    { label: 'Miembros', icon: ShieldCheck },
    { label: 'Contenido', icon: FileText },
    { label: 'Galería', icon: Camera },
    { label: 'Moderación', icon: Heart },
  ];

  const openNew = (table: Editable) => setEdit({ table });
  const openEdit = (table: Editable, row: Values) => setEdit({ table, row });

  return (
    <>
      <PageHeading
        eyebrow="CUIDAMOS LA COMUNIDAD"
        title="Todo en su lugar."
        description="Organiza lo importante y dedica más tiempo a las personas."
      />
      <nav className="admin-tabs" aria-label="Secciones de administración">
        {staffTabs.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={tab === label ? 'active' : ''}
            onClick={() => setTab(label)}
          >
            <Icon size={17} />
            {label}
            {label === 'Miembros' && pendingMembers.length > 0 && (
              <span>{pendingMembers.length}</span>
            )}
          </button>
        ))}
      </nav>
      <ErrorText error={error} />

      {tab === 'Resumen' && (
        <AdminOverview
          data={data}
          admin={admin}
          ownedEvents={ownedEvents}
          pendingMembersCount={pendingMembers.length}
          reviewPrayersCount={reviewPrayers.length}
          manageTeams={manageTeams}
          memberName={memberName}
          onNavigateTab={setTab}
          onOpenNew={openNew}
        />
      )}

      {tab === 'Encuentros' && (
        <AdminEvents
          events={ownedEvents}
          userId={userId}
          onOpenNew={openNew}
          onOpenEdit={openEdit}
        />
      )}

      {tab === 'Asistencia' && (
        <AdminAttendance
          events={ownedEvents}
          selectedEventId={eventId}
          onSelectEvent={setSelectedEvent}
          registrations={data.registrations}
          attendance={data.attendance}
          memberName={memberName}
          pending={pending}
          onToggleAttendance={(targetEventId, targetUserId, present) => {
            void act(
              () =>
                rpc('set_attendance', {
                  p_event_id: targetEventId,
                  p_user_id: targetUserId,
                  p_present: present,
                }),
              'Asistencia actualizada.',
            );
          }}
        />
      )}

      {tab === 'Equipos' && (
        <AdminTeams
          data={data}
          manageTeams={manageTeams}
          memberName={memberName}
          onOpenNew={openNew}
          onOpenEdit={openEdit}
        />
      )}

      {tab === 'Miembros' && (
        <AdminMembers
          pendingMembers={pendingMembers}
          approvedMembers={approvedMembers}
          profiles={data.profiles}
          admin={admin}
          userId={userId}
          memberName={memberName}
          guardian={guardian}
          pending={pending}
          onGuardianChange={(targetUserId, confirmed) => {
            setGuardian((prev) => ({ ...prev, [targetUserId]: confirmed }));
          }}
          onReviewMember={(
            targetUserId,
            status,
            role,
            guardianConfirmed,
            guardianName,
            guardianPhone,
          ) => {
            void act(
              () =>
                rpc('review_member', {
                  p_user_id: targetUserId,
                  p_status: status,
                  p_role: role,
                  p_guardian: guardianConfirmed,
                  p_guardian_name: guardianName || null,
                  p_guardian_phone: guardianPhone || null,
                }),
              status === 'approved'
                ? 'Nuevo miembro aprobado.'
                : status === 'rejected'
                  ? 'Solicitud revisada.'
                  : 'Estado de acceso actualizado.',
            );
          }}
        />
      )}

      {tab === 'Contenido' && (
        <AdminContent
          data={data}
          admin={admin}
          userId={userId}
          onOpenNew={openNew}
          onOpenEdit={openEdit}
        />
      )}

      {tab === 'Galería' && <GalleryManager />}

      {tab === 'Moderación' && (
        <AdminModeration
          reviewPrayers={reviewPrayers}
          prayerReports={data.prayer_reports}
          prayers={data.prayers}
          memberName={memberName}
          pending={pending}
          onReviewPrayer={(prayerId, prayerStatus) => {
            void act(
              () => rpc('review_prayer', { p_prayer_id: prayerId, p_status: prayerStatus }),
              prayerStatus === 'approved'
                ? 'Petición aprobada.'
                : 'Petición no publicada.',
            );
          }}
          onResolveReport={(report: PrayerReport) => {
            void act(
              () => save('prayer_reports', { ...report, resolved: true }),
              'Reporte resuelto.',
            );
          }}
          onRejectReportedPrayer={(prayerId: string) => {
            void act(
              () => rpc('review_prayer', { p_prayer_id: prayerId, p_status: 'rejected' }),
              'Petición retirada del muro.',
            );
          }}
        />
      )}

      {edit && <Editor table={edit.table} row={edit.row} close={() => setEdit(null)} />}
    </>
  );
}
