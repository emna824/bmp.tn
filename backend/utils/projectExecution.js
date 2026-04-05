const Project = require('../models/project');
const Offer = require('../models/offer');
const Milestone = require('../models/milestone');
const WorkLog = require('../models/workLog');
const { notifyAssignedArtisansAboutProjectUpdate } = require('../controllers/notificationController');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeDay(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function countScheduledDays(startDate, endDate) {
  const start = normalizeDay(startDate);
  const end = normalizeDay(endDate || startDate);

  if (!start || !end) {
    return 1;
  }

  const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(1, diff + 1);
}

function isProjectTeamComplete(project) {
  const requirements = Array.isArray(project?.teamRequirements) ? project.teamRequirements : [];

  if (!requirements.length) {
    return Array.isArray(project?.assignedArtisans) && project.assignedArtisans.length > 0;
  }

  return requirements.every((requirement) => {
    const required = Number(requirement?.required || 0);
    const assigned = Number(requirement?.assigned || 0);
    return required > 0 && assigned >= required;
  });
}

function hasReachedProjectStartDate(project, referenceDate = new Date()) {
  const projectStart = normalizeDay(project?.startDate);
  const currentDay = normalizeDay(referenceDate);

  if (!projectStart || !currentDay) {
    return false;
  }

  return currentDay.getTime() >= projectStart.getTime();
}

async function closeProjectOffers(projectId) {
  await Offer.updateMany(
    { projectId, status: 'open' },
    {
      $set: {
        status: 'closed',
      },
    }
  );
}

async function startProjectWithNotification(project, options = {}) {
  if (!project || project.status === 'in_progress') {
    return { project, changed: false, transition: null };
  }

  const updatedProject = await Project.findOneAndUpdate(
    { _id: project._id, status: 'recruiting' },
    { $set: { status: 'in_progress' } },
    { new: true }
  );

  if (!updatedProject) {
    const latestProject = await Project.findById(project._id);
    return { project: latestProject || project, changed: false, transition: null };
  }

  await closeProjectOffers(updatedProject._id);

  if (options.notify !== false) {
    try {
      await notifyAssignedArtisansAboutProjectUpdate({
        project: updatedProject,
        event: 'started',
      });
    } catch (error) {
      console.error('Failed to notify artisans about project start', error);
    }
  }

  return { project: updatedProject, changed: true, transition: 'started' };
}

async function closeProjectWithNotification(project, options = {}) {
  if (!project || project.status === 'closed') {
    return { project, changed: false, transition: null };
  }

  const updatedProject = await Project.findOneAndUpdate(
    options.fromRecruitingOnly
      ? { _id: project._id, status: 'recruiting' }
      : { _id: project._id, status: { $ne: 'closed' } },
    { $set: { status: 'closed' } },
    { new: true }
  );

  if (!updatedProject) {
    const latestProject = await Project.findById(project._id);
    return { project: latestProject || project, changed: false, transition: null };
  }

  await closeProjectOffers(updatedProject._id);

  if (options.notify !== false) {
    try {
      await notifyAssignedArtisansAboutProjectUpdate({
        project: updatedProject,
        event: 'closed',
        reason: options.reason || '',
      });
    } catch (error) {
      console.error('Failed to notify artisans about project closure', error);
    }
  }

  return { project: updatedProject, changed: true, transition: 'closed' };
}

async function syncRecruitingProjectState(project, options = {}) {
  if (!project || project.status !== 'recruiting') {
    return { project, changed: false, transition: null };
  }

  if (isProjectTeamComplete(project)) {
    return startProjectWithNotification(project, options);
  }

  if (hasReachedProjectStartDate(project, options.referenceDate)) {
    return closeProjectWithNotification(project, {
      ...options,
      fromRecruitingOnly: true,
      reason: options.reason || 'The team was not completed before the planned start date.',
    });
  }

  return { project, changed: false, transition: null };
}

async function processProjectAutoTransitions(referenceDate = new Date()) {
  const recruitingProjects = await Project.find({ status: 'recruiting' });
  let started = 0;
  let closed = 0;

  for (const project of recruitingProjects) {
    const result = await syncRecruitingProjectState(project, { referenceDate });

    if (result.transition === 'started') {
      started += 1;
    }

    if (result.transition === 'closed') {
      closed += 1;
    }
  }

  return { started, closed };
}

async function syncProjectStatusFromMilestones(projectId) {
  const milestones = await Milestone.find({ projectId }).select('status');
  if (!milestones.length) {
    return Project.findById(projectId);
  }

  const allDone = milestones.every((milestone) => milestone.status === 'done');
  if (allDone) {
    return Project.findByIdAndUpdate(projectId, { status: 'finished' }, { new: true });
  }

  return Project.findById(projectId);
}

async function syncMilestoneStatusFromLogs(milestone) {
  if (!milestone) {
    return null;
  }

  const logs = await WorkLog.find({ milestoneId: milestone._id }).select('date status');
  const doneDays = new Set(
    logs
      .filter((log) => log.status === 'done')
      .map((log) => normalizeDay(log.date))
      .filter(Boolean)
      .map((value) => value.toISOString())
  ).size;

  const totalDays = countScheduledDays(milestone.startDate, milestone.endDate);

  let nextStatus = 'pending';
  if (doneDays >= totalDays) {
    nextStatus = 'done';
  } else if (doneDays > 0) {
    nextStatus = 'in_progress';
  }

  if (milestone.status !== nextStatus) {
    milestone.status = nextStatus;
    await milestone.save();
  }

  const progressPercent = Math.min(100, Math.round((doneDays / totalDays) * 100));

  if (nextStatus === 'done') {
    await syncProjectStatusFromMilestones(milestone.projectId);
  } else {
    await Project.updateOne(
      { _id: milestone.projectId, status: 'finished' },
      { $set: { status: 'in_progress' } }
    );
  }

  return {
    milestone,
    doneDays,
    totalDays,
    progressPercent,
  };
}

module.exports = {
  closeProjectOffers,
  closeProjectWithNotification,
  countScheduledDays,
  hasReachedProjectStartDate,
  isProjectTeamComplete,
  normalizeDay,
  processProjectAutoTransitions,
  startProjectWithNotification,
  syncMilestoneStatusFromLogs,
  syncProjectStatusFromMilestones,
  syncRecruitingProjectState,
};
