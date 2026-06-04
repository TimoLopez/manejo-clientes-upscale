export type ClientStatus = 'lead' | 'active' | 'paused' | 'finished'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: ClientStatus
  notes: string
  created_at: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  description: string
  priority: TaskPriority
  due_date: string | null
  assignee: string
  status: TaskStatus
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client
        Insert: {
          id?: string
          name: string
          company?: string
          email?: string
          phone?: string
          status?: ClientStatus
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string
          email?: string
          phone?: string
          status?: ClientStatus
          notes?: string
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string
          priority?: TaskPriority
          due_date?: string | null
          assignee?: string
          status?: TaskStatus
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string
          priority?: TaskPriority
          due_date?: string | null
          assignee?: string
          status?: TaskStatus
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
