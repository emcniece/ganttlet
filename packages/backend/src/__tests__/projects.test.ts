import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

let app: ReturnType<typeof createApp>
let tmpDir: string

function agent() {
  return request.agent(app)
}

async function registerAndLogin(
  a: ReturnType<typeof agent>,
  email = 'user@example.com',
  displayName = 'Test User',
) {
  const res = await a
    .post('/api/auth/register')
    .send({ email, password: 'password123', displayName })
  return res.body
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttlet-test-'))
  const dbPath = path.join(tmpDir, 'test.db')
  app = createApp({ dbPath, useMemorySession: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('Projects', () => {
  it('GET /api/projects requires auth', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(401)
  })

  it('POST /api/projects creates a project', async () => {
    const a = agent()
    await registerAndLogin(a)

    const res = await a.post('/api/projects').send({ name: 'My Project' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('My Project')
    expect(res.body.visibility).toBe('private')
  })

  it('GET /api/projects lists owned projects', async () => {
    const a = agent()
    await registerAndLogin(a)

    await a.post('/api/projects').send({ name: 'Project 1' })
    await a.post('/api/projects').send({ name: 'Project 2' })

    const res = await a.get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].role).toBe('owner')
  })

  it('GET /api/projects/:id returns project with tasks', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({
      name: 'With Tasks',
      tasks: [
        {
          id: 'task-1',
          name: 'Task 1',
          resource: 'Dev',
          start: '2024-01-01',
          end: '2024-01-07',
          duration: null,
          percentComplete: 50,
          dependencies: [],
        },
      ],
    })

    const res = await a.get(`/api/projects/${createRes.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('With Tasks')
    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.tasks[0].name).toBe('Task 1')
  })

  it('PUT /api/projects/:id updates project', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({ name: 'Old Name' })
    const res = await a
      .put(`/api/projects/${createRes.body.id}`)
      .send({ name: 'New Name', visibility: 'public' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
    expect(res.body.visibility).toBe('public')
  })

  it('DELETE /api/projects/:id deletes project', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({ name: 'Delete Me' })
    const delRes = await a.delete(`/api/projects/${createRes.body.id}`)
    expect(delRes.status).toBe(200)

    const getRes = await a.get(`/api/projects/${createRes.body.id}`)
    expect(getRes.status).toBe(404)
  })

  it('PUT /api/projects/:id/tasks bulk replaces tasks', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({ name: 'Task Project' })
    const projectId = createRes.body.id

    const tasks = [
      {
        id: 't1',
        name: 'Task A',
        resource: '',
        start: '2024-01-01',
        end: '2024-01-05',
        duration: null,
        percentComplete: 0,
        dependencies: [],
      },
      {
        id: 't2',
        name: 'Task B',
        resource: '',
        start: '2024-01-06',
        end: '2024-01-10',
        duration: null,
        percentComplete: 0,
        dependencies: ['t1'],
        color: '#ff0000',
      },
    ]

    const res = await a.put(`/api/projects/${projectId}/tasks`).send({ tasks })
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Task A')
    expect(res.body[1].dependencies).toEqual(['t1'])

    // Replace with different tasks
    const res2 = await a.put(`/api/projects/${projectId}/tasks`).send({
      tasks: [{ id: 't3', name: 'Task C', resource: '', start: '2024-02-01', end: '2024-02-05', duration: null, percentComplete: 100, dependencies: [] }],
    })
    expect(res2.body).toHaveLength(1)
    expect(res2.body[0].name).toBe('Task C')
  })

  it('public project is accessible without auth', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({ name: 'Public', visibility: 'public' })
    const projectId = createRes.body.id

    // Access without auth
    const res = await request(app).get(`/api/projects/${projectId}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Public')
  })

  it('private project is not accessible without auth', async () => {
    const a = agent()
    await registerAndLogin(a)

    const createRes = await a.post('/api/projects').send({ name: 'Private' })
    const projectId = createRes.body.id

    const res = await request(app).get(`/api/projects/${projectId}`)
    expect(res.status).toBe(404)
  })
})

describe('Sharing', () => {
  it('owner can share a project and list shares', async () => {
    const owner = agent()
    const viewer = agent()

    await registerAndLogin(owner, 'owner@example.com', 'Owner')
    await registerAndLogin(viewer, 'viewer@example.com', 'Viewer')

    const createRes = await owner.post('/api/projects').send({ name: 'Shared Project' })
    const projectId = createRes.body.id

    // Share with viewer
    const shareRes = await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'viewer@example.com', role: 'view' })
    expect(shareRes.status).toBe(201)
    expect(shareRes.body.role).toBe('view')

    // List shares
    const listRes = await owner.get(`/api/projects/${projectId}/shares`)
    expect(listRes.status).toBe(200)
    expect(listRes.body).toHaveLength(1)
  })

  it('shared user can see the project in their list', async () => {
    const owner = agent()
    const viewer = agent()

    await registerAndLogin(owner, 'owner2@example.com', 'Owner 2')
    await registerAndLogin(viewer, 'viewer2@example.com', 'Viewer 2')

    const createRes = await owner.post('/api/projects').send({ name: 'Shared Project 2' })
    const projectId = createRes.body.id

    await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'viewer2@example.com', role: 'edit' })

    // Viewer sees it in their project list
    const listRes = await viewer.get('/api/projects')
    expect(listRes.body).toHaveLength(1)
    expect(listRes.body[0].name).toBe('Shared Project 2')
    expect(listRes.body[0].role).toBe('edit')
  })

  it('viewer cannot modify tasks', async () => {
    const owner = agent()
    const viewer = agent()

    await registerAndLogin(owner, 'own@example.com', 'Own')
    await registerAndLogin(viewer, 'view@example.com', 'View')

    const createRes = await owner.post('/api/projects').send({ name: 'Read Only' })
    const projectId = createRes.body.id

    await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'view@example.com', role: 'view' })

    const res = await viewer.put(`/api/projects/${projectId}/tasks`).send({ tasks: [] })
    expect(res.status).toBe(403)
  })

  it('editor can modify tasks', async () => {
    const owner = agent()
    const editor = agent()

    await registerAndLogin(owner, 'own3@example.com', 'Own3')
    await registerAndLogin(editor, 'edit@example.com', 'Edit')

    const createRes = await owner.post('/api/projects').send({ name: 'Editable' })
    const projectId = createRes.body.id

    await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'edit@example.com', role: 'edit' })

    const res = await editor.put(`/api/projects/${projectId}/tasks`).send({
      tasks: [{ id: 'new-task', name: 'Added by editor', resource: '', start: '2024-01-01', end: '2024-01-05', duration: null, percentComplete: 0, dependencies: [] }],
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('owner can update share role', async () => {
    const owner = agent()
    await registerAndLogin(owner, 'upd-owner@example.com', 'Upd Owner')

    const a2 = agent()
    await registerAndLogin(a2, 'upd-user@example.com', 'Upd User')

    const createRes = await owner.post('/api/projects').send({ name: 'Update Share' })
    const projectId = createRes.body.id

    const shareRes = await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'upd-user@example.com', role: 'view' })

    const updRes = await owner
      .put(`/api/projects/${projectId}/shares/${shareRes.body.id}`)
      .send({ role: 'edit' })
    expect(updRes.status).toBe(200)
    expect(updRes.body.role).toBe('edit')
  })

  it('owner can delete a share', async () => {
    const owner = agent()
    await registerAndLogin(owner, 'del-owner@example.com', 'Del Owner')

    const a2 = agent()
    await registerAndLogin(a2, 'del-user@example.com', 'Del User')

    const createRes = await owner.post('/api/projects').send({ name: 'Delete Share' })
    const projectId = createRes.body.id

    const shareRes = await owner
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'del-user@example.com', role: 'view' })

    const delRes = await owner.delete(`/api/projects/${projectId}/shares/${shareRes.body.id}`)
    expect(delRes.status).toBe(200)

    const listRes = await owner.get(`/api/projects/${projectId}/shares`)
    expect(listRes.body).toHaveLength(0)
  })

  it('non-owner cannot manage shares', async () => {
    const owner = agent()
    const other = agent()

    await registerAndLogin(owner, 'no-owner@example.com', 'No Owner')
    await registerAndLogin(other, 'no-other@example.com', 'No Other')

    const createRes = await owner.post('/api/projects').send({ name: 'No Share' })
    const projectId = createRes.body.id

    const res = await other
      .post(`/api/projects/${projectId}/shares`)
      .send({ email: 'random@example.com', role: 'view' })
    expect(res.status).toBe(403)
  })
})
