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
  // Brief / ficha fields
  last_action?: string | null
  pending_notes?: string | null
  next_steps?: string | null
  future_steps?: string | null
  ideas?: string | null
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
          last_action?: string | null
          pending_notes?: string | null
          next_steps?: string | null
          future_steps?: string | null
          ideas?: string | null
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
          last_action?: string | null
          pending_notes?: string | null
          next_steps?: string | null
          future_steps?: string | null
          ideas?: string | null
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
