const express = require('express');
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const directoriesRoutes = require('./directories');
const reviewsRoutes = require('./reviews');

const router = express.Router();

router.use(authRoutes);
router.use(dashboardRoutes);
router.use('/directory', directoriesRoutes);
router.use(reviewsRoutes);

router.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return res.redirect('/login');
});

module.exports = router;
