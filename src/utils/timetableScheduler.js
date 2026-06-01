const create3DArray = (x, y, z) => {
	const array = []

	for (let i = 0; i < x; i++) {
		array[i] = []
		for (let j = 0; j < y; j++) {
			array[i][j] = []
			for (let k = 0; k < z; k++) {
				array[i][j][k] = 0
			}
		}
	}

	return array
}

const isSchedulePossible = (teacherAvailability, classAvailability, teacherIndex, classIndex, period) => {
	return !(
		teacherAvailability[teacherIndex][period.d][period.p] ||
		classAvailability[classIndex][period.d][period.p]
	)
}

export const addSubjects = (subjects) => {
	const temp = []
	subjects.forEach((subject) => {
		temp.push({ code: subject[1], contactHrs: Number(subject[2]) })
	})
	return temp
}

export const scheduleTimetable = (teacherLectures, sections, period) => {
	const finalTimetable = create3DArray(sections.length, period.d, period.p)
	const teacherAvailability = create3DArray(teacherLectures.length, period.d, period.p)
	const classAvailability = create3DArray(sections.length, period.d, period.p)
	const remainingLectures = []

	for (let i = 0; i < sections.length; i++) {
		remainingLectures[i] = []
		for (let j = 0; j < teacherLectures.length; j++) {
			const valid = teacherLectures[j].assigned.findIndex(
				(e) => e.class === sections[i]
			)

			remainingLectures[i][j] =
				valid !== -1 ? teacherLectures[j].assigned[valid].subject.contactHrs : 0
		}
	}

	for (let per = 0; per < period.p; per++) {
		for (let day = 0; day < period.d; day++) {
			sections.forEach((section, classIndex) => {
				if (finalTimetable[classIndex][day][per] !== 0) return

				for (let teacher = 0; teacher < teacherLectures.length; teacher++) {
					const valid = teacherLectures[teacher].assigned.findIndex(
						(e) => e.class === section
					)

					if (
						valid === -1 ||
						teacherAvailability[teacher][day].some((e) => e === section) ||
						remainingLectures[classIndex][teacher] === 0
					) {
						continue
					}

					if (
						isSchedulePossible(
							teacherAvailability,
							classAvailability,
							teacher,
							classIndex,
							{ d: day, p: per }
						)
					) {
						let lectureCount = 1
						const longestLecture = parseInt(
							teacherLectures[teacher].assigned[valid].lecture[0],
							10
						)

						if (
							remainingLectures[classIndex][teacher] > 1 &&
							longestLecture > 1 &&
							per + 1 < period.p &&
							isSchedulePossible(
								teacherAvailability,
								classAvailability,
								teacher,
								classIndex,
								{ d: day, p: per + 1 }
							)
						) {
							lectureCount = 2
							if (
								longestLecture > 2 &&
								per + 2 < period.p &&
								isSchedulePossible(
									teacherAvailability,
									classAvailability,
									teacher,
									classIndex,
									{ d: day, p: per + 2 }
								)
							) {
								lectureCount = 3
							}
						}

						for (let i = 0; i < lectureCount; i++) {
							finalTimetable[classIndex][day][per + i] =
								teacherLectures[teacher].name +
								'(' +
								teacherLectures[teacher].assigned[valid].subject.code +
								')'
							classAvailability[classIndex][day][per + i] =
								teacherLectures[teacher].name
							teacherAvailability[teacher][day][per + i] = section
							remainingLectures[classIndex][teacher]--
						}
						break
					}
				}
			})
		}
	}

	return finalTimetable
}

export const buildTimetable = ({ lectures, subjects, workingTime }) => {
	const normalizedSubjects = addSubjects(subjects)
	const teachers = lectures
		.map((lecture) => lecture[0])
		.filter((value, index, self) => self.indexOf(value) === index)
	const sections = lectures
		.map((lecture) => lecture[1])
		.filter((value, index, self) => self.indexOf(value) === index)

	const teacherLectures = teachers.map((teacher) => ({
		name: teacher,
		assigned: []
	}))

	teacherLectures.forEach((teacherLecture) => {
		lectures.forEach((lecture) => {
			if (lecture[0] === teacherLecture.name) {
				teacherLecture.assigned.push({
					class: lecture[1],
					subject:
						normalizedSubjects[
							normalizedSubjects.findIndex((subject) => subject.code === lecture[2])
						],
					lecture: lecture[3]
				})
			}
		})
	})

	const days = Object.values(workingTime).filter((value) => Number(value) !== 0)
	const period = {
		d: days.length,
		p: days.reduce((a, b) => Math.max(Number(a), Number(b)), 0)
	}

	const finalized = scheduleTimetable(teacherLectures, sections, period)
	const timetable = {}

	finalized.forEach((sectionTimetable, index) => {
		timetable[sections[index]] = sectionTimetable
	})

	return { sections, timetable }
}
