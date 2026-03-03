import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

let app: ReturnType<typeof createApp>
let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttlet-test-'))
  const dbPath = path.join(tmpDir, 'test.db')
  app = createApp({ dbPath, useMemorySession: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('Auth', () => {
  it('GET /api/auth/me returns null when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('POST /api/auth/register creates a user and logs in', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', displayName: 'Test User' })
    expect(res.status).toBe(201)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.displayName).toBe('Test User')
    expect(res.body.id).toBeDefined()
    expect(res.body).not.toHaveProperty('passwordHash')
  })

  it('POST /api/auth/register rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123', displayName: 'User 1' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password456', displayName: 'User 2' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_EXISTS')
  })

  it('POST /api/auth/register rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short', displayName: 'Test' })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const agent = request.agent(app)

    await agent
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'password123', displayName: 'Login User' })

    // Logout first
    await agent.post('/api/auth/logout')

    // Login
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('login@example.com')
  })

  it('POST /api/auth/login rejects invalid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'fail@example.com', password: 'password123', displayName: 'Fail User' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fail@example.com', password: 'wrongpassword' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('POST /api/auth/logout requires authentication', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(401)
  })

  it('session persists across requests', async () => {
    const agent = request.agent(app)

    await agent
      .post('/api/auth/register')
      .send({ email: 'session@example.com', password: 'password123', displayName: 'Session User' })

    const meRes = await agent.get('/api/auth/me')
    expect(meRes.status).toBe(200)
    expect(meRes.body.email).toBe('session@example.com')
  })
})
