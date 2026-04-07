const Project = require('../models/project');
const Offer = require('../models/offer');
const Milestone = require('../models/milestone');

function isTeamComplete(project) {
  if (!project?.teamRequirements?.length) {
    return true;
  }

  return project.teamRequirements.every(
    (requirement) => Number(requirement?.assigned || 0) >= Number(requirement?.required || 0)
  );
}

async function startProject(projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  if (project.status !== 'recruiting') {
    const error = new Error('Only recruiting projects can be started');
    error.status = 400;
    throw error;
  }

  project.status = 'in_progress';
  await project.save();

  await Offer.updateMany(
    { projectId: project._id },
    {
      $set: {
        status: 'closed',
        availableSlots: 0,
      },
    }
  );

  return project;
}

async function syncProjectStatusFromMilestones(projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    return null;
  }

  if (project.status === 'closed') {
    return project;
  }

  const milestones = await Milestone.find({ projectId }).select('status');

  if (milestones.length && milestones.every((milestone) => milestone.status === 'done')) {
    if (project.status !== 'finished') {
      project.status = 'finished';
      await project.save();
    }
  }

  return project;
}

module.exports = {
  isTeamComplete,
  startProject,
  syncProjectStatusFromMilestones,
};
