import { emptyData, type Data } from '../types';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const demoIds = { member: id(1), leader: id(2), admin: id(3), pending: id(4) };
export function demoSeed(): Data {
  const d = emptyData();
  const future = (days: number, hour = 19) => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + days);
    return `${day.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00-04:00`;
  };
  const now = new Date().toISOString();
  d.profiles = [
    {
      id: id(1),
      name: 'Alex Rivera',
      age_group: '18+',
      interests: 'Música, servir y conocer gente',
      avatar_url: null,
    },
    {
      id: id(2),
      name: 'Sara Méndez',
      age_group: '18+',
      interests: 'Alabanza y comunidad',
      avatar_url: null,
    },
    {
      id: id(3),
      name: 'Daniel Pérez',
      age_group: '18+',
      interests: 'Coordinación',
      avatar_url: null,
    },
    {
      id: id(4),
      name: 'Sofía Torres',
      age_group: '13-17',
      interests: 'Arte y música',
      avatar_url: null,
    },
    {
      id: id(5),
      name: 'Mateo García',
      age_group: '18+',
      interests: 'Multimedia',
      avatar_url: null,
    },
  ];
  d.memberships = d.profiles.map((p, i) => ({
    id: p.id,
    role: i === 1 ? 'leader' : i === 2 ? 'admin' : 'member',
    status: i === 3 ? 'pending' : 'approved',
    guardian_confirmed: false,
    created_at: now,
  }));
  d.events = [
    {
      id: id(11),
      title: 'Una noche. Un encuentro. Algo nuevo.',
      description:
        'Nos reunimos para adorar, conversar y descubrir juntos lo que Dios está haciendo en nuestra generación. Ven como eres. Hay un lugar para ti.\n\nTrae a un amigo, tu Biblia y todas tus ganas de conectar. Las puertas abren 30 minutos antes.',
      starts_at: future(3),
      ends_at: future(3, 21),
      location: 'Auditorio principal · Ubicación de ejemplo',
      category: 'Encuentro',
      capacity: 100,
      visibility: 'public',
      status: 'published',
      image_url: '/images/worship.jpg',
      owner_id: id(2),
    },
    {
      id: id(12),
      title: 'Pequeñas acciones, gran impacto',
      description:
        'Una mañana para servir a nuestra comunidad. Nos organizaremos en equipos para compartir tiempo, escuchar y ayudar.\n\nLleva ropa cómoda, agua y disposición para servir.',
      starts_at: future(8, 9),
      ends_at: future(8, 12),
      location: 'Punto de encuentro · Por confirmar',
      category: 'Servicio',
      capacity: 30,
      visibility: 'public',
      status: 'published',
      image_url: '/images/friends.jpg',
      owner_id: id(3),
    },
    {
      id: id(13),
      title: 'Fe, café y buenas preguntas',
      description:
        'Un espacio tranquilo para abrir la Biblia y conversar sin prisa. Esta semana: encontrar propósito en lo cotidiano.',
      starts_at: future(10, 17),
      ends_at: future(10, 19),
      location: 'Sala de jóvenes · Ubicación de ejemplo',
      category: 'Estudio',
      capacity: 20,
      visibility: 'private',
      status: 'published',
      image_url: '/images/study.jpg',
      owner_id: id(2),
    },
  ];
  d.registrations = [{ id: id(21), user_id: id(5), event_id: id(11), created_at: now }];
  d.teams = [
    {
      id: id(31),
      name: 'Bienvenida',
      description: 'Hacemos que cada persona se sienta en casa.',
      leader_id: id(2),
    },
    {
      id: id(32),
      name: 'Multimedia',
      description: 'Contamos lo que vivimos a través de imágenes.',
      leader_id: id(3),
    },
  ];
  d.team_members = [
    { id: id(33), team_id: id(31), user_id: id(1) },
    { id: id(34), team_id: id(32), user_id: id(5) },
  ];
  d.assignments = [
    {
      id: id(35),
      team_id: id(31),
      event_id: id(11),
      user_id: id(1),
      task: 'Recibir a quienes nos visitan por primera vez',
      status: 'pending',
    },
  ];
  d.announcements = [
    {
      id: id(41),
      title: 'Esta semana, ven con alguien nuevo',
      body: 'Todos tenemos un amigo que necesita un lugar para conectar. Invítalo al próximo encuentro. ¡Lo estaremos esperando!',
      featured: true,
      team_id: null,
      expires_at: future(7),
      status: 'published',
      owner_id: id(2),
    },
  ];
  d.resources = [
    {
      id: id(51),
      title: 'Tu propósito también vive en lo cotidiano',
      description: 'Una pausa de cinco minutos para mirar tu semana con otros ojos.',
      kind: 'article',
      category: 'Devocionales',
      url: '',
      body: 'A veces esperamos una señal enorme para empezar a vivir con propósito. Pero también hay propósito en escuchar a un amigo, cumplir una promesa y hacer espacio para alguien nuevo.\n\nLee Miqueas 6:8 en tu Biblia. ¿Cómo se verían la justicia, la misericordia y la humildad en tu día de hoy?\n\nPara reflexionar\nPiensa en una acción pequeña que puedas realizar esta semana para acompañar a otra persona. Escríbela y busca un momento concreto para hacerla.\n\nOración\nSeñor, ayúdame a reconocer las oportunidades de amar que ya tengo cerca. Dame sensibilidad para escuchar y valor para actuar. Amén.',
      image_url: '/images/study.jpg',
      status: 'published',
      visibility: 'public',
      owner_id: id(2),
    },
    {
      id: id(52),
      title: 'Crecer juntos cambia la historia',
      description: 'Tres preguntas para conversar en tu equipo esta semana.',
      kind: 'article',
      category: 'Comunidad',
      url: '',
      body: 'La comunidad se construye con presencia, escucha y acciones concretas.\n\n1. ¿Qué te hizo sentir acompañado esta semana?\n\n2. ¿Qué te gustaría compartir con tu equipo?\n\n3. ¿Cómo podemos servir juntos a alguien que lo necesite?\n\nPueden conversar estas preguntas en el próximo encuentro. Cada persona es libre de compartir hasta donde se sienta cómoda.',
      image_url: '/images/friends.jpg',
      status: 'published',
      visibility: 'private',
      owner_id: id(3),
    },
  ];
  d.prayers = [
    {
      id: id(61),
      user_id: id(5),
      body: 'Por quienes estamos empezando una nueva etapa de estudios. Que encontremos paz y buenos amigos en el camino.',
      visibility: 'community',
      anonymous: false,
      author_label: 'Mateo',
      status: 'approved',
      created_at: now,
    },
    {
      id: id(62),
      user_id: id(1),
      body: 'Por mi familia y las decisiones que estamos tomando esta semana.',
      visibility: 'private',
      anonymous: false,
      author_label: 'Alex',
      status: 'pending',
      created_at: now,
    },
  ];
  d.polls = [
    {
      id: id(71),
      question: '¿Qué te gustaría vivir en nuestro próximo encuentro?',
      options: [
        'Una noche de adoración',
        'Una salida para servir',
        'Una conversación sobre propósito',
      ],
      closes_at: future(6),
      status: 'published',
      owner_id: id(3),
    },
  ];
  d.votes = [{ id: id(72), poll_id: id(71), user_id: id(5), option_index: 0 }];
  d.leader_profiles = [
    {
      id: id(81),
      name: 'Daniel Pérez',
      function: 'Coordinación juvenil',
      bio: 'Acompañamos a cada joven a descubrir su lugar y crecer en comunidad. Perfil ilustrativo.',
      image_url: '',
      published: true,
      consent: true,
    },
    {
      id: id(82),
      name: 'Sara Méndez',
      function: 'Equipos y comunidad',
      bio: 'Creo en las conversaciones sinceras, la música y los pequeños actos de amor. Perfil ilustrativo.',
      image_url: '',
      published: true,
      consent: true,
    },
  ];
  return d;
}
