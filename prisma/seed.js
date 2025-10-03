const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

function pickRandom(arr, count = 1) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Seed skipped: users already exist');
    return;
  }

  const password = await hashPassword('Password@123');

  const schoolsData = [
    { name: 'Sunrise Public School', address: 'Bengaluru', phone: '080-1111111' },
    { name: 'Green Valley High', address: 'Mysuru', phone: '0821-2222222' },
    { name: 'Lakeview School', address: 'Mangaluru', phone: '0824-3333333' },
    { name: 'Hilltop Academy', address: 'Hubballi', phone: '0836-4444444' },
  ];

  const subjectsList = ['Kannada', 'English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer Basics'];

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      passwordHash: password,
      role: 'SUPER_ADMIN',
      isActive: true,
      adminProfile: {
        create: {
          name: 'Super Admin',
          designation: 'Super Admin',
        },
      },
    },
  });
  console.log('Created super admin:', superAdmin.email);

  for (const s of schoolsData) {
    const school = await prisma.school.create({ data: s });

    // Subjects
    const subjects = await Promise.all(
      subjectsList.map((name, idx) => prisma.subject.create({ data: { name, code: `SUB${idx + 1}`, schoolId: school.id } }))
    );

    // Admins
    const schoolAdminUser = await prisma.user.create({
      data: {
        email: `${school.name.split(' ')[0].toLowerCase()}-principal@example.com`,
        passwordHash: password,
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
        isActive: true,
        adminProfile: {
          create: {
            name: `${school.name} Principal`,
            designation: 'Principal',
            schoolId: school.id,
          },
        },
      },
    });

    const academicAdminUser = await prisma.user.create({
      data: {
        email: `${school.name.split(' ')[0].toLowerCase()}-academic@example.com`,
        passwordHash: password,
        role: 'ACADEMIC_ADMIN',
        schoolId: school.id,
        isActive: true,
        adminProfile: {
          create: {
            name: `${school.name} Academic Admin`,
            designation: 'Academic Admin',
            schoolId: school.id,
          },
        },
      },
    });

    console.log('Admins:', schoolAdminUser.email, academicAdminUser.email);

    // Classes: grades 6-8, section A
    const classes = [];
    for (let g = 6; g <= 8; g++) {
      const cs = await prisma.classSection.create({ data: { schoolId: school.id, grade: g, section: 'A' } });
      classes.push(cs);
    }

    // Faculty: 12 per school
    const facultyUsers = [];
    for (let i = 1; i <= 12; i++) {
      const fname = `Faculty ${i}`;
      const user = await prisma.user.create({
        data: {
          email: `${school.name.split(' ')[0].toLowerCase()}-fac${i}@example.com`,
          passwordHash: password,
          role: 'FACULTY',
          schoolId: school.id,
          isActive: true,
          facultyProfile: {
            create: {
              schoolId: school.id,
              name: fname,
              designation: 'Teacher',
              qualifications: 'B.Ed',
              yearsOfExperience: Math.floor(Math.random() * 10) + 1,
              contact: 'N/A',
            },
          },
        },
        include: { facultyProfile: true },
      });
      // Assign 2 subjects
      const chosenSubjects = pickRandom(subjects, 2);
      for (const subj of chosenSubjects) {
        await prisma.facultySubject.create({ data: { facultyId: user.facultyProfile.id, subjectId: subj.id } });
      }
      facultyUsers.push(user);
    }

    // Assign teaching for each class and each subject to random suitable faculty
    for (const cs of classes) {
      for (const subj of subjects) {
        // pick a faculty who has this subject, else any
        const eligible = await prisma.facultySubject.findMany({
          where: { subjectId: subj.id, faculty: { schoolId: school.id } },
          include: { faculty: true },
        });
        const faculty = (eligible.length > 0)
          ? eligible[Math.floor(Math.random() * eligible.length)].faculty
          : facultyUsers[Math.floor(Math.random() * facultyUsers.length)].facultyProfile;
        await prisma.teachingAssignment.create({
          data: {
            schoolId: school.id,
            facultyId: faculty.id,
            classSectionId: cs.id,
            subjectId: subj.id,
          },
        });
      }
    }

    // Students: 100 per school across grades 6-8
    let roll = 1;
    const createdStudents = [];
    for (let i = 1; i <= 100; i++) {
      const grade = 6 + (i % 3);
      const section = 'A';
      const sp = await prisma.user.create({
        data: {
          email: `${school.name.split(' ')[0].toLowerCase()}-stu${i}@example.com`,
          passwordHash: password,
          role: 'STUDENT',
          schoolId: school.id,
          isActive: true,
          studentProfile: {
            create: {
              schoolId: school.id,
              name: `Student ${i}`,
              rollNumber: String(roll++).padStart(3, '0'),
              grade,
              section,
              parentName: `Parent ${i}`,
            },
          },
        },
        include: { studentProfile: true },
      });
      createdStudents.push(sp.studentProfile);
      // enrollment
      const cs = classes.find(c => c.grade === grade && c.section === section);
      await prisma.studentEnrollment.create({ data: { studentId: sp.studentProfile.id, classSectionId: cs.id } });
      // optional parent profile on separate user (70%)
      if (Math.random() < 0.7) {
        const pu = await prisma.user.create({
          data: {
            email: `${school.name.split(' ')[0].toLowerCase()}-par${i}@example.com`,
            passwordHash: password,
            role: 'PARENT',
            schoolId: school.id,
            isActive: true,
            parentProfile: {
              create: {
                studentId: sp.studentProfile.id,
                name: `Parent ${i}`,
                contact: 'N/A',
              },
            },
          },
        });
      }
    }

    // Faculty Reviews: each faculty gets ~5 reviews
    const facultyProfiles = await prisma.facultyProfile.findMany({ where: { schoolId: school.id } });
    for (const f of facultyProfiles) {
      const sampleStudents = pickRandom(createdStudents, 5);
      for (const sprof of sampleStudents) {
        await prisma.facultyReview.create({
          data: {
            schoolId: school.id,
            facultyId: f.id,
            rating: Math.floor(Math.random() * 3) + 3,
            comment: 'Helpful and clear',
            createdByStudentId: sprof.id,
          },
        });
      }
    }

    // Student Reviews by faculty (private)
    const randomAssignments = await prisma.teachingAssignment.findMany({
      where: { schoolId: school.id },
      take: 50,
    });
    for (const a of randomAssignments) {
      const enrolled = await prisma.studentEnrollment.findMany({ where: { classSectionId: a.classSectionId }, take: 2 });
      for (const e of enrolled) {
        await prisma.studentReview.create({
          data: {
            schoolId: school.id,
            studentId: e.studentId,
            facultyId: a.facultyId,
            rating: Math.floor(Math.random() * 3) + 3,
            comment: 'Shows steady progress',
            isPrivate: true,
          },
        });
      }
    }

    // Admin Reviews
    for (let i = 0; i < 10; i++) {
      await prisma.adminReview.create({
        data: {
          schoolId: school.id,
          rating: Math.floor(Math.random() * 3) + 3,
          category: 'Facilities',
          comment: 'Good infrastructure',
        },
      });
    }
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
