// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom, Supply, StudentClassroom, Student, sequelize } = require('../db/models');
const { Op } = require('sequelize');

// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    // Phase 6B: Classroom Search Filters
    /*
        name filter:
            If the name query parameter exists, set the name query
                filter to find a similar match to the name query parameter.
            For example, if name query parameter is 'Ms.', then the
                query should match with classrooms whose name includes 'Ms.

        studentLimit filter:
            If the studentLimit query parameter includes a comma
                And if the studentLimit query parameter is two numbers separated
                    by a comma, set the studentLimit query filter to be between
                    the first number (min) and the second number (max)
                But if the studentLimit query parameter is NOT two integers
                    separated by a comma, or if min is greater than max, add an
                    error message of 'Student Limit should be two integers:
                    min,max' to errorResult.errors
            If the studentLimit query parameter has no commas
                And if the studentLimit query parameter is a single integer, set
                    the studentLimit query parameter to equal the number
                But if the studentLimit query parameter is NOT an integer, add
                    an error message of 'Student Limit should be a integer' to
                    errorResult.errors
    */
    const where = {};

    let teacherName = req.query.name

    if (teacherName) {
        where.name = {
            [Op.substring]: teacherName
        }
    }

    let studentLim = req.query.studentLimit;

    // console.log(typeof studentLim)

    if (studentLim) {
        const nums = studentLim.split(',');

        if (nums.length === 2) {
            if (isNaN(nums[0]) || isNaN(nums[1])) {
                errorResult.errors.push({
                    message: 'input must be a number'
                })
                res.status(400)
                res.json(errorResult)
            } else if (parseInt(nums[0]) > parseInt(nums[1])) {
                errorResult.errors.push({
                    message: 'min must be lesser than max'
                })
                res.status(400)
                res.json(errorResult)
            }

            where.studentLimit = {
                [Op.between]: [+nums[0], +nums[1]]
            };
        } if (nums.length === 1) {
            if (isNaN(nums[0])) {
                errorResult.errors.push({
                    message: 'input must be a number'
                })
                res.status(400)
                res.json(errorResult)
            }

            where.studentLimit = +nums[0];
        }

    }

    // Your code here

    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where,
        // Phase 1B: Order the Classroom search results

        order: [['name']]
    });

    res.json(classrooms);
});

// Single classroom
router.get('/:id', async (req, res, next) => {
    let classroom = await Classroom.findByPk(req.params.id, {
        attributes: ['id', 'name', 'studentLimit'],
        include: [
            {
                model: Supply,
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'classroomId'],
                },
                order: [['category'], ['name']]
            },
            {
                model: Student,
                attributes: {
                    include: ['id', 'firstName', 'lastName', 'leftHanded']
                }
            }
        ]


        // Phase 7:
            // Include classroom supplies and order supplies by category then
                // name (both in ascending order)
            // Include students of the classroom and order students by lastName
                // then firstName (both in ascending order)
                // (Optional): No need to include the StudentClassrooms
        // Your code here
    });

    if (!classroom) {
        res.status(404);
        res.send({ message: 'Classroom Not Found' });
    }

    // Phase 5: Supply and Student counts, Overloaded classroom
        // Phase 5A: Find the number of supplies the classroom has and set it as
            // a property of supplyCount on the response
    classroom = classroom.toJSON();
        // Phase 5B: Find the number of students in the classroom and set it as
            // a property of studentCount on the response
    classroom.supplyCount = await Supply.count({
        where: {classroomId: classroom.id}
    })
        // Phase 5C: Calculate if the classroom is overloaded by comparing the
            // studentLimit of the classroom to the number of students in the
            // classroom
    classroom.studentCount = await StudentClassroom.count({
        where: {classroomId: classroom.id}
    })

    if (classroom.studentLimit > classroom.studentCount) {
        classroom.overloaded = false;
    } else {
        classroom.overloaded = true;
    }
        // Optional Phase 5D: Calculate the average grade of the classroom
    // Your code here
    // classroom.gradeSum = await StudentClassroom.sum({
    //     attributes: ['grade'],
    //     where: {classroomId: classroom.id}
    // })

    // console.log(classroom)

    // classroom.avgGrade = classroom.gradeSum / classroom.studentCount

    const average = await StudentClassroom.findOne({
        where: {classroomId: classroom.id},
        attributes: {
            include: [
                [
                    sequelize.fn("AVG", sequelize.col("grade")),
                    "avgGrade"
                ]
            ],
            exclude: ['id', 'studentId', 'classroomId', 'grade', 'createdAt', 'updatedAt']
        },
        raw: true
    })

    classroom.avgGrade = average.avgGrade

    res.json(classroom);
});

// Export class - DO NOT MODIFY
module.exports = router;
