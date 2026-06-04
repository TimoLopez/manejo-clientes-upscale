import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ClientStatus, TaskPriority, TaskStatus } from "@/types/database"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getClientStatusColor(status: ClientStatus): string {
  const colors: Record<ClientStatus, string> = {
    lead: 'bg-blue-100 text-blue-800 border-blue-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    finished: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[status]
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-orange-100 text-orange-800 border-orange-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return colors[priority]
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    done: 'bg-green-100 text-green-700 border-green-200',
  }
  return colors[status]
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
