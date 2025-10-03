const express = require('express');
const { prisma } = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Leave a faculty review (student or parent)
router.post('/reviews/faculty/:facultyId', requireAuth, async (req, res) => {
  const sessionUser = req.session.user;
  const { rating, comment } = req.body;
  const facultyId = Number(req.params.facultyId);

  try {
    const faculty = await prisma.facultyProfile.findUnique({ where: { id: facultyId } });
    if (!faculty) return res.status(404).send('Faculty not found');

    const data = {
      schoolId: faculty.schoolId,
      facultyId,
      rating: Number(rating) || 0,
      comment: comment?.slice(0, 500) || null,
    };

    if (sessionUser.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: sessionUser.id } });
      if (!student) return res.status(403).send('Not a student');
      data.createdByStudentId = student.id;
    } else if (sessionUser.role === 'PARENT') {
      const parent = await prisma.parentProfile.findUnique({ where: { userId: sessionUser.id } });
      if (!parent) return res.status(403).send('Not a parent');
      data.createdByParentId = parent.id;
    } else {
      return res.status(403).send('Not allowed');
    }

    await prisma.facultyReview.create({ data });
    return res.redirect('back');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Server error');
  }
});

// Leave a student review (faculty only)
router.post('/reviews/student/:studentId', requireAuth, async (req, res) => {
  const sessionUser = req.session.user;
  const { rating, comment } = req.body;
  const studentId = Number(req.params.studentId);

  try {
    if (sessionUser.role !== 'FACULTY') return res.status(403).send('Not allowed');
    const faculty = await prisma.facultyProfile.findUnique({ where: { userId: sessionUser.id } });
    if (!faculty) return res.status(403).send('No faculty profile');

    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).send('Student not found');

    await prisma.studentReview.create({
      data: {
        schoolId: student.schoolId,
        studentId: student.id,
        facultyId: faculty.id,
        rating: rating ? Number(rating) : null,
        comment: comment?.slice(0, 500) || null,
      },
    });
    return res.redirect('back');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
