const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./study-domain-core.js');
const W = require('./study-widget-core.js');

const today = '2026-10-20';
const at = C.at(today);
const base = () => {
  const study = C.clean();
  study.nights = [6, 8, 7, 8.5, 6.5, 8, 7.5].map((hours, i) => ({ date: C.add(today, i - 6), hours }));
  study.coffee = [{ date: today, count: 2 }];
  study.cards = [
    { id: 'card-a', title: '第一章', courseId: 'c1', question: 'q1', answer: 'a1', reviews: [{ date: C.add(today, -1), level: 2 }] },
    { id: 'card-b', title: '第二章', courseId: 'c2', question: 'q2', answer: 'a2', reviews: [] }
  ];
  study.projects = [{ id: 'p1', taskId: 'h1', title: '作业计划', termId: 't1', courseId: 'c1', steps: [
    { id: 's1', title: '阅读', estimatedMinutes: 10, done: true },
    { id: 's2', title: '实现', estimatedMinutes: 90, done: false }
  ] }];
  study.pomodoro = { active: null, sessions: [
    { id: 'pomo-1', completed: true, endedAt: at + 9 * 3600000, segments: [{ start: at + 8 * 3600000, end: at + 9 * 3600000 }] }
  ] };
  return {
    today,
    study,
    courses: [{ id: 't1', title: '2026—2027 秋冬', calendar: { periods: [
      { id: 'autumn', label: '秋', half: 'first', start: '2026-10-01', end: '2026-11-30', weekOffset: 0 }
    ] }, courses: [
      { id: 'c1', title: '课程一', color: '#7E9E9A' },
      { id: 'c2', title: '课程二', color: '#D4A359' }
    ] }],
    tasks: [
      { id: 'h1', title: '作业一', kind: 'homework', course: '课程一', completed: false, deadline: C.add(today, 3), important: true, estimatedMinutes: 60 },
      { id: 'h2', title: '作业二', kind: 'homework', course: '课程二', completed: true, deadline: C.add(today, -1) },
      { id: 't1', title: '待办', kind: 'todo', completed: false, urgent: true }
    ],
    exams: [
      { id: 'e1', title: '期中', semesterId: 't1', date: C.add(today, 5), start: '09:00', end: '11:00' },
      { id: 'e2', title: '期末', semesterId: 't1', date: C.add(today, 20), start: '14:00', end: '16:00' }
    ],
    academic: {
      hidden: false,
      summary: { gpa: [4.18] },
      goal: { target: 4.5 },
      courseGrades: [{ id: 'g1', courseId: 'c1', termId: 't1', title: '课程一', five: 4.5 }],
      series: [{ termId: 't1', gpa: 4.18 }]
    },
    focus: {
      today: 52 * 60000,
      byDay: { [C.add(today, -2)]: 40 * 60000, [C.add(today, -1)]: 60 * 60000, [today]: 52 * 60000 }
    },
    schedule: [
      { date: today, start: '08:00', end: '09:35', courseId: 'c1', title: '课程一' },
      { date: today, start: '14:00', end: '15:35', courseId: 'c2', title: '课程二' },
      { date: C.add(today, 1), start: '10:00', end: '11:35', courseId: 'c1', title: '课程一' }
    ],
    now: at + 10 * 3600000,
    activeMinutes: 12,
    importantCourseIds: ['c1']
  };
};
test('backend model exposes every field the 18 standalone cards bind', () => {
  const input = base();
  const m = W.build(input);
  // focus snake / streak snake
  assert.equal(m.activeMinutes, 12);
  assert.equal(m.streak, 3);
  // agenda + week + next class
  assert.equal(m.daySchedule.length, 2);
  assert.equal(m.schedule.length, 3);
  assert.equal(m.nextClass.courseId, 'c2');
  // hourglass / domino / mountain
  assert.equal(m.daysToExam, 5);
  assert.equal(m.exams.length, 2);
  assert.equal(m.upcoming.id, 'e1');
  // plant / deadline / quadrant
  assert.equal(m.tasks.length, 3);
  assert.equal(m.deadlines[0].id, 'h1');
  assert.ok(m.pending.some(task => task.id === 't1'));
  // books / course squares / grid
  assert.equal(m.courseProgress.length, 2);
  assert.equal(m.courseProgress.find(c => c.id === 'c1').progress, 0.5);
  assert.equal(m.courseProgress.find(c => c.id === 'c2').progress, 0);
  // rings / curve / mosaic / fan
  assert.equal(m.study.focusGoal, 90);
  assert.equal(m.cards.length, 2);
  assert.ok(m.reviewDue.length >= 1);
  assert.equal(m.reviewed, 0);
  // stairs / grade rings / trend
  assert.equal(m.academic.summary.gpa[0], 4.18);
  assert.equal(m.academic.goal.target, 4.5);
  // moons / coffee / day arc
  assert.equal(m.nights.length, 7);
  assert.equal(m.coffee, 2);
  // project puzzle
  assert.equal(m.projects.length, 1);
  assert.equal(m.project.id, 'p1');
  assert.ok(Math.abs(m.project.progress - 0.1) < 1e-9);
  // tomatoes
  assert.equal(m.tomatoCount, 1);
});

