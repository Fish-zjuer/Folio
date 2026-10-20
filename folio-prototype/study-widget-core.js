/*
 * Study widget backend: pure derivation for the 18 standalone cards and 8 bento
 * composites. No DOM, no rendering, no writes. Given the same inputs it returns
 * the complete read model consumed by single-bindings.js and bento-art.js.
 */
(function(root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./study-domain-core.js')
      : root.FolioStudyCore
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FolioStudyWidgetCore = api;
})(globalThis, function(C) {
  'use strict';
  const DAY = 86400000;
  const palette = ['#8886B0', '#C9A26E', '#A56A4D', '#9DA98F', '#7E9E9A'];
  const contracts = Object.freeze({
    'study/focus': ['activeMinutes', 'streak'],
    'study/streak': ['streak'],
    'study/agenda': ['daySchedule', 'allTasks', 'courseProgress'],
    'study/hourglass': ['daysToExam', 'exams'],
    'study/plant': ['tasks'],
    'study/curve': ['cards'],
    'study/stairs': ['academic'],
    'study/deadline': ['deadlines'],
    'study/books': ['courseProgress'],
    'study/rings': ['focus', 'tasks', 'cards', 'reviewed', 'reviewDue', 'study'],
    'study/domino': ['exams'],
    'study/quadrant': ['pending', 'deadlines', 'tasks'],
    'study/week': ['focusDays', 'schedule', 'courseProgress', 'nextClass'],
    'study/moons': ['nights', 'study'],
    'study/mosaic': ['cards'],
    'study/fan': ['cards'],
    'study/mountain': ['daysToExam'],
    'study/puzzle': ['project', 'projects'],
    'study/bento-today': ['daySchedule', 'tasks', 'nextClass', 'allTasks', 'now', 'plantTasks'],
    'study/bento-learning': ['courseProgress', 'streak', 'focusDays'],
    'study/bento-finals': ['daysToExam', 'exams', 'cards'],
    'study/bento-routine': ['nights', 'study', 'coffee', 'now'],
    'study/bento-review': ['cards', 'reviewDue'],
    'study/bento-tomato': ['activeMinutes', 'tomatoCount', 'focus', 'study', 'pomodoro', 'today'],
    'study/bento-assignments': ['deadlines', 'pending', 'tasks', 'schoolSubmitted', 'quadrantTasks'],
    'study/bento-grades': ['academic']
  });
  const minutes = value => /^\d\d:\d\d$/.test(value || '')
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
    : null;
  const colorFor = id => palette[[...String(id || '')].reduce((n, c) => n + c.codePointAt(0), 0) % palette.length];

  function courseProgress(courses, schedule, now, today) {
    return (courses || []).map(course => {
      const rows = (schedule || []).filter(row => (row.courseId || row.id) === course.id);
      const finished = rows.filter(row => {
        if (!C.validDay(row.date)) return false;
        const end = minutes(row.end);
        return end !== null && C.at(row.date) + end * 60000 <= now;
      }).length;
      return {
        ...course,
        progress: rows.length ? finished / rows.length : null,
        color: /^#[0-9a-f]{6}$/i.test(course.color || '') ? course.color : colorFor(course.id)
      };
    });
  }

  function nextClass(schedule, now) {
    return (schedule || []).find(row => {
      if (!C.validDay(row.date)) return false;
      const start = minutes(row.start);
      return start !== null && C.at(row.date) + start * 60000 > now;
    }) || null;
  }

  function pomodoroData(study) {
    const pomodoro = study?.pomodoro;
    if (!pomodoro || typeof pomodoro !== 'object') return { pomodoro: { active: null, sessions: [] }, activeMinutes: 0, tomatoCount: 0 };
    const sessions = Array.isArray(pomodoro.sessions) ? pomodoro.sessions : [];
    return { pomodoro: { active: pomodoro.active || null, sessions }, tomatoCount: 0, activeMinutes: 0 };
  }

  function scheduleKey(term, courses) {
    return JSON.stringify({
      term: term?.id || null,
      calendar: term?.calendar || null,
      courses: Array.isArray(courses) ? courses : [],
      exclusions: term?.scheduleExclusions || [], personalSchedule:term?.personalSchedule||[]
    });
  }

  function build(input = {}) {
    const today = input.today;
    const now = Number.isFinite(input.now) ? input.now : Date.now();
    const schedule = Array.isArray(input.schedule) ? input.schedule.slice() : [];
    const courses = Array.isArray(input.courses) ? input.courses : [];
    const study = input.study && typeof input.study === 'object' ? input.study : C.clean();
    const m = C.model({
      today,
      now,
      courses,
      tasks: input.tasks || [],
      exams: input.exams || [],
      academic: input.academic || {},
      focus: input.focus || {},
      study,
      termId: input.termId
    });

    m.schedule = schedule;
    m.daySchedule = schedule.filter(row => row.date === today);
    m.nextClass = nextClass(schedule, now);
    m.courseProgress = courseProgress(m.courses, schedule, now, today);
    m.schoolSubmitted = m.tasks.filter(task => task.kind === 'homework' && task.source === 'school' && task.schoolCompleted === true).length;

    // The three-things / quadrant cards are priority views, not storage-order views.
    const dueById = new Map(m.deadlines.map(task => [task.id, task.due]));
    const ranked = m.pending.slice().sort((a, b) => {
      const ai = a.important ? 0 : 1, bi = b.important ? 0 : 1;
      if (ai !== bi) return ai - bi;
      const au = a.urgent ? 0 : 1, bu = b.urgent ? 0 : 1;
      if (au !== bu) return au - bu;
      const ad = dueById.has(a.id) ? dueById.get(a.id) : Infinity;
      const bd = dueById.has(b.id) ? dueById.get(b.id) : Infinity;
      return ad - bd || String(a.id).localeCompare(String(b.id));
    });
    m.plantTasks = ranked.slice(0, 3);
    m.quadrantTasks = ranked.slice(0, 14);

    const pomo = pomodoroData(study);
    m.pomodoro = pomo.pomodoro;
    m.activeMinutes = Number.isFinite(input.activeMinutes)
      ? Math.max(0, Math.min(45, input.activeMinutes))
      : 0;
    m.tomatoCount = pomo.pomodoro.sessions.filter(session => {
      return session && session.completed === true && Number.isFinite(session.endedAt) && C.day(session.endedAt) === today;
    }).length;

    const important = new Set(input.importantCourseIds || []);
    m.cards = C.prioritize(m.cards, schedule, now, [...important]);
    m.reviewDue = m.cards.filter(card => card.due);
    return m;
  }

  function missing(id, model) {
    const fields = contracts[id];
    if (!fields) throw Error('Unknown study widget: ' + id);
    return fields.filter(field => model == null || model[field] === undefined);
  }

  return Object.freeze({
    palette,
    contracts,
    minutes,
    colorFor,
    courseProgress,
    nextClass,
    scheduleKey,
    build,
    missing
  });
});
