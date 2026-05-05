const truthy = (value) => ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase())

const verbose =
  process.env.NODE_ENV !== 'production' ||
  truthy(process.env.PAYMENTS_VERBOSE) ||
  truthy(process.env.SERVER_VERBOSE_LOGS)

function devLog(...args) {
  if (verbose) console.log(...args)
}

module.exports = { devLog }
