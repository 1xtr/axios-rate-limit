const axios = require('axios')
const sinon = require('sinon')

const axiosRateLimit = require('../src/index')

function delay (milliseconds) {
  return new Promise((resolve) => {
    return setTimeout(resolve, milliseconds)
  })
}

/**
 * @typedef {import('axios').AxiosResponse} AxiosResponse
 */

it('not delay requests less than maxRequests', async () => {
  let maxRequests = 5
  let perMilliseconds = 1000
  let totalRequests = 4
  /**
   * @param config
   * @returns {Promise<AxiosResponse>}
   */
  let adapter = (config) => Promise.resolve(config)

  let http = axiosRateLimit(
    axios.create({ adapter }),
    { maxRPS: maxRequests, targetHeader: 'target' },
  )
  
  let onSuccess = sinon.spy()
  
  let requests = []
  let start = Date.now()
  for (let i = 0; i < totalRequests; i++) {
    requests.push(http.get('/users').then(onSuccess))
  }
  
  await Promise.all(requests)
  let end = Date.now()
  expect(onSuccess.callCount).toEqual(totalRequests)
  expect(end - start).toBeLessThan(perMilliseconds)
})

it('throws an error', async () => {
  let maxRequests = 2
  let perMilliseconds = 1000
  
  function adapter () {
    return Promise.reject(new Error('fail'))
  }
  
  let http = axiosRateLimit(
    axios.create({ adapter }),
    { maxRequests, perMilliseconds },
  )
  
  expect.assertions(1)
  try {
    await http.get('/users')
  } catch (error) {
    expect(error.message).toEqual('fail')
  }
})

it('support dynamic options', async () => {
  /**
   * @param config AxiosRequestConfig
   * @returns {Promise<AxiosResponse>}
   */
  let adapter = (config) => Promise.resolve(config)
  
  // check constructor options
  let http = axiosRateLimit(
    axios.create({ adapter }),
    { maxRequests: 2, perMilliseconds: 100, targetHeader: 'target' },
  )
  expect(http.getMaxRPS()).toEqual(20)
  
  let onSuccess = sinon.spy()
  
  let requests = []
  let start = Date.now()
  for (let i = 0; i < 3; i++) {
    requests.push(http.get('/users').then(onSuccess))
  }
  await delay(90)
  expect(onSuccess.callCount).toEqual(2)
  
  await Promise.all(requests)
  let end = Date.now()
  expect(onSuccess.callCount).toEqual(3)
  expect(end - start).toBeGreaterThan(100)
  await delay(110)
  
  // check setRateLimitOptions
  http.setRateLimitOptions({ maxRequests: 3, perMilliseconds: 200 })
  expect(http.getMaxRPS()).toEqual(15)
  
  onSuccess = sinon.spy()
  requests = []
  start = Date.now()
  for (let x = 0; x < 4; x++) {
    requests.push(http.get('/users').then(onSuccess))
  }
  await delay(190)
  expect(onSuccess.callCount).toEqual(3)

  await Promise.all(requests)
  end = Date.now()
  expect(onSuccess.callCount).toEqual(4)
  expect(end - start).toBeGreaterThan(200)
  await delay(210)

})
