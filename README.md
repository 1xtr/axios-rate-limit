# Fork of axios-rate-limit

[![npm version](https://img.shields.io/npm/v/@1xtr/axios-rate-limit.svg?style=flat-square)](https://www.npmjs.com/package/axios-rate-limit)

A rate limit for axios: set how many requests per interval should perform immediately, other will be delayed automatically.

## Installing

```bash
yarn add @1xtr/axios-rate-limit
```

## Usage

```javascript
import axios from 'axios';
import rateLimit from 'axios-rate-limit';

// sets max 2 requests per 1 second, other will be delayed
// note maxRPS is a shorthand for perMilliseconds: 1000, and it takes precedence
// if specified both with maxRequests and perMilliseconds
const http = rateLimit(axios.create(), { maxRequests: 2, perMilliseconds: 1000, maxRPS: 2 })
http.getMaxRPS() // 2
http.get('https://example.com/api/v1/users.json?page=1') // will perform immediately
http.get('https://example.com/api/v1/users.json?page=2') // will perform immediately
http.get('https://example.com/api/v1/users.json?page=3') // will perform after 1 second from the first one

// options hot-reloading also available
http.setMaxRPS(3)
http.getMaxRPS() // 3
http.setRateLimitOptions({ maxRequests: 6, perMilliseconds: 150 }) // same options as constructor
```
