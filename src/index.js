function AxiosRateLimit (axios) {
  this.queue = {}
  this.timeslotRequests = {}
  this.timeoutId = {}
  this.targetHeader = ''

  this.interceptors = {
    request: null,
    response: null
  }

  this.handleRequest = this.handleRequest.bind(this)
  this.handleResponse = this.handleResponse.bind(this)

  this.enable(axios)
}

AxiosRateLimit.prototype.getMaxRPS = function () {
  let perSeconds = (this.perMilliseconds / 1000)
  return this.maxRequests / perSeconds
}

AxiosRateLimit.prototype.setRateLimitOptions = function (options) {
  if (options.maxRPS) {
    this.maxRequests = options.maxRPS
    this.perMilliseconds = 1000
  } else {
    this.perMilliseconds = options.perMilliseconds
    this.maxRequests = options.maxRequests
  }
  if (options.targetHeader) {
    this.targetHeader = options.targetHeader
  }
}

AxiosRateLimit.prototype.enable = function (axios) {
  function handleError (error) {
    return Promise.reject(error)
  }

  this.interceptors.request = axios.interceptors.request.use(
    this.handleRequest,
    handleError
  )
  this.interceptors.response = axios.interceptors.response.use(
    this.handleResponse,
    handleError
  )
}

AxiosRateLimit.prototype.handleRequest = function (request) {
  let clientId = 'undefined'
  if (request.headers && request.headers[this.targetHeader]) {
    clientId = request.headers[this.targetHeader]
  }

  return new Promise((resolve) => {
    this.push(clientId, {
      resolve: function () {
        resolve(request)
      }
    })
  })
}

AxiosRateLimit.prototype.handleResponse = function (response) {
  let clientId = 'undefined'
  if (response.config && (response.config.headers !== undefined)) {
    clientId = response.config.headers[this.targetHeader]
  }
  this.shift(clientId)
  return response
}

AxiosRateLimit.prototype.push = function (clientId, requestHandler) {
  if (Array.isArray(this.queue[clientId])) {
    this.queue[clientId].push(requestHandler)
  } else {
    this.queue[clientId] = [requestHandler]
  }
  this.shiftInitial(clientId)
}

AxiosRateLimit.prototype.shiftInitial = function (clientId) {
  setTimeout(() => {
    return this.shift(clientId)
  }, 0)
}

AxiosRateLimit.prototype.shift = function (clientId) {
  if (!this.queue[clientId].length) return
  if (this.timeslotRequests[clientId] === undefined) {
    this.timeslotRequests[clientId] = 0
  }
  if (this.timeslotRequests[clientId] === this.maxRequests) {
    if (this.timeoutId[clientId] &&
      typeof this.timeoutId[clientId].ref === 'function'
    ) {
      this.timeoutId[clientId].ref()
    }
    return
  }
  let queued = this.queue[clientId].shift()
  queued.resolve()

  if (this.timeslotRequests[clientId] === 0) {
    this.timeoutId[clientId] = setTimeout(() => {
      this.timeslotRequests[clientId] = 0
      this.shift(clientId)
    }, this.perMilliseconds)

    if (typeof this.timeoutId[clientId].unref === 'function') {
      if (this.queue[clientId].length === 0) this.timeoutId[clientId].unref()
    }
  }

  this.timeslotRequests[clientId] += 1
}

/**
 * Apply rate limit to axios instance.
 *
 * @example
 *   import axios from 'axios';
 *   import rateLimit from 'axios-rate-limit';
 *
 *   // sets max 2 requests per 1 second, other will be delayed
 *   // note maxRPS is a shorthand for perMilliseconds: 1000, and it takes precedence
 *   // if specified both with maxRequests and perMilliseconds
 *   const http = rateLimit(axios.create(), { maxRequests: 2, perMilliseconds: 1000, maxRPS: 2 })
 *    http.getMaxRPS() // 2
 *   http.get('https://example.com/api/v1/users.json?page=1') // will perform immediately
 *   http.get('https://example.com/api/v1/users.json?page=2') // will perform immediately
 *   http.get('https://example.com/api/v1/users.json?page=3') // will perform after 1 second from the first one
 *   http.getMaxRPS() // 3
 *   http.setRateLimitOptions({ maxRequests: 6, perMilliseconds: 150 }) // same options as constructor
 *
 * @param {Object} axios axios instance
 * @param {Object} options options for rate limit, available for live update
 * @param {Number=} options.maxRPS maxRPS is a shorthand for perMilliseconds: 1000.
 * @param {Number=} options.maxRequests max requests to perform concurrently in given amount of time.
 * @param {Number=} options.perMilliseconds amount of time to limit concurrent requests.
 * @param {String=} options.targetHeader Header name for queueing
 * @returns {Object} axios instance with interceptors added
 */
function axiosRateLimit (axios, options) {
  let rateLimitInstance = new AxiosRateLimit(axios)
  rateLimitInstance.setRateLimitOptions(options)

  axios.getMaxRPS = AxiosRateLimit.prototype.getMaxRPS.bind(rateLimitInstance)
  axios.setRateLimitOptions = AxiosRateLimit.prototype.setRateLimitOptions
    .bind(rateLimitInstance)

  return axios
}

module.exports = axiosRateLimit
