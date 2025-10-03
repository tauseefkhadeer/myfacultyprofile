const express = require('express');
const { prisma } = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  const sessionUser = req.session.user;

  try {
    if (sessionUser.role === 'SUPER_ADMIN') {
      const schools = await prisma.school.findMany({
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: {
              faculty: true,
              students: true,
              admins: true,
              classes: true,
              subjects: true,
            },
          },
        },
      });
      const ratingsBySchool = await prisma.facultyReview.groupBy({
        by: ['schoolId'],
        _avg: { rating: true },
      });
      const mapRatings = Object.fromEntries(ratingsBySchool.map(r => [String(r.schoolId), r._avg.rating]));
      return res.render('dashboard', {
        scope: 'SUPER_ADMIN',
        schools,
        mapRatings,
        counts: null,
        currentSchool: null,
        sessionUser,
      });
    }

    const schoolId = sessionUser.schoolId;
    const currentSchool = await prisma.school.findUnique({ where: { id: schoolId } });

    if (['SCHOOL_ADMIN', 'ACADEMIC_ADMIN'].includes(sessionUser.role)) {
      const counts = {
        faculty: await prisma.facultyProfile.count({ where: { schoolId } }),
        students: await prisma.studentProfile.count({ where: { schoolId } }),
        admins: await prisma.adminProfile.count({ where: { schoolId } }),
        classes: await prisma.classSection.count({ where: { schoolId } }),
        subjects: await prisma.subject.count({ where: { schoolId } }),
      };
      const facultyAvg = await prisma.facultyReview.aggregate({
        where: { schoolId },
        _avg: { rating: true },
      });
      const studentAvg = await prisma.studentReview.aggregate({
        where: { schoolId },
        _avg: { rating: true },
      });
      return res.render('dashboard', {
        scope: 'ADMIN',
        counts,
        currentSchool,
        facultyAvg: facultyAvg._avg.rating || null,
        studentAvg: studentAvg._avg.rating || null,
        sessionUser,
        schools: null,
        mapRatings: null,
      });
    }

    if (sessionUser.role === 'FACULTY') {
      const faculty = await prisma.facultyProfile.findUnique({
        where: { userId: sessionUser.id },
        include: {
          assignments: { include: { classSection: true, subject: true } },
          receivedReviews: true,
        },
      });
      const studentsCount = await prisma.studentEnrollment.count({
        where: { classSectionId: { in: faculty.assignments.map(a => a.classSectionId) } },
      });
      const avgRating = await prisma.facultyReview.aggregate({
        where: { facultyId: faculty.id },
        _avg: { rating: true },
      });
      return res.render('dashboard', {
        scope: 'FACULTY',
        faculty,
        studentsCount,
        avgRating: avgRating._avg.rating || null,
        sessionUser,
      });
    }

    if (['STUDENT', 'PARENT'].includes(sessionUser.role)) {
      const student = sessionUser.role === 'STUDENT'
        ? await prisma.studentProfile.findUnique({
            where: { userId: sessionUser.id },
            include: {
              enrollments: { include: { classSection: true } },
              termResults: { include: { subject: true } },
              receivedReviews: { include: { faculty: true } },
            },
          })
        : await prisma.parentProfile.findUnique({
            where: { userId: sessionUser.id },
            include: {
              student: {
                include: {
                  enrollments: { include: { classSection: true } },
                  termResults: { include: { subject: true } },
                  receivedReviews: { include: { faculty: true } },
                },
              },
            },
          });
      return res.render('dashboard', {
        scope: sessionUser.role,
        student,
        sessionUser,
      });
    }

    return res.status(403).send('Unsupported role');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