test('schedule-derived backend reacts to calendar/exclusion/course changes through library key', () => {
  const input = base();
  const a = W.build(input);
  const changed = base();
  changed.courses[0].scheduleExclusions = [{ id: 'x' }];
  const b = W.build({ ...changed, schedule: changed.schedule.filter(row => row.courseId !== 'c2') });
  assert.equal(a.courseProgress.find(c => c.id === 'c2').progress, 0);
  assert.equal(b.courseProgress.find(c => c.id === 'c2').progress, null);
  assert.notEqual(JSON.stringify(a.courseProgress), JSON.stringify(b.courseProgress));
});

test('backend keeps unknown/empty data empty instead of inventing progress', () => {
  const study = C.clean();
  const m = W.build({ today, now: at, courses: [], tasks: [], exams: [], study, focus: {}, schedule: [], academic: {} });
  assert.equal(m.coffee, null);
  assert.ok(m.nights.every(n => n.hours === null));
  assert.deepEqual(m.cards, []);
  assert.equal(m.nextClass, null);
  assert.equal(m.project, null);
  assert.equal(m.tomatoCount, 0);
  assert.equal(m.activeMinutes, 0);
});

test('important course raises review priority only for existing cards', () => {
  const input = base();
  input.study.cards = [
    { id: 'a', title: 'A', courseId: 'c1', question: 'qa', answer: 'aa', reviews: [{ date: C.add(today, -30), level: 1 }] },
    { id: 'b', title: 'B', courseId: 'c2', question: 'qb', answer: 'ab', reviews: [{ date: C.add(today, -30), level: 1 }] }
  ];
  input.importantCourseIds = ['c1'];
  const m = W.build(input);
  assert.equal(m.cards[0].id, 'a');
});

test('school submitted is distinct from local completion', () => {
  const input = base();
  input.tasks.push({ id: 'school-done', title: '学校已交', kind: 'homework', source: 'school', completed: true, schoolCompleted: true });
  const m = W.build(input);
  assert.equal(m.schoolSubmitted, 1);
  assert.ok(m.tasks.some(task => task.id === 'h2' && task.completed && task.schoolCompleted !== true));
});

test('priority views rank important/urgent before storage order', () => {
  const input = base();
  input.tasks.push({ id: 'later', title: '普通任务', kind: 'todo', completed: false });
  const m = W.build(input);
  assert.equal(m.plantTasks[0].id, 'h1');
  assert.equal(m.quadrantTasks[0].id, 'h1');
  assert.ok(m.plantTasks.length <= 3);
});

test('explicit termId wins over semester array order', () => {
  const input = base();
  input.termId = 't1';
  const old = { id: 'old-term', title: '旧学期', calendar: { periods: [] }, courses: [{ id: 'old-course', title: '旧课' }] };
  input.courses = [old, input.courses[0]];
  const m = W.build(input);
  assert.equal(m.termId, 't1');
  assert.equal(m.courses[0].id, 'c1');
  assert.equal(m.courseProgress[0].id, 'c1');
});

test('schedule key changes for calendar, course and exclusion edits', () => {
  const input = base();
  const term = input.courses[0];
  const a = W.scheduleKey(term, input.courses);
  const calendarChanged = { ...term, calendar: { ...term.calendar, periods: [{ ...term.calendar.periods[0], end: '2026-12-01' }] } };
  const exclusionsChanged = { ...term, scheduleExclusions: [{ id: 'x' }] };
  const coursesChanged = [{ ...term, courses: [...term.courses, { id: 'c3', title: '课程三' }] }];
  assert.notEqual(W.scheduleKey(calendarChanged, input.courses), a);
  assert.notEqual(W.scheduleKey(exclusionsChanged, input.courses), a);
  assert.notEqual(W.scheduleKey(term, coursesChanged), a);
  assert.equal(W.scheduleKey(term, input.courses), a);
});

test('all 18 standalone and 8 bento contracts are populated by one backend build', () => {
  const m = W.build(base());
  assert.equal(Object.keys(W.contracts).length, 26);
  for (const id of Object.keys(W.contracts)) assert.deepEqual(W.missing(id, m), [], id);
});

