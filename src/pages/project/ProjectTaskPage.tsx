import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  deleteTask,
  fetchProjectTasks,
  fetchTaskDetail,
  fetchTasksByMember,
  updateTaskStatus,
} from '../../api/task'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { AlertModal } from '../../components/Modal'
import { KanbanColumn } from '../../components/task/KanbanColumn'
import { TaskCardDetailModal } from '../../components/task/TaskCardDetailModal'
import { TaskCardFormModal } from '../../components/task/TaskCardFormModal'
import { ProgressBar } from '../../components/ProgressBar'
import { cn } from '../../lib/utils'
import { useProjectStore } from '../../store/projectStore'
import type {
  ServerTaskStatus,
  TaskDetailViewModel,
  TaskListItemViewModel,
} from '../../types/task'

type TaskFilter = 'all' | 'mine' | 'overdue'

const TASK_STATUSES: ServerTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '내 업무' },
  { value: 'overdue', label: '마감 초과' },
]

function parseProjectId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null
  const projectId = Number(value)
  return Number.isSafeInteger(projectId) ? projectId : null
}


function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
}


export default function ProjectTaskPage() {
  const { id: projectIdParam = '' } = useParams<{ id: string }>()
  const projectId = useMemo(() => parseProjectId(projectIdParam), [projectIdParam])
  const requestIdRef = useRef(0)
  const memberRequestIdRef = useRef(0)
  const overdueRequestIdRef = useRef(0)
  const activeFilterRef = useRef<TaskFilter>('all')
  const detailRequestIdRef = useRef(0)
  const statusUpdatingRef = useRef(false)
  const deletingRef = useRef(false)
  const [allTasks, setAllTasks] = useState<TaskListItemViewModel[]>([])
  const [myTasks, setMyTasks] = useState<TaskListItemViewModel[]>([])
  const [overdueTasks, setOverdueTasks] = useState<TaskListItemViewModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [notice, setNotice] = useState<'detailAction' | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [detail, setDetail] = useState<TaskDetailViewModel | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDetailViewModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskDetailViewModel | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectIdParam)
  )
  const isProjectListLoading = useProjectStore((state) => state.isLoading)
  const hasProjectListFetched = useProjectStore((state) => state.hasFetched)
  const projectListError = useProjectStore((state) => state.error)
  const currentProjectMemberId =
    project?.myProjectMemberId !== undefined &&
    Number.isSafeInteger(project.myProjectMemberId) &&
    project.myProjectMemberId > 0
      ? project.myProjectMemberId
      : null

  const loadAllTasks = useCallback(async (surfaceFilter: TaskFilter | null = null) => {
    const requestId = ++requestIdRef.current

    if (projectId === null) {
      setAllTasks([])
      if (surfaceFilter && activeFilterRef.current === surfaceFilter) {
        setError('올바른 프로젝트 ID가 아니어서 업무 목록을 불러올 수 없습니다.')
        setIsLoading(false)
      }
      return
    }

    if (surfaceFilter && activeFilterRef.current === surfaceFilter) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const nextTasks = await fetchProjectTasks(projectId)
      if (requestId === requestIdRef.current) setAllTasks(nextTasks)
    } catch (loadError: unknown) {
      if (
        requestId === requestIdRef.current &&
        surfaceFilter &&
        activeFilterRef.current === surfaceFilter
      ) {
        setError(getErrorMessage(loadError))
      }
    } finally {
      if (
        requestId === requestIdRef.current &&
        surfaceFilter &&
        activeFilterRef.current === surfaceFilter
      ) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  const loadMyTasks = useCallback(async (
    projectMemberId: number,
    surface = true
  ) => {
    const requestId = ++memberRequestIdRef.current
    if (projectId === null) return

    if (surface && activeFilterRef.current === 'mine') {
      setIsLoading(true)
      setError(null)
    }

    try {
      const nextTasks = await fetchTasksByMember(projectId, projectMemberId)
      if (requestId === memberRequestIdRef.current) setMyTasks(nextTasks)
    } catch (loadError: unknown) {
      if (
        requestId === memberRequestIdRef.current &&
        surface &&
        activeFilterRef.current === 'mine'
      ) {
        setError(getErrorMessage(loadError))
      }
    } finally {
      if (
        requestId === memberRequestIdRef.current &&
        surface &&
        activeFilterRef.current === 'mine'
      ) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  const loadOverdueTasks = useCallback(async (surface = true) => {
    const requestId = ++overdueRequestIdRef.current
    if (projectId === null) return

    if (surface && activeFilterRef.current === 'overdue') {
      setIsLoading(true)
      setError(null)
    }

    try {
      const nextTasks = (await fetchProjectTasks(projectId)).filter(
        (task) => task.isOverdue
      )
      if (requestId === overdueRequestIdRef.current) {
        setOverdueTasks(nextTasks)
      }
    } catch (loadError: unknown) {
      if (
        requestId === overdueRequestIdRef.current &&
        surface &&
        activeFilterRef.current === 'overdue'
      ) {
        setError(getErrorMessage(loadError))
      }
    } finally {
      if (
        requestId === overdueRequestIdRef.current &&
        surface &&
        activeFilterRef.current === 'overdue'
      ) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  const loadTasks = useCallback(async () => {
    const activeFilter = activeFilterRef.current
    if (activeFilter === 'mine') {
      if (currentProjectMemberId === null) {
        await loadAllTasks()
        if (isProjectListLoading || !hasProjectListFetched) {
          setIsLoading(true)
          return
        }
        setError(
          projectListError ??
            '현재 사용자의 프로젝트 멤버 ID를 확인할 수 없어 내 업무를 불러올 수 없습니다.'
        )
        setIsLoading(false)
        return
      }
      await Promise.all([
        loadAllTasks(),
        loadMyTasks(currentProjectMemberId),
      ])
      return
    }
    if (activeFilter === 'overdue') {
      await Promise.all([loadAllTasks(), loadOverdueTasks()])
      return
    }
    await loadAllTasks(activeFilter)
  }, [
    currentProjectMemberId,
    hasProjectListFetched,
    isProjectListLoading,
    loadAllTasks,
    loadMyTasks,
    loadOverdueTasks,
    projectListError,
  ])

  useEffect(() => {
    activeFilterRef.current = 'all'
    setFilter('all')
    setMyTasks([])
    setOverdueTasks([])
    void loadAllTasks('all')
    return () => {
      requestIdRef.current += 1
      memberRequestIdRef.current += 1
      overdueRequestIdRef.current += 1
    }
  }, [loadAllTasks])

  useEffect(() => {
    if (activeFilterRef.current !== 'mine') return
    if (currentProjectMemberId !== null) {
      void Promise.all([
        loadAllTasks(),
        loadMyTasks(currentProjectMemberId),
      ])
      return
    }
    if (!isProjectListLoading && hasProjectListFetched) {
      setError(
        projectListError ??
          '현재 사용자의 프로젝트 멤버 ID를 확인할 수 없어 내 업무를 불러올 수 없습니다.'
      )
      setIsLoading(false)
    }
  }, [
    currentProjectMemberId,
    hasProjectListFetched,
    isProjectListLoading,
    loadAllTasks,
    loadMyTasks,
    projectListError,
  ])

  const selectFilter = useCallback((nextFilter: TaskFilter) => {
    if (nextFilter === activeFilterRef.current) return

    activeFilterRef.current = nextFilter
    setFilter(nextFilter)
    setError(null)
    setIsLoading(true)

    if (nextFilter === 'mine') {
      requestIdRef.current += 1
      overdueRequestIdRef.current += 1
      if (currentProjectMemberId === null) {
        memberRequestIdRef.current += 1
        if (isProjectListLoading || !hasProjectListFetched) {
          setIsLoading(true)
          return
        }
        setError(
          projectListError ??
            '현재 사용자의 프로젝트 멤버 ID를 확인할 수 없어 내 업무를 불러올 수 없습니다.'
        )
        setIsLoading(false)
        return
      }
      void Promise.all([
        loadAllTasks(),
        loadMyTasks(currentProjectMemberId),
      ])
      return
    }

    memberRequestIdRef.current += 1
    if (nextFilter === 'overdue') {
      requestIdRef.current += 1
      void Promise.all([loadAllTasks(), loadOverdueTasks()])
      return
    }
    overdueRequestIdRef.current += 1
    void loadAllTasks(nextFilter)
  }, [
    currentProjectMemberId,
    hasProjectListFetched,
    isProjectListLoading,
    loadAllTasks,
    loadMyTasks,
    loadOverdueTasks,
    projectListError,
  ])

  const loadTaskDetail = useCallback(async (taskId: number) => {
    const requestId = ++detailRequestIdRef.current

    if (projectId === null) {
      setDetail(null)
      setDetailError('올바른 프로젝트 ID가 아니어서 업무 상세를 불러올 수 없습니다.')
      setIsDetailLoading(false)
      return
    }

    setDetail(null)
    setDetailError(null)
    setIsDetailLoading(true)

    try {
      const nextDetail = await fetchTaskDetail(projectId, taskId)
      if (requestId === detailRequestIdRef.current) setDetail(nextDetail)
    } catch (loadError: unknown) {
      if (requestId === detailRequestIdRef.current) {
        setDetail(null)
        setDetailError(getErrorMessage(loadError))
      }
    } finally {
      if (requestId === detailRequestIdRef.current) setIsDetailLoading(false)
    }
  }, [projectId])

  const openTaskDetail = useCallback((taskId: number) => {
    setSelectedTaskId(taskId)
    setStatusError(null)
    void loadTaskDetail(taskId)
  }, [loadTaskDetail])

  const closeTaskDetail = useCallback(() => {
    detailRequestIdRef.current += 1
    setSelectedTaskId(null)
    setDetail(null)
    setDetailError(null)
    setIsDetailLoading(false)
    setStatusError(null)
  }, [])

  const changeTaskStatus = useCallback(async (
    nextStatus: ServerTaskStatus
  ) => {
    if (
      projectId === null ||
      selectedTaskId === null ||
      !detail ||
      statusUpdatingRef.current
    ) {
      return
    }

    statusUpdatingRef.current = true
    setIsStatusUpdating(true)
    setStatusError(null)

    try {
      await updateTaskStatus(projectId, selectedTaskId, {
        cardStatus: nextStatus,
      })

      if (nextStatus === 'IN_PROGRESS') {
        await Promise.all([
          loadTasks(),
          loadTaskDetail(selectedTaskId),
        ])
      } else {
        closeTaskDetail()
        await loadTasks()
      }
    } catch (updateError: unknown) {
      setStatusError(getErrorMessage(updateError))
    } finally {
      statusUpdatingRef.current = false
      setIsStatusUpdating(false)
    }
  }, [
    closeTaskDetail,
    detail,
    loadTaskDetail,
    loadTasks,
    projectId,
    selectedTaskId,
  ])

  const openTaskEdit = useCallback(() => {
    if (!detail || isStatusUpdating || isDeleting) return
    setEditingTask(detail)
    closeTaskDetail()
  }, [closeTaskDetail, detail, isDeleting, isStatusUpdating])

  const openTaskDelete = useCallback(() => {
    if (!detail || isStatusUpdating || isDeleting) return
    setDeleteError(null)
    setDeleteTarget(detail)
  }, [detail, isDeleting, isStatusUpdating])

  const confirmTaskDelete = useCallback(async () => {
    if (
      projectId === null ||
      !deleteTarget ||
      deletingRef.current
    ) {
      return
    }

    deletingRef.current = true
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await deleteTask(projectId, deleteTarget.id)
      if (!response.isDeleted) {
        throw new Error('업무를 삭제하지 못했습니다.')
      }
      setDeleteTarget(null)
      closeTaskDetail()
      await loadTasks()
    } catch (deleteTaskError: unknown) {
      setDeleteError(getErrorMessage(deleteTaskError))
    } finally {
      deletingRef.current = false
      setIsDeleting(false)
    }
  }, [closeTaskDetail, deleteTarget, loadTasks, projectId])

  const visibleTasks =
    filter === 'mine'
      ? myTasks
      : filter === 'overdue'
        ? overdueTasks
        : allTasks
  const completedCount = allTasks.filter((task) => task.status === 'DONE').length
  const totalCount = allTasks.length

  return (
    <div className="min-w-0 px-4 py-4">
      <section className="rounded-lg bg-white p-4 shadow-md" aria-label="전체 업무 완료율">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-body-sm font-semibold text-gray-900">전체 완료율</h1>
          <span className="text-body-sm font-semibold text-primary">
            {completedCount} / {totalCount} 완료
          </span>
        </div>
        {totalCount > 0 ? (
          <ProgressBar total={totalCount} current={completedCount} />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-gray-100" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} />
        )}
      </section>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2" role="group" aria-label="업무 필터">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => selectFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-caption transition-colors',
                filter === item.value
                  ? 'border-primary-100 bg-primary-100 text-primary'
                  : 'border-gray-200 bg-white font-normal text-gray-400'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          fullWidth={false}
          icon={<Plus className="h-4 w-4" aria-hidden />}
          className="shrink-0 text-white"
          onClick={() => setIsCreateOpen(true)}
        >
          업무 등록
        </Button>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-body-sm text-gray-400">업무를 불러오는 중이에요.</p>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-body-sm text-error">{error}</p>
          <Button
            type="button"
            size="sm"
            fullWidth={false}
            className="mt-4 text-white"
            onClick={() => void loadTasks()}
          >
            다시 시도
          </Button>
        </div>
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" aria-hidden />}
          title={
            filter === 'mine'
              ? '내게 배정된 업무가 없어요'
              : filter === 'overdue'
                ? '마감 초과 업무가 없어요'
                : '아직 등록된 업무가 없어요'
          }
          description={
            filter === 'mine'
              ? '담당자로 지정된 업무가 생기면 여기에서 확인할 수 있어요'
              : filter === 'overdue'
                ? '마감일이 지난 업무가 없어요'
                : '업무가 등록되면 상태별로 확인할 수 있어요'
          }
        />
      ) : (
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-4">
          <div className="flex min-w-max items-start gap-3">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={visibleTasks.filter((task) => task.status === status)}
                onTaskClick={(task) => openTaskDetail(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      <TaskCardDetailModal
        open={selectedTaskId !== null}
        task={detail}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={closeTaskDetail}
        onRetry={() => {
          if (selectedTaskId !== null) void loadTaskDetail(selectedTaskId)
        }}
        onEdit={openTaskEdit}
        onDelete={openTaskDelete}
        onUnavailableAction={() => setNotice('detailAction')}
        isStatusUpdating={isStatusUpdating}
        isDeleting={isDeleting}
        onStatusChange={(status) => void changeTaskStatus(status)}
      />

      {projectId !== null && (
        <TaskCardFormModal
          open={isCreateOpen}
          projectId={projectId}
          projectType={project?.type}
          onClose={() => setIsCreateOpen(false)}
          onSaved={() => void loadTasks()}
        />
      )}

      {projectId !== null && editingTask && (
        <TaskCardFormModal
          open
          projectId={projectId}
          projectType={project?.type}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => void loadTasks()}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="업무를 삭제하시겠습니까?"
        description={
          deleteError ??
          '삭제된 업무는 복구할 수 없습니다.'
        }
        confirmText={isDeleting ? '삭제 중' : '삭제하기'}
        cancelText="취소"
        destructive
        confirmDisabled={isDeleting}
        confirmLoading={isDeleting}
        onConfirm={() => void confirmTaskDelete()}
        onCancel={() => {
          if (isDeleting) return
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />

      <AlertModal
        open={notice !== null}
        title="업무 변경 기능 준비 중이에요"
        description="서버 API 연동 후 사용할 수 있어요."
        onConfirm={() => setNotice(null)}
      />
      <AlertModal
        open={statusError !== null}
        title="업무 상태를 변경하지 못했어요"
        description={statusError ?? undefined}
        onConfirm={() => setStatusError(null)}
      />
    </div>
  )
}
