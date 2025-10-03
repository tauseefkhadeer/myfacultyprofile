const express = require('express');
const { prisma } = require('../prisma');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { Parser } = require('json2csv');

const router = express.Router();

router.get('/faculty', requireAuth, async (req, res) => {
  const { q, subject, grade, schoolId } = req.query;
  const where = {};
  const sessionUser = req.session.user;

  if (sessionUser.role !== 'SUPER_ADMIN') {
    where.schoolId = sessionUser.schoolId;
  } else if (schoolId) {
    where.schoolId = Number(schoolId);
  }
  if (q) where.name = { contains: String(q), mode: 'insensitive' };
  if (subject) {
    where.subjects = { some: { subject: { name: { contains: String(subject), mode: 'insensitive' } } } };
  }
  if (grade) {
    where.assignments = { some: { classSection: { grade: Number(grade) } } };
  }

  const faculty = await prisma.facultyProfile.findMany({
    where,
    include: { subjects: { include: { subject: true } }, assignments: { include: { classSection: true, subject: true } } },
    orderBy: { name: 'asc' },
  });

  if (req.query.format === 'csv') {
    const fields = ['name', 'designation', 'qualifications', 'yearsOfExperience'];
    const parser = new Parser({ fields });
    const csv = parser.parse(faculty.map(f => ({
      name: f.name,
      designation: f.designation,
      qualifications: f.qualifications,
      yearsOfExperience: f.yearsOfExperience,
    })));
    res.header('Content-Type', 'text/csv');
    res.attachment('faculty.csv');
    return res.send(csv);
  }

  res.render('directory_faculty', { faculty, query: req.query });
});

router.get('/students', requireAuth, async (req, res) => {
  const { q, grade, section, schoolId } = req.query;
  const where = {};
  const sessionUser = req.session.user;

  if (sessionUser.role === 'FACULTY') {
    // Only students in classes assigned to this faculty
    const faculty = await prisma.facultyProfile.findUnique({
      where: { userId: sessionUser.id },
      include: { assignments: true },
    });
    const classIds = faculty.assignments.map(a => a.classSectionId);
    where.enrollments = { some: { classSectionId: { in: classIds } } };
    where.schoolId = faculty.schoolId;
  } else if (sessionUser.role !== 'SUPER_ADMIN') {
    where.schoolId = sessionUser.schoolId;
  } else if (schoolId) {
    where.schoolId = Number(schoolId);
  }

  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { rollNumber: { contains: String(q), mode: 'insensitive' } },
    ];
  }
  if (grade) where.grade = Number(grade);
  if (section) where.section = String(section);

  const students = await prisma.studentProfile.findMany({
    where,
    include: { enrollments: { include: { classSection: true } } },
    orderBy: [{ grade: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
  });

  if (req.query.format === 'csv') {
    const fields = ['name', 'rollNumber', 'grade', 'section'];
    const { Parser } = require('json2csv');
    const parser = new Parser({ fields });
    const csv = parser.parse(students.map(s => ({
      name: s.name,
      rollNumber: s.rollNumber,
      grade: s.grade,
      section: s.section,
    })));
    res.header('Content-Type', 'text/csv');
    res.attachment('students.csv');
    return res.send(csv);
  }

  res.render('directory_students', { students, query: req.query });
});

router.get('/admins', requireAuth, async (req, res) => {
  const { q, schoolId } = req.query;
  const where = {};
  const sessionUser = req.session.user;

  if (sessionUser.role !== 'SUPER_ADMIN') {
    where.schoolId = sessionUser.schoolId;
  } else if (schoolId) {
    where.schoolId = Number(schoolId);
  }
  if (q) where.name = { contains: String(q), mode: 'insensitive' };

  const admins = await prisma.adminProfile.findMany({ where, orderBy: { name: 'asc' } });

  if (req.query.format === 'csv') {
    const fields = ['name', 'designation'];
    const parser = new Parser({ fields });
    const csv = parser.parse(admins.map(a => ({ name: a.name, designation: a.designation })));
    res.header('Content-Type', 'text/csv');
    res.attachment('admins.csv');
    return res.send(csv);
  }

  res.render('directory_admins', { admins, query: req.query });
});

module.exports = router;
