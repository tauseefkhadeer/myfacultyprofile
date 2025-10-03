const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../prisma');
const { redirectIfAuthed } = require('../middleware/auth');

const router = express.Router();

router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).render('login', { error: 'Enter email/mobile and password' });
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { email: identifier.toLowerCase() },
          { mobile: identifier },
        ],
      },
      include: { school: true },
    });
    if (!user) return res.status(401).render('login', { error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).render('login', { error: 'Invalid credentials' });

    req.session.user = {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
      email: user.email,
    };
    return res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    return res.status(500).render('login', { error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

router.get('/reset', (req, res) => {
  res.send('Password reset link will be sent (stub).');
});

module.exports = router;
